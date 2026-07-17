import { lookup } from 'node:dns/promises'
import type { IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'

const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 2 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 10_000

interface PublicAddress {
  address: string
  family: number
}

interface PublicTarget {
  addresses: PublicAddress[]
  url: URL
}

interface AuditHttpResponse {
  discard: () => Promise<void>
  headers: Headers
  readHtml: () => Promise<string>
  status: number
}

export interface SafeHtmlResponse {
  url: string
  html: string
  fetchedAt: string
  status: number
  durationMs: number
  headers: Record<string, string>
}

export interface SafeTextResponse {
  url: string
  text: string
  fetchedAt: string
  status: number
  durationMs: number
  headers: Record<string, string>
}

export interface SafeFetchOptions {
  timeoutMs?: number
  fetchImplementation?: typeof fetch
  headers?: Record<string, string>
}

const FORBIDDEN_REQUEST_HEADERS = new Set([
  'accept',
  'connection',
  'content-length',
  'host',
  'proxy-authorization',
  'te',
  'transfer-encoding',
  'upgrade',
  'user-agent'
])

function normalizeRequestHeaders(input: Record<string, string> = {}): Record<string, string> {
  const entries = Object.entries(input)
  if (entries.length > 20) throw new Error('Too many custom request headers')
  const headers: Record<string, string> = {}
  for (const [rawName, value] of entries) {
    const name = rawName.trim().toLowerCase()
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(name) || FORBIDDEN_REQUEST_HEADERS.has(name))
      throw new Error(`Request header ${rawName} is not allowed`)
    if (value.length > 4096 || /[\r\n]/.test(value))
      throw new Error(`Request header ${rawName} has an invalid value`)
    headers[name] = value
  }
  return headers
}

function ipv4Number(address: string): number | undefined {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255))
    return undefined
  return parts.reduce((value, part) => value * 256 + part, 0)
}

function isInIpv4Cidr(address: number, base: string, prefix: number): boolean {
  const baseNumber = ipv4Number(base)
  if (baseNumber === undefined) return false
  const blockSize = 2 ** (32 - prefix)
  return Math.floor(address / blockSize) === Math.floor(baseNumber / blockSize)
}

function isBlockedIpv4(address: string): boolean {
  const numeric = ipv4Number(address)
  if (numeric === undefined) return true
  return [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4]
  ].some(([base, prefix]) => isInIpv4Cidr(numeric, String(base), Number(prefix)))
}

function parseIpv6(address: string): bigint | undefined {
  let normalized = address.toLowerCase().split('%')[0] ?? address.toLowerCase()
  if (normalized.includes('.')) {
    const lastColon = normalized.lastIndexOf(':')
    const mapped = ipv4Number(normalized.slice(lastColon + 1))
    if (lastColon < 0 || mapped === undefined) return undefined
    normalized = `${normalized.slice(0, lastColon)}:${(mapped >>> 16).toString(16)}:${(
      mapped & 0xffff
    ).toString(16)}`
  }
  if (normalized.split('::').length > 2) return undefined
  const [left = '', right = ''] = normalized.split('::')
  const leftParts = left ? left.split(':') : []
  const rightParts = right ? right.split(':') : []
  const missing = 8 - leftParts.length - rightParts.length
  if (missing < 0 || (!normalized.includes('::') && missing !== 0)) return undefined
  const parts = [...leftParts, ...Array.from({ length: missing }, () => '0'), ...rightParts]
  if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/.test(part))) return undefined
  return parts.reduce((value, part) => (value << 16n) + BigInt(`0x${part}`), 0n)
}

function isInIpv6Cidr(address: bigint, base: string, prefix: number): boolean {
  const baseNumber = parseIpv6(base)
  if (baseNumber === undefined) return false
  const shift = BigInt(128 - prefix)
  return address >> shift === baseNumber >> shift
}

function isBlockedIpv6(address: string): boolean {
  const numeric = parseIpv6(address)
  if (numeric === undefined) return true
  if (isInIpv6Cidr(numeric, '::ffff:0:0', 96)) {
    const mapped = Number(numeric & 0xffffffffn)
    const dotted = [24, 16, 8, 0].map(shift => (mapped >>> shift) & 255).join('.')
    return isBlockedIpv4(dotted)
  }
  return [
    ['::', 96],
    ['64:ff9b:1::', 48],
    ['100::', 64],
    ['2001::', 32],
    ['2001:2::', 48],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['fc00::', 7],
    ['fe80::', 10],
    ['fec0::', 10],
    ['ff00::', 8]
  ].some(([base, prefix]) => isInIpv6Cidr(numeric, String(base), Number(prefix)))
}

function abortError(): Error {
  return new Error('Website request timed out')
}

async function resolveAddresses(hostname: string, signal: AbortSignal): Promise<PublicAddress[]> {
  if (isIP(hostname)) return [{ address: hostname, family: isIP(hostname) }]
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_resolve, reject) => {
        const rejectOnAbort = () => reject(abortError())
        if (signal.aborted) rejectOnAbort()
        signal.addEventListener('abort', rejectOnAbort, { once: true })
        timer = setTimeout(rejectOnAbort, DEFAULT_TIMEOUT_MS)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function resolvePublicTarget(rawUrl: string, signal: AbortSignal): Promise<PublicTarget> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Website URL is invalid')
  }
  if (url.protocol !== 'https:') throw new Error('Only HTTPS URLs are allowed')
  if (url.username || url.password) throw new Error('URL credentials are not allowed')
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost'))
    throw new Error('Local hosts are not allowed')
  const addresses = await resolveAddresses(hostname, signal)
  if (addresses.length === 0) throw new Error('Hostname did not resolve')
  for (const { address, family } of addresses) {
    if ((family === 4 && isBlockedIpv4(address)) || (family === 6 && isBlockedIpv6(address)))
      throw new Error('Private or reserved networks are not allowed')
  }
  return { url, addresses }
}

/** Reject hosts resolving to local, private, reserved, or documentation networks. */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  const target = await resolvePublicTarget(rawUrl, AbortSignal.timeout(DEFAULT_TIMEOUT_MS))
  return target.url
}

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

function decodeChunks(chunks: Uint8Array[], length: number): string {
  const merged = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

function responseHeaders(response: IncomingMessage): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) headers.set(name, value.join(', '))
    else if (value !== undefined) headers.set(name, value)
  }
  return headers
}

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
          status: response.statusCode ?? 0,
          headers,
          readHtml: () => readNodeResponse(response, headers),
          discard: async () => {
            response.destroy()
          }
        })
      }
    )
    request.on('error', reject)
    request.end()
  })
}

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
      if (signal.aborted) throw abortError()
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Website request failed')
}

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
    status: response.status,
    headers: response.headers,
    readHtml: () => readWebResponse(response),
    discard: async () => {
      await response.body?.cancel()
    }
  }
}

/** Fetch one HTML document with pinned DNS and redirect-by-redirect SSRF validation. */
export async function fetchPublicHtml(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeHtmlResponse> {
  const startedAt = performance.now()
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let target = await resolvePublicTarget(rawUrl, timeoutSignal)
  const initialOrigin = target.url.origin
  const customHeaders = normalizeRequestHeaders(options.headers)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const accept = 'text/html,application/xhtml+xml'
    const requestHeaders = target.url.origin === initialOrigin ? customHeaders : {}
    const response = options.fetchImplementation
      ? await requestWithFetch(
          target,
          timeoutSignal,
          options.fetchImplementation,
          accept,
          requestHeaders
        )
      : await requestPinned(target, timeoutSignal, accept, requestHeaders)
    if (response.headers.get('cf-mitigated')?.toLowerCase() === 'challenge') {
      await response.discard()
      throw new Error('The site returned a Cloudflare challenge instead of the page')
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === MAX_REDIRECTS) {
        await response.discard()
        throw new Error('Too many redirects')
      }
      const location = response.headers.get('location')
      await response.discard()
      if (!location) throw new Error('Redirect is missing a Location header')
      target = await resolvePublicTarget(new URL(location, target.url).toString(), timeoutSignal)
      continue
    }
    if (response.status < 200 || response.status >= 300) {
      await response.discard()
      throw new Error(`HTTP ${response.status}`)
    }
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      await response.discard()
      throw new Error('Response is not HTML')
    }
    const html = await response.readHtml()
    if (!html.trim()) throw new Error('HTML response is empty')
    return {
      url: target.url.toString(),
      html,
      fetchedAt: new Date().toISOString(),
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      headers: Object.fromEntries(response.headers.entries())
    }
  }
  throw new Error('Too many redirects')
}

/** Fetch a small public text or XML resource with the same SSRF and redirect controls as HTML. */
export async function fetchPublicText(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeTextResponse> {
  const startedAt = performance.now()
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let target = await resolvePublicTarget(rawUrl, timeoutSignal)
  const initialOrigin = target.url.origin
  const customHeaders = normalizeRequestHeaders(options.headers)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const accept = 'text/plain,application/xml,text/xml;q=0.9,*/*;q=0.1'
    const requestHeaders = target.url.origin === initialOrigin ? customHeaders : {}
    const response = options.fetchImplementation
      ? await requestWithFetch(
          target,
          timeoutSignal,
          options.fetchImplementation,
          accept,
          requestHeaders
        )
      : await requestPinned(target, timeoutSignal, accept, requestHeaders)
    if (response.headers.get('cf-mitigated')?.toLowerCase() === 'challenge') {
      await response.discard()
      throw new Error('The site returned a Cloudflare challenge instead of the resource')
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === MAX_REDIRECTS) {
        await response.discard()
        throw new Error('Too many redirects')
      }
      const location = response.headers.get('location')
      await response.discard()
      if (!location) throw new Error('Redirect is missing a Location header')
      target = await resolvePublicTarget(new URL(location, target.url).toString(), timeoutSignal)
      continue
    }
    if (response.status < 200 || response.status >= 300) {
      await response.discard()
      throw new Error(`HTTP ${response.status}`)
    }
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (
      !contentType.includes('text/plain') &&
      !contentType.includes('text/xml') &&
      !contentType.includes('application/xml') &&
      !contentType.includes('application/rss+xml')
    ) {
      await response.discard()
      throw new Error('Response is not text or XML')
    }
    const body = await response.readHtml()
    return {
      url: target.url.toString(),
      text: body,
      fetchedAt: new Date().toISOString(),
      status: response.status,
      durationMs: Math.round(performance.now() - startedAt),
      headers: Object.fromEntries(response.headers.entries())
    }
  }
  throw new Error('Too many redirects')
}
