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
    throw new Error('Page paths must stay on the source website')
  if (parsed.search || parsed.hash)
    throw new Error('Page paths cannot contain query strings or fragments')

  return parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
}

/** Normalize and deduplicate the configured pages while preserving their display order. */
export function normalizeProjectPagePaths(rawPaths: string[]): string[] {
  const normalized = rawPaths.map(normalizeProjectPagePath)
  return normalized.filter((path, index) => normalized.indexOf(path) === index)
}
