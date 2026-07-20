const DEFAULT_AUTH_DESTINATION = '/dashboard'
const AUTH_REDIRECT_BASE = 'https://www.coderocket.app'

/** Return a same-origin application path suitable for post-authentication redirects. */
export function getSafeAuthDestination(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_DESTINATION
): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  try {
    const destination = new URL(value, AUTH_REDIRECT_BASE)
    if (destination.origin !== AUTH_REDIRECT_BASE) return fallback
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return fallback
  }
}

/**
 * Build a post-authentication redirect against the configured public site origin.
 *
 * Reverse proxies can expose an internal request origin such as `0.0.0.0:3000`.
 * Prefer the configured public site URL and retain the request origin as a safe
 * fallback for local development or an invalid deployment value.
 */
export function getAuthRedirectUrl(
  destination: string,
  requestUrl: string,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
): URL {
  const requestOrigin = new URL(requestUrl).origin
  if (!configuredSiteUrl) return new URL(destination, requestOrigin)
  try {
    return new URL(destination, new URL(configuredSiteUrl).origin)
  } catch {
    return new URL(destination, requestOrigin)
  }
}
