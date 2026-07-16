import { createHash } from 'node:crypto'
import type { AuditComparison, AuditFinding, AuditFindingInput, FindingStatus } from './types'

function normalizePath(path: string): string {
  const parsed = new URL(path, 'https://coderocket.invalid')
  const decoded = decodeURIComponent(parsed.pathname)
  const collapsed = decoded.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
  return collapsed.toLowerCase()
}

/** Build an identity that remains stable when explanatory copy changes. */
export function fingerprintFinding(pagePath: string, ruleSlug: string): string {
  const identity = `${normalizePath(pagePath)}\u0000${ruleSlug.trim().toLowerCase()}`
  return createHash('sha256').update(identity).digest('hex')
}

function withFingerprint(finding: AuditFindingInput, status: FindingStatus): AuditFinding {
  return {
    ...finding,
    fingerprint: fingerprintFinding(finding.pagePath, finding.ruleSlug),
    status
  }
}

/** Compare a run with its baseline and calculate the CI quality gate. */
export function compareFindings(options: {
  current: AuditFindingInput[]
  baseline: AuditFindingInput[]
  currentRulesetVersion: string
  baselineRulesetVersion?: string
  unreachablePagePaths?: string[]
}): AuditComparison {
  const baseline = new Map(
    options.baseline.map(finding => [
      fingerprintFinding(finding.pagePath, finding.ruleSlug),
      finding
    ])
  )
  const current = new Map(
    options.current.map(finding => [
      fingerprintFinding(finding.pagePath, finding.ruleSlug),
      finding
    ])
  )
  const unreachable = new Set((options.unreachablePagePaths ?? []).map(normalizePath))
  const findings: AuditFinding[] = []

  for (const [fingerprint, finding] of current) {
    findings.push(withFingerprint(finding, baseline.has(fingerprint) ? 'persistent' : 'new'))
  }

  for (const [fingerprint, finding] of baseline) {
    if (current.has(fingerprint) || unreachable.has(normalizePath(finding.pagePath))) continue
    findings.push(withFingerprint(finding, 'resolved'))
  }

  const counts: Record<FindingStatus, number> = { new: 0, persistent: 0, resolved: 0 }
  for (const finding of findings) counts[finding.status] += 1
  const blockingRegressions = findings.filter(
    finding =>
      finding.status === 'new' && (finding.priority === 'critical' || finding.priority === 'high')
  ).length
  const sameRuleset =
    options.baselineRulesetVersion !== undefined &&
    options.baselineRulesetVersion === options.currentRulesetVersion

  return {
    gate: sameRuleset ? (blockingRegressions > 0 ? 'failed' : 'passed') : 'needs_baseline',
    findings,
    counts,
    blockingRegressions
  }
}
