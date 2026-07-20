/** Normalize a website draft while preserving the exact page that should seed the project. */
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
    url.hash = ''
    url.search = ''
    return url.pathname === '/' ? url.origin : `${url.origin}${url.pathname}`
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

/** Keep one optional plain-language creation request within the builder's safe edit limit. */
export function normalizeInitialSiteInstruction(value: string): string | undefined {
  const instruction = value.trim()
  if (!instruction || instruction.length < 2 || instruction.length > 2000) return undefined
  return instruction
}
