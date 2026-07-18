import { createHash } from 'node:crypto'
import { loadRules } from '@frontendchecklist/rules'
import { executeReviewCode } from '@repo/mcp/tools/review-code'
import { PRODUCTION_HTML_RULE_SLUGS, selectProductionHtmlRules } from './automation-profile'
import { normalizeAuditPath } from './diff'
import { createDocumentProof } from './document-proof'
import { fetchPublicHtml } from './safe-fetch'
import { extractSiteImageUrls, extractSocialImageUrl } from './social-metadata'
import type { AuditFindingInput, DocumentProof, FindingCategory } from './types'

const AUDIT_ENGINE_VERSION = 'coderocket-engine-4'
const RULES = loadRules()
const PRODUCTION_HTML_RULES = selectProductionHtmlRules(RULES)
const RULE_CATEGORIES = new Map(RULES.map(rule => [rule.slug, rule.primaryCategory]))
const RULESET_VERSION = `frontend-checklist-${createHash('sha256')
  .update(
    JSON.stringify({
      engine: AUDIT_ENGINE_VERSION,
      productionProfile: PRODUCTION_HTML_RULE_SLUGS,
      rules: RULES
    })
  )
  .digest('hex')
  .slice(0, 16)}`

export interface PageAuditResult {
  url: string
  reachable: boolean
  findings: AuditFindingInput[]
  httpStatus?: number
  durationMs?: number
  finalUrl?: string
  document?: DocumentProof
  siteImageUrls?: string[]
  socialImageUrl?: string
  error?: string
}

export interface AuditPageOptions {
  requestHeaders?: Record<string, string>
}

/** Map upstream checklist categories to CodeRocket's product-facing health categories. */
function toHealthCategory(category: string): FindingCategory {
  if (category === 'seo') return 'search'
  if (category === 'accessibility') return 'accessibility'
  if (category === 'performance' || category === 'images') return 'performance'
  if (category === 'security' || category === 'privacy') return 'security'
  return 'quality'
}

/** Build deterministic findings from measurable HTTP response evidence. */
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
      source: 'http',
      evidence: {
        kind: 'network',
        summary: 'Measured from the HTTPS request until the HTML response was received.',
        observed: `${options.durationMs} ms`,
        expected: '3,000 ms or less'
      }
    })
  }
  if (!options.headers['strict-transport-security']) {
    findings.push({
      pagePath: options.path,
      ruleSlug: 'hsts',
      title: 'Strict transport security is not enabled',
      priority: 'high',
      message:
        'The HTTPS response does not include a Strict-Transport-Security header. Visitors can be exposed to downgrade attacks on a first connection.',
      category: 'security',
      source: 'http',
      evidence: {
        kind: 'header',
        summary: 'The response did not include Strict-Transport-Security.',
        observed: 'Header missing',
        expected: 'Strict-Transport-Security with max-age of at least 31536000'
      }
    })
  }
  if (!options.headers['content-security-policy']) {
    findings.push({
      pagePath: options.path,
      ruleSlug: 'content-security-policy',
      title: 'Content Security Policy is missing',
      priority: 'medium',
      message:
        'The response does not include a Content-Security-Policy header. Add a policy that restricts which scripts, styles, frames, and connections the page can use.',
      category: 'security',
      source: 'http',
      evidence: {
        kind: 'header',
        summary: 'The response did not include a Content-Security-Policy header.',
        observed: 'Header missing',
        expected: 'A tested Content-Security-Policy header'
      }
    })
  }
  if (options.headers['x-content-type-options']?.toLowerCase() !== 'nosniff') {
    findings.push({
      pagePath: options.path,
      ruleSlug: 'x-content-type',
      title: 'Content type sniffing is not disabled',
      priority: 'medium',
      message:
        'The response does not set X-Content-Type-Options to nosniff. Browsers may interpret a file as a different content type than the server declared.',
      category: 'security',
      source: 'http',
      evidence: {
        kind: 'header',
        summary: 'CodeRocket inspected the X-Content-Type-Options response header.',
        observed: options.headers['x-content-type-options'] ?? 'Header missing',
        expected: 'nosniff'
      }
    })
  }
  if (!options.headers['referrer-policy']) {
    findings.push({
      pagePath: options.path,
      ruleSlug: 'referrer-policy',
      title: 'Referrer policy is not explicit',
      priority: 'medium',
      message:
        'The response does not include a Referrer-Policy header, so referrer data is left to browser defaults.',
      category: 'security',
      source: 'http',
      evidence: {
        kind: 'header',
        summary: 'The response did not include Referrer-Policy.',
        observed: 'Header missing',
        expected: 'Referrer-Policy: strict-origin-when-cross-origin or a stricter policy'
      }
    })
  }
  return findings
}

/** Hash the complete ordered rule corpus so baselines move only when upstream content changes. */
export function getRulesetVersion(): string {
  return RULESET_VERSION
}

/** Fetch a page exactly once and review the returned HTML with the upstream rules engine. */
export async function auditPage(
  url: string,
  options: AuditPageOptions = {}
): Promise<PageAuditResult> {
  try {
    const requestedUrl = new URL(url)
    const requestedPath = normalizeAuditPath(requestedUrl.pathname)
    const source = await fetchPublicHtml(url, { headers: options.requestHeaders })
    const siteImageUrls =
      requestedUrl.pathname === '/' ? extractSiteImageUrls(source.html, source.url) : undefined
    if (PRODUCTION_HTML_RULES.length === 0)
      throw new Error('No automated Front-End Checklist rules are available')
    const result = executeReviewCode(
      { code: source.html, focus: ['html', 'accessibility', 'seo', 'images'], minPriority: 'low' },
      PRODUCTION_HTML_RULES
    )
    return {
      url: requestedUrl.toString(),
      finalUrl: source.url,
      reachable: true,
      httpStatus: source.status,
      durationMs: source.durationMs,
      document: createDocumentProof(source),
      socialImageUrl: extractSocialImageUrl(source.html, source.url),
      siteImageUrls,
      findings: [
        ...result.issues.map(issue => ({
          pagePath: requestedPath,
          ruleSlug: issue.rule,
          title: issue.title,
          priority: issue.priority,
          message: issue.issue,
          category: toHealthCategory(RULE_CATEGORIES.get(issue.rule) ?? 'general'),
          source: 'frontend_checklist' as const,
          evidence: {
            kind: 'html' as const,
            summary: 'CodeRocket found this directly in the HTML returned by the monitored URL.',
            observed: issue.issue,
            expected: 'The linked Front-End Checklist rule should pass'
          }
        })),
        ...responseFindings({
          path: requestedPath,
          durationMs: source.durationMs,
          headers: source.headers
        })
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
