import type { BuilderRevisionSummary } from '@/lib/builder-data'

/** Preserve the selected page while opening one safe immutable website version. */
export function studioVersionHref(
  siteId: string,
  revision: BuilderRevisionSummary,
  pagePath: string,
  currentRevisionId?: string
): string {
  const query = new URLSearchParams()
  if (revision.id !== currentRevisionId) query.set('version', revision.id)
  if (pagePath !== '/') query.set('page', pagePath)
  const suffix = query.toString()
  return `/studio/${siteId}${suffix ? `?${suffix}` : ''}`
}
