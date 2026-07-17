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
