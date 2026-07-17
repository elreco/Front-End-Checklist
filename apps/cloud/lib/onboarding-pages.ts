/** Count distinct non-empty page lines using the same practical path identity as saved projects. */
export function countEnteredPages(value: string): number {
  return getEnteredPages(value).length
}

/** Return distinct, display-ready draft page identities in their entered order. */
export function getEnteredPages(value: string): string[] {
  const pages = value
    .split('\n')
    .map(page => page.trim())
    .filter(Boolean)
    .map(normalizeDraftPageIdentity)
  return pages.filter((page, index) => pages.indexOf(page) === index)
}

/** Extract same-site page paths from an XML sitemap, JSON array, CSV, or newline route list. */
export function getImportedPages(value: string, rawSiteUrl: string): string[] {
  const siteUrl = parseSiteUrl(rawSiteUrl)
  if (!siteUrl) return []
  const candidates = collectImportCandidates(value)
  const pages = candidates
    .map(candidate => importedCandidatePath(candidate, siteUrl))
    .filter((page): page is string => Boolean(page))
  return pages.filter((page, index) => pages.indexOf(page) === index).slice(0, 500)
}

/** Merge new page paths into the editable one-path-per-line field. */
export function mergeEnteredPages(value: string, additions: string[]): string {
  return [...new Set([...getEnteredPages(value), ...additions])].join('\n')
}

/** Normalize harmless slash differences so duplicate paths do not consume two visible slots. */
function normalizeDraftPageIdentity(value: string): string {
  try {
    const candidate = value.startsWith('/') ? value : `/${value}`
    const base = new URL('https://coderocket.invalid')
    const parsed = new URL(candidate, base)
    if (parsed.origin !== base.origin || parsed.search || parsed.hash) return value
    return parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
  } catch {
    return value
  }
}

function parseSiteUrl(value: string): URL | undefined {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

function collectImportCandidates(value: string): string[] {
  const xmlLocations = [
    ...value.matchAll(/<(?:[a-z0-9_-]+:)?loc(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-z0-9_-]+:)?loc>/gi)
  ]
    .map(match => match[1]?.trim())
    .filter((candidate): candidate is string => Boolean(candidate))
  if (xmlLocations.length > 0) return xmlLocations
  try {
    const parsed: unknown = JSON.parse(value)
    const strings = collectJsonRoutes(parsed)
    if (strings.length > 0) return strings
  } catch {}
  return value
    .split(/[\r\n]+/)
    .map(line => line.split(',')[0] ?? '')
    .map(candidate => candidate.trim().replace(/^['"]|['"]$/g, ''))
    .filter(candidate => Boolean(candidate) && !/^(?:page|path|route|url)s?$/i.test(candidate))
}

function collectJsonRoutes(value: unknown, depth = 0): string[] {
  if (depth > 5) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value))
    return value.slice(0, 1000).flatMap(item => collectJsonRoutes(item, depth + 1))
  if (value && typeof value === 'object') {
    const routeValues = Object.entries(value)
      .filter(([key]) => /^(?:page|path|route|url)s?$/i.test(key))
      .map(([, item]) => item)
    return routeValues.slice(0, 1000).flatMap(item => collectJsonRoutes(item, depth + 1))
  }
  return []
}

function importedCandidatePath(candidate: string, siteUrl: URL): string | undefined {
  const decoded = decodeImportEntities(candidate.trim())
  try {
    const parsed = new URL(decoded, siteUrl.origin)
    if (parsed.origin !== siteUrl.origin || !isLikelyHtmlPath(parsed.pathname)) return undefined
    return normalizeDraftPageIdentity(parsed.pathname)
  } catch {
    return undefined
  }
}

function decodeImportEntities(value: string): string {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
}

function isLikelyHtmlPath(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop() ?? ''
  if (!lastSegment.includes('.')) return true
  return /\.(?:html?|php|aspx?)$/i.test(lastSegment)
}
