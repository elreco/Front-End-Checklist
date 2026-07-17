/** Normalize a landing-page website draft into the HTTPS origin accepted by onboarding. */
export function normalizeWebsiteDraft(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !isValidWebsiteHostname(url.hostname)
    )
      return undefined
    return url.origin
  } catch {
    return undefined
  }
}

/** Reject browser-specific hostname coercions while allowing domains, IP addresses, and localhost. */
function isValidWebsiteHostname(hostname: string): boolean {
  if (hostname.startsWith('[') && hostname.endsWith(']'))
    return /^[\da-f:.]+$/i.test(hostname.slice(1, -1))
  if (hostname.length > 253) return false
  return hostname.split('.').every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))
}

/** Derive an editable project name from a normalized website origin. */
export function deriveWebsiteName(value: string): string {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '')
    const label = hostname.split('.')[0]?.replace(/[-_]+/g, ' ').trim() ?? ''
    return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : ''
  } catch {
    return ''
  }
}
