import type { ProjectPageCheck } from './project-data'

export type ProjectRecoveryKind = 'access' | 'address' | 'pages' | 'temporary'

/** Extract an HTTP response code whether it was stored structurally or in a fetch error. */
export function getPageHttpStatus(page: ProjectPageCheck): number | undefined {
  if (page.httpStatus) return page.httpStatus
  const match = page.error?.match(/\bHTTP\s+(\d{3})\b/i)
  return match ? Number(match[1]) : undefined
}

/** Choose the most useful corrective workflow for an incomplete website check. */
export function getProjectRecoveryKind(pages: ProjectPageCheck[]): ProjectRecoveryKind {
  if (
    pages.some(page =>
      /hostname did not resolve|invalid url|enotfound|name or service not known/i.test(
        page.error ?? ''
      )
    )
  )
    return 'address'
  if (pages.some(page => [404, 410].includes(getPageHttpStatus(page) ?? 0))) return 'pages'
  if (
    pages.some(page => {
      const status = getPageHttpStatus(page)
      return (
        status === 401 ||
        status === 403 ||
        status === 407 ||
        /cloudflare challenge|challenge instead of|access denied|sign[- ]?in/i.test(
          page.error ?? ''
        )
      )
    })
  )
    return 'access'
  return 'temporary'
}
