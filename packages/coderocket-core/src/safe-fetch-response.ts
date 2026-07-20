import type { IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import type { PublicAddress, PublicTarget } from './safe-fetch-network'

const MAX_HTML_BYTES = 2 * 1024 * 1024

export interface SafeHttpResponse {
  discard: () => Promise<void>
  headers: Headers
  readBody: () => Promise<string>
  readBytes: (maximumBytes: number) => Promise<Uint8Array>
  status: number
}

/** Read a fetch Response body while enforcing a caller-selected size ceiling. */
async function readWebResponseBytes(response: Response, maximumBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > maximumBytes) throw new Error('Resource response is too large')
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > maximumBytes) {
      await reader.cancel()
      throw new Error('Resource response is too large')
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

/** Read a fetch Response body while enforcing the shared two-megabyte ceiling. */
async function readWebResponse(response: Response): Promise<string> {
  const bytes = await readWebResponseBytes(response, MAX_HTML_BYTES)
  return new TextDecoder().decode(bytes)
}

/** Read a pinned Node HTTPS response while enforcing a caller-selected size ceiling. */
async function readNodeResponseBytes(
  response: IncomingMessage,
  headers: Headers,
  maximumBytes: number
): Promise<Uint8Array> {
  const declaredLength = Number(headers.get('content-length') ?? 0)
  if (declaredLength > maximumBytes) {
    response.destroy()
    throw new Error('Resource response is too large')
  }
  const chunks: Uint8Array[] = []
  let length = 0
  for await (const rawChunk of response) {
    const chunk = typeof rawChunk === 'string' ? Buffer.from(rawChunk) : rawChunk
    length += chunk.byteLength
    if (length > maximumBytes) {
      response.destroy()
      throw new Error('Resource response is too large')
    }
    chunks.push(chunk)
  }
  const merged = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}

/** Read a pinned Node HTTPS response while enforcing the shared HTML size ceiling. */
async function readNodeResponse(response: IncomingMessage, headers: Headers): Promise<string> {
  const bytes = await readNodeResponseBytes(response, headers, MAX_HTML_BYTES)
  return new TextDecoder().decode(bytes)
}

/** Convert Node response headers into the web Headers interface used by the capture engine. */
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
): Promise<SafeHttpResponse> {
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
          readBytes: maximumBytes => readNodeResponseBytes(response, headers, maximumBytes),
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
): Promise<SafeHttpResponse> {
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
): Promise<SafeHttpResponse> {
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
    readBytes: maximumBytes => readWebResponseBytes(response, maximumBytes),
    status: response.status
  }
}

/** Execute one safe response request through injected fetch or pinned Node HTTPS. */
export async function requestSafeResponse(
  target: PublicTarget,
  signal: AbortSignal,
  accept: string,
  customHeaders: Record<string, string>,
  fetchImplementation?: typeof fetch
): Promise<SafeHttpResponse> {
  return fetchImplementation
    ? requestWithFetch(target, signal, fetchImplementation, accept, customHeaders)
    : requestPinned(target, signal, accept, customHeaders)
}
