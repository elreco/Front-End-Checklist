import { loadRules } from '@frontendchecklist/rules'
import { executeReviewCode } from '@repo/mcp/tools/review-code'
import { fetchPublicHtml } from './safe-fetch'
import type { FindingPriority } from './types'

export interface PageAuditResult {
  url: string
  reachable: boolean
  findings: Array<{
    pagePath: string
    ruleSlug: string
    title: string
    priority: FindingPriority
    message: string
  }>
  error?: string
}

/** Hash the complete ordered rule corpus so baselines move only when upstream content changes. */
export function getRulesetVersion(): string {
  const digest = createHash('sha256').update(JSON.stringify(loadRules())).digest('hex').slice(0, 16)
  return `frontend-checklist-${digest}`
}

/** Fetch a page exactly once and review the returned HTML with the upstream rules engine. */
export async function auditPage(url: string): Promise<PageAuditResult> {
  try {
    const source = await fetchPublicHtml(url)
    const rules = loadRules()
    if (rules.length === 0) throw new Error('No Front-End Checklist rules are available')
    const result = executeReviewCode({ code: source.html, minPriority: 'low' }, rules)
    const path = new URL(source.url).pathname
    return {
      url: source.url,
      reachable: true,
      findings: result.issues.map(issue => ({
        pagePath: path,
        ruleSlug: issue.rule,
        title: issue.title,
        priority: issue.priority,
        message: issue.issue
      }))
    }
  } catch (error) {
    return {
      url,
      reachable: false,
      findings: [],
      error: error instanceof Error ? error.message : 'Audit failed'
    }
  }
}

import { createHash } from 'node:crypto'
