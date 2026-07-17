import type { IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import type { PublicAddress, PublicTarget } from './safe-fetch-network'

const MAX_HTML_BYTES = 2 * 1024 * 1024

export interface AuditHttpResponse {
  discard: () => Promise<void>
  headers: Headers
  readBody: () => Promise<string>
  status: number
}

/** Decode a bounded list of response chunks without relying on Node-only Buffer APIs. */
function decodeChunks(chunks: Uint8Array[], length: number): string {
  const merged = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

/** Read a fetch Response body while enforcing the shared two-megabyte ceiling. */
async function readWebResponse(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_HTML_BYTES) throw new Error('HTML response exceeds 2 MB')
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > MAX_HTML_BYTES) {
      await reader.cancel()
      throw new Error('HTML response exceeds 2 MB')
    }
    chunks.push(value)
  }
  return decodeChunks(chunks, length)
}

/** Read a pinned Node HTTPS response while enforcing the shared size ceiling. */
async function readNodeResponse(response: IncomingMessage, headers: Headers): Promise<string> {
  const declaredLength = Number(headers.get('content-length') ?? 0)
  if (declaredLength > MAX_HTML_BYTES) {
    response.destroy()
    throw new Error('HTML response exceeds 2 MB')
  }
  const chunks: Uint8Array[] = []
  let length = 0
  for await (const rawChunk of response) {
    const chunk = typeof rawChunk === 'string' ? Buffer.from(rawChunk) : rawChunk
    length += chunk.byteLength
    if (length > MAX_HTML_BYTES) {
      response.destroy()
      throw new Error('HTML response exceeds 2 MB')
    }
    chunks.push(chunk)
  }
  return decodeChunks(chunks, length)
}

/** Convert Node response headers into the web Headers interface used by the audit engine. */
function responseHeaders(response: IncomingMessage): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) headers.set(name, value.join(', '))
    else if (value !== undefined) headers.set(name, value)
  }
  return headers
}

/** Request one DNS-pinned address while preserving TLS hostname validation. */
async function requestPinnedAddress(
  target: PublicTarget,
  address: PublicAddress,
  signal: AbortSignal,
  accept: string,
  customHeaders: Record<string, string>
): Promise<AuditHttpResponse> {
  return await new Promise((resolve, reject) => {
    const hostnameIsIp = isIP(target.url.hostname) !== 0
    const request = httpsRequest(
      {
        family: address.family,
        headers: {
          ...customHeaders,
          accept,
          host: target.url.host,
          'user-agent': 'CodeRocket/0.1 (+https://www.coderocket.app)'
        },
        hostname: address.address,
        method: 'GET',
        path: `${target.url.pathname}${target.url.search}`,
        port: target.url.port || 443,
        rejectUnauthorized: true,
        servername: hostnameIsIp ? undefined : target.url.hostname,
        signal
      },
      response => {
        const headers = responseHeaders(response)
        resolve({
          discard: async () => {
            response.destroy()
          },
          headers,
          readBody: () => readNodeResponse(response, headers),
          status: response.statusCode ?? 0
        })
      }
    )
    request.on('error', reject)
    request.end()
  })
}

/** Try each pinned address in family order until one HTTPS connection succeeds. */
async function requestPinned(
  target: PublicTarget,
  signal: AbortSignal,
  accept: string,
  customHeaders: Record<string, string>
): Promise<AuditHttpResponse> {
  let lastError: unknown
  const orderedAddresses = [...target.addresses].sort((left, right) => left.family - right.family)
  for (const address of orderedAddresses) {
    try {
      return await requestPinnedAddress(target, address, signal, accept, customHeaders)
    } catch (error) {
      lastError = error
      if (signal.aborted) throw new Error('Website request timed out')
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Website request failed')
}

/** Adapt an injected fetch implementation to the pinned request response contract used in tests. */
async function requestWithFetch(
  target: PublicTarget,
  signal: AbortSignal,
  request: typeof fetch,
  accept: string,
  customHeaders: Record<string, string>
): Promise<AuditHttpResponse> {
  const response = await request(target.url, {
    redirect: 'manual',
    headers: {
      ...customHeaders,
      accept,
      'user-agent': 'CodeRocket/0.1 (+https://www.coderocket.app)'
    },
    signal
  })
  return {
    discard: async () => {
      await response.body?.cancel()
    },
    headers: response.headers,
    readBody: () => readWebResponse(response),
    status: response.status
  }
}

/** Execute one safe response request through injected fetch or pinned Node HTTPS. */
export async function requestAuditResponse(
  target: PublicTarget,
  signal: AbortSignal,
  accept: string,
  customHeaders: Record<string, string>,
  fetchImplementation?: typeof fetch
): Promise<AuditHttpResponse> {
  return fetchImplementation
    ? requestWithFetch(target, signal, fetchImplementation, accept, customHeaders)
    : requestPinned(target, signal, accept, customHeaders)
}
