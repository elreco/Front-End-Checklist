import type { SiteDocument } from '@coderocket/core'

/** Rewrite a captured same-origin link to the corresponding published CodeRocket page. */
export function resolvePublishedSiteHref(
  document: SiteDocument,
  href: string,
  publicBasePath?: string
): string {
  if (!publicBasePath) return href
  try {
    const target = new URL(href)
    const source = new URL(document.source.url)
    const capturedPaths = new Set(document.pages?.map(page => page.path) ?? ['/'])
    const normalizedPath = target.pathname === '/' ? '/' : target.pathname.replace(/\/+$/, '')
    if (target.origin !== source.origin || !capturedPaths.has(normalizedPath)) return href
    const pathname = normalizedPath === '/' ? '' : normalizedPath
    return `${publicBasePath}${pathname}${target.search}${target.hash}`
  } catch {
    return href
  }
}
