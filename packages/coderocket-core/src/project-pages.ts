const PROJECT_PAGE_BASE = new URL('https://coderocket.invalid')

/** Normalize a secure origin without requiring the CodeRocket cloud to resolve or reach it. */
export function normalizeHttpsOrigin(rawUrl: string): string {
  const url = new URL(rawUrl.trim())
  if (url.protocol !== 'https:') throw new Error('Website address must use HTTPS')
  if (url.username || url.password)
    throw new Error('Website address cannot contain embedded credentials')
  return url.origin
}

/** Normalize one user-provided page path without allowing another origin or query identity. */
export function normalizeProjectPagePath(rawPath: string): string {
  const trimmed = rawPath.trim()
  if (!trimmed) throw new Error('Page paths cannot be empty')
  const candidate = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (candidate.startsWith('//')) throw new Error('Page paths cannot point to another hostname')
  if (candidate.length > 2048) throw new Error('Page paths cannot exceed 2048 characters')

  const parsed = new URL(candidate, PROJECT_PAGE_BASE)
  if (parsed.origin !== PROJECT_PAGE_BASE.origin)
    throw new Error('Page paths must stay on the monitored website')
  if (parsed.search || parsed.hash)
    throw new Error('Page paths cannot contain query strings or fragments')

  return parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
}

/** Normalize and deduplicate the configured pages while preserving their display order. */
export function normalizeProjectPagePaths(rawPaths: string[]): string[] {
  const normalized = rawPaths.map(normalizeProjectPagePath)
  return normalized.filter((path, index) => normalized.indexOf(path) === index)
}

/** Keep authenticated paths normalized, unique, and inside the monitored page selection. */
export function normalizeAuthenticatedPagePaths(
  rawPaths: string[],
  monitoredPaths: string[]
): string[] {
  const normalizedMonitoredPaths = normalizeProjectPagePaths(monitoredPaths)
  const monitoredSet = new Set(normalizedMonitoredPaths)
  const normalizedAuthenticatedPaths = normalizeProjectPagePaths(rawPaths)
  for (const path of normalizedAuthenticatedPaths)
    if (!monitoredSet.has(path))
      throw new Error(`Authenticated page ${path} must also be monitored`)
  return normalizedAuthenticatedPaths
}

/** Derive the site-level execution route from its page-level authentication requirements. */
export function deriveSiteAccessMode(
  monitoredPaths: string[],
  authenticatedPaths: string[],
  secureRunnerRequired = authenticatedPaths.length > 0
): 'public' | 'protected' | 'private' {
  const pages = normalizeProjectPagePaths(monitoredPaths)
  const authenticated = normalizeAuthenticatedPagePaths(authenticatedPaths, pages)
  if (!secureRunnerRequired && authenticated.length === 0) return 'public'
  return authenticated.length === pages.length ? 'private' : 'protected'
}

/** Build a same-origin page URL from a validated project root and page path. */
export function buildProjectPageUrl(productionUrl: string, pagePath: string): string {
  const production = new URL(productionUrl)
  const normalizedPath = normalizeProjectPagePath(pagePath)
  const pageUrl = new URL(normalizedPath, `${production.origin}/`)
  if (pageUrl.origin !== production.origin)
    throw new Error('Monitored pages must stay on the project hostname')
  return pageUrl.toString()
}
