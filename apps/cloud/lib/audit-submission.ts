import {
  type AuditFindingInput,
  normalizeAuditPath,
  type ValidAuditSubmission
} from '@coderocket/core'

export type NormalizedSubmittedPage = ValidAuditSubmission['pages'][number]

/** Enforce one stable page identity and honest reachable/finding semantics for CLI submissions. */
export function normalizeSubmittedPages(
  pages: ValidAuditSubmission['pages']
): NormalizedSubmittedPage[] {
  const normalizedPages: NormalizedSubmittedPage[] = []
  const submittedPaths = new Set<string>()
  for (const page of pages) {
    const pageUrl = new URL(page.url)
    if (pageUrl.username || pageUrl.password)
      throw new Error('Page URLs cannot contain credentials')
    const pagePath = normalizeAuditPath(pageUrl.pathname)
    if (submittedPaths.has(pagePath)) throw new Error(`Duplicate page identity: ${pagePath}`)
    if (!page.reachable && page.findings.length > 0)
      throw new Error(`Unreachable page ${pagePath} cannot contain findings`)
    if (page.findings.some(finding => normalizeAuditPath(finding.pagePath) !== pagePath))
      throw new Error(`Every finding for ${pagePath} must use the same page path`)
    submittedPaths.add(pagePath)
    normalizedPages.push({
      ...page,
      url: pageUrl.toString(),
      findings: page.findings.map(finding => ({ ...finding, pagePath }))
    })
  }
  return normalizedPages
}

/** Keep baseline findings only for pages included in a partial runner submission. */
export function filterBaselineForSubmittedPages(
  findings: AuditFindingInput[],
  pages: NormalizedSubmittedPage[]
): AuditFindingInput[] {
  const submittedPaths = new Set(pages.map(page => normalizeAuditPath(new URL(page.url).pathname)))
  return findings.filter(finding => submittedPaths.has(normalizeAuditPath(finding.pagePath)))
}

/** Refuse partial CI results so a website level can never hide an omitted protected page. */
export function hasExactPageCoverage(configuredPaths: string[], submittedPaths: string[]): boolean {
  if (configuredPaths.length !== submittedPaths.length) return false
  const submitted = new Set(submittedPaths.map(normalizeAuditPath))
  return configuredPaths.every(path => submitted.has(normalizeAuditPath(path)))
}
