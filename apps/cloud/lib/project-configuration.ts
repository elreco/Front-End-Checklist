import { normalizeProjectPagePaths } from '@coderocket/core'

/** Accept paths or same-origin full URLs and return the canonical stored page paths. */
export function normalizeEditablePagePaths(rawPaths: string[], productionUrl: string): string[] {
  const origin = new URL(productionUrl).origin
  const paths = rawPaths.map(rawPath => {
    const trimmed = rawPath.trim()
    if (!/^https?:\/\//i.test(trimmed)) return trimmed
    const pageUrl = new URL(trimmed)
    if (pageUrl.protocol !== 'https:' || pageUrl.origin !== origin)
      throw new Error('Every monitored page must belong to the website address above')
    if (pageUrl.search || pageUrl.hash)
      throw new Error('Monitored pages cannot contain query strings or fragments')
    return pageUrl.pathname
  })
  return normalizeProjectPagePaths(paths)
}

/** Compare persisted monitoring inputs without treating page ordering as interchangeable. */
export function projectConfigurationChanged(
  current: {
    authenticatedPages?: string[]
    pages: string[]
    secureRunnerRequired?: boolean
    url: string
  },
  next: {
    authenticatedPages?: string[]
    pages: string[]
    secureRunnerRequired?: boolean
    url: string
  }
): boolean {
  if ((current.secureRunnerRequired ?? false) !== (next.secureRunnerRequired ?? false)) return true
  if (current.url !== next.url || current.pages.length !== next.pages.length) return true
  if (current.pages.some((page, index) => page !== next.pages[index])) return true
  const currentAuthenticated = current.authenticatedPages ?? []
  const nextAuthenticated = next.authenticatedPages ?? []
  if (currentAuthenticated.length !== nextAuthenticated.length) return true
  return currentAuthenticated.some((page, index) => page !== nextAuthenticated[index])
}
