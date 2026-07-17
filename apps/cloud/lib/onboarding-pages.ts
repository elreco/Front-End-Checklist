/** Count distinct non-empty page lines using the same practical path identity as saved projects. */
export function countEnteredPages(value: string): number {
  const pages = value
    .split('\n')
    .map(page => page.trim())
    .filter(Boolean)
    .map(normalizeDraftPageIdentity)
  return new Set(pages).size
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
