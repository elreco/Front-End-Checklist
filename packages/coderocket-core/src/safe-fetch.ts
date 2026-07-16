import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_REDIRECTS = 5
const MAX_HTML_BYTES = 2 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 10_000

export interface SafeHtmlResponse {
  url: string
  html: string
  fetchedAt: string
}

function isBlockedIpv4(address: string): boolean {
  const [a = 0, b = 0] = address.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0] ?? address.toLowerCase()
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  )
}

/** Reject hosts resolving to local, private, reserved, or documentation networks. */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl)
  if (url.protocol !== 'https:') throw new Error('Only HTTPS URLs are allowed')
  if (url.username || url.password) throw new Error('URL credentials are not allowed')
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Local hosts are not allowed')
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true })
  if (addresses.length === 0) throw new Error('Hostname did not resolve')
  for (const { address, family } of addresses) {
    if ((family === 4 && isBlockedIpv4(address)) || (family === 6 && isBlockedIpv6(address))) {
      throw new Error('Private or reserved networks are not allowed')
    }
  }
  return url
}

async function readBoundedHtml(response: Response): Promise<string> {
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
  const merged = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

/** Fetch one HTML document with redirect-by-redirect SSRF validation. */
export async function fetchPublicHtml(
  rawUrl: string,
  options: { timeoutMs?: number; fetchImplementation?: typeof fetch } = {}
): Promise<SafeHtmlResponse> {
  const request = options.fetchImplementation ?? fetch
  let url = await assertPublicHttpsUrl(rawUrl)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await request(url, {
      redirect: 'manual',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'CodeRocket/0.1 (+https://coderocket.app)'
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === MAX_REDIRECTS) throw new Error('Too many redirects')
      const location = response.headers.get('location')
      if (!location) throw new Error('Redirect is missing a Location header')
      url = await assertPublicHttpsUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('Response is not HTML')
    }
    return {
      url: url.toString(),
      html: await readBoundedHtml(response),
      fetchedAt: new Date().toISOString()
    }
  }
  throw new Error('Too many redirects')
}
