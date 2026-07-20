import {
  assertHtmlIsRequestedPage,
  isSignInRedirect,
  normalizeSafeRequestHeaders,
  rejectKnownAccessBarrier
} from './safe-fetch-access'
import { resolvePublicTarget } from './safe-fetch-network'
import { requestAuditResponse } from './safe-fetch-response'

const MAX_REDIRECTS = 5
const DEFAULT_TIMEOUT_MS = 10_000
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

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

export interface SafeImageResponse {
  bytes: Uint8Array
  contentType: 'image/avif' | 'image/gif' | 'image/jpeg' | 'image/png' | 'image/webp'
  durationMs: number
  fetchedAt: string
  headers: Record<string, string>
  status: number
  url: string
}

/** Narrow a remote content type to passive raster formats that cannot execute scripts. */
function readSafeImageContentType(value?: string): SafeImageResponse['contentType'] | undefined {
  const normalized = value?.split(';')[0]?.trim().toLowerCase()
  if (
    normalized === 'image/avif' ||
    normalized === 'image/gif' ||
    normalized === 'image/jpeg' ||
    normalized === 'image/png' ||
    normalized === 'image/webp'
  )
    return normalized
}

export interface SafeFetchOptions {
  timeoutMs?: number
  fetchImplementation?: typeof fetch
  headers?: Record<string, string>
}

/** Reject hosts resolving to local, private, reserved, or documentation networks. */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<URL> {
  const target = await resolvePublicTarget(rawUrl, AbortSignal.timeout(DEFAULT_TIMEOUT_MS))
  return target.url
}

/** Fetch one HTML document with pinned DNS and redirect-by-redirect SSRF validation. */
export async function fetchPublicHtml(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeHtmlResponse> {
  const startedAt = performance.now()
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let target = await resolvePublicTarget(rawUrl, timeoutSignal)
  const requestedUrl = target.url
  const initialOrigin = target.url.origin
  const customHeaders = normalizeSafeRequestHeaders(options.headers)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const requestHeaders = target.url.origin === initialOrigin ? customHeaders : {}
    const response = await requestAuditResponse(
      target,
      timeoutSignal,
      'text/html,application/xhtml+xml',
      requestHeaders,
      options.fetchImplementation
    )
    await rejectKnownAccessBarrier(response, 'page')
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === MAX_REDIRECTS) {
        await response.discard()
        throw new Error('Too many redirects')
      }
      const location = response.headers.get('location')
      await response.discard()
      if (!location) throw new Error('Redirect is missing a Location header')
      const destination = new URL(location, target.url)
      if (isSignInRedirect(requestedUrl, destination))
        throw new Error(`The page redirected to a sign-in screen at ${destination.pathname}`)
      target = await resolvePublicTarget(destination.toString(), timeoutSignal)
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
    const html = await response.readBody()
    if (!html.trim()) throw new Error('HTML response is empty')
    assertHtmlIsRequestedPage(requestedUrl, html)
    return {
      durationMs: Math.round(performance.now() - startedAt),
      fetchedAt: new Date().toISOString(),
      headers: Object.fromEntries(response.headers.entries()),
      html,
      status: response.status,
      url: target.url.toString()
    }
  }
  throw new Error('Too many redirects')
}

/** Fetch a text or image resource through the same bounded safe request policy. */
async function fetchPublicResource(
  rawUrl: string,
  options: SafeFetchOptions,
  imageOnly: boolean
): Promise<SafeTextResponse> {
  const startedAt = performance.now()
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let target = await resolvePublicTarget(rawUrl, timeoutSignal)
  const initialOrigin = target.url.origin
  const customHeaders = normalizeSafeRequestHeaders(options.headers)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const accept = imageOnly ? 'image/*' : 'text/plain,application/xml,text/xml;q=0.9,*/*;q=0.1'
    const requestHeaders = target.url.origin === initialOrigin ? customHeaders : {}
    const response = await requestAuditResponse(
      target,
      timeoutSignal,
      accept,
      requestHeaders,
      options.fetchImplementation
    )
    await rejectKnownAccessBarrier(response, 'resource')
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
    const accepted = imageOnly
      ? contentType.startsWith('image/')
      : contentType.includes('text/plain') ||
        contentType.includes('text/xml') ||
        contentType.includes('application/xml') ||
        contentType.includes('application/rss+xml')
    if (!accepted) {
      await response.discard()
      throw new Error(imageOnly ? 'Response is not an image' : 'Response is not text or XML')
    }
    if (imageOnly) await response.discard()
    const text = imageOnly ? '' : await response.readBody()
    return {
      durationMs: Math.round(performance.now() - startedAt),
      fetchedAt: new Date().toISOString(),
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
      text,
      url: target.url.toString()
    }
  }
  throw new Error('Too many redirects')
}

/** Fetch a small public text or XML resource with public-network and redirect controls. */
export async function fetchPublicText(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeTextResponse> {
  return fetchPublicResource(rawUrl, options, false)
}

/** Verify a public image without downloading its body and return its final safe URL. */
export async function probePublicImage(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<string> {
  return (await fetchPublicResource(rawUrl, options, true)).url
}

/** Download one bounded passive image with pinned DNS and redirect-by-redirect validation. */
export async function fetchPublicImage(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeImageResponse> {
  const startedAt = performance.now()
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let target = await resolvePublicTarget(rawUrl, timeoutSignal)
  const initialOrigin = target.url.origin
  const customHeaders = normalizeSafeRequestHeaders(options.headers)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const requestHeaders = target.url.origin === initialOrigin ? customHeaders : {}
    const response = await requestAuditResponse(
      target,
      timeoutSignal,
      'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9',
      requestHeaders,
      options.fetchImplementation
    )
    await rejectKnownAccessBarrier(response, 'resource')
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
    const contentType = readSafeImageContentType(response.headers.get('content-type') ?? undefined)
    if (!contentType) {
      await response.discard()
      throw new Error('Response is not a supported passive image')
    }
    const bytes = await response.readBytes(MAX_IMAGE_BYTES)
    if (bytes.byteLength === 0) throw new Error('Image response is empty')
    return {
      bytes,
      contentType,
      durationMs: Math.round(performance.now() - startedAt),
      fetchedAt: new Date().toISOString(),
      headers: Object.fromEntries(response.headers.entries()),
      status: response.status,
      url: target.url.toString()
    }
  }
  throw new Error('Too many redirects')
}
