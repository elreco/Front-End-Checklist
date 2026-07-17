/** Normalize a landing-page website draft into the HTTPS origin accepted by onboarding. */
export function normalizeWebsiteDraft(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return undefined
    return url.origin
  } catch {
    return undefined
  }
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
