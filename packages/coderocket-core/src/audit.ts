import { createHash } from 'node:crypto'
import { loadRules } from '@frontendchecklist/rules'
import { executeReviewCode } from '@repo/mcp/tools/review-code'
import { fetchPublicHtml } from './safe-fetch'
import type { AuditFindingInput, FindingCategory } from './types'

export interface PageAuditResult {
  url: string
  reachable: boolean
  findings: AuditFindingInput[]
  httpStatus?: number
  durationMs?: number
  error?: string
}

function toHealthCategory(category: string): FindingCategory {
  if (category === 'seo') return 'search'
  if (category === 'accessibility') return 'accessibility'
  if (category === 'performance' || category === 'images') return 'performance'
  if (category === 'security' || category === 'privacy') return 'security'
  return 'quality'
}

function responseFindings(options: {
  path: string
  durationMs: number
  headers: Record<string, string>
}): AuditFindingInput[] {
  const findings: AuditFindingInput[] = []
  if (options.durationMs > 3000) {
    findings.push({
      pagePath: options.path,
      ruleSlug: 'coderocket-server-response-time',
      title: 'Slow server response',
      priority: options.durationMs > 5000 ? 'high' : 'medium',
      message: `The page took ${options.durationMs} ms to respond to CodeRocket. Review hosting, caching, and backend work before the HTML response.`,
      category: 'performance',
      source: 'http'
    })
  }
  if (!options.headers['strict-transport-security']) {
    findings.push({
      pagePath: options.path,
      ruleSlug: 'coderocket-hsts-header',
      title: 'Strict transport security is not enabled',
      priority: 'high',
      message:
        'The HTTPS response does not include a Strict-Transport-Security header. Visitors can be exposed to downgrade attacks on a first connection.',
      category: 'security',
      source: 'http'
    })
  }
  if (!options.headers['content-security-policy']) {
    findings.push({
      pagePath: options.path,
      ruleSlug: 'coderocket-content-security-policy',
      title: 'Content Security Policy is missing',
      priority: 'medium',
      message:
        'The response does not include a Content-Security-Policy header. Add a policy that restricts which scripts, styles, frames, and connections the page can use.',
      category: 'security',
      source: 'http'
    })
  }
  return findings
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
    const categories = new Map(rules.map(rule => [rule.slug, rule.primaryCategory]))
    return {
      url: source.url,
      reachable: true,
      httpStatus: source.status,
      durationMs: source.durationMs,
      findings: [
        ...result.issues.map(issue => ({
          pagePath: path,
          ruleSlug: issue.rule,
          title: issue.title,
          priority: issue.priority,
          message: issue.issue,
          category: toHealthCategory(categories.get(issue.rule) ?? 'general'),
          source: 'frontend_checklist' as const
        })),
        ...responseFindings({ path, durationMs: source.durationMs, headers: source.headers })
      ]
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
