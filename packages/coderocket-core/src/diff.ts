import { createHash } from 'node:crypto'
import type { AuditComparison, AuditFinding, AuditFindingInput, FindingStatus } from './types'

/** Normalize a page identity consistently across crawler, CLI, and comparison inputs. */
export function normalizeAuditPath(path: string): string {
  const parsed = new URL(path, 'https://coderocket.invalid')
  let decoded: string
  try {
    decoded = decodeURIComponent(parsed.pathname)
  } catch {
    decoded = parsed.pathname
  }
  const collapsed = decoded.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
  return collapsed.toLowerCase()
}

/** Build an identity that remains stable when explanatory copy changes. */
export function fingerprintFinding(
  pagePath: string,
  ruleSlug: string,
  occurrenceKey = 'primary'
): string {
  const identity = `${normalizeAuditPath(pagePath)}\u0000${ruleSlug.trim().toLowerCase()}\u0000${occurrenceKey.trim().toLowerCase()}`
  return createHash('sha256').update(identity).digest('hex')
}

function withFingerprint(finding: AuditFindingInput, status: FindingStatus): AuditFinding {
  return {
    ...finding,
    occurrenceKey: finding.occurrenceKey ?? 'primary',
    fingerprint: fingerprintFinding(
      finding.pagePath,
      finding.ruleSlug,
      finding.occurrenceKey ?? 'primary'
    ),
    status
  }
}

/** Compare a run with its baseline and calculate an honest health result. */
export function compareFindings(options: {
  current: AuditFindingInput[]
  baseline: AuditFindingInput[]
  currentRulesetVersion: string
  baselineRulesetVersion?: string
  unreachablePagePaths?: string[]
}): AuditComparison {
  const sameRuleset =
    options.baselineRulesetVersion !== undefined &&
    options.baselineRulesetVersion === options.currentRulesetVersion
  const unreachable = new Set((options.unreachablePagePaths ?? []).map(normalizeAuditPath))
  if (!sameRuleset) {
    const findings = options.current.map(finding => withFingerprint(finding, 'persistent'))
    return {
      gate: unreachable.size > 0 ? 'inconclusive' : 'needs_baseline',
      findings,
      counts: { new: 0, persistent: findings.length, resolved: 0 },
      blockingRegressions: 0
    }
  }

  const baseline = new Map(
    options.baseline.map(finding => [
      fingerprintFinding(finding.pagePath, finding.ruleSlug, finding.occurrenceKey),
      finding
    ])
  )
  const current = new Map(
    options.current.map(finding => [
      fingerprintFinding(finding.pagePath, finding.ruleSlug, finding.occurrenceKey),
      finding
    ])
  )
  const findings: AuditFinding[] = []

  for (const [fingerprint, finding] of current) {
    findings.push(withFingerprint(finding, baseline.has(fingerprint) ? 'persistent' : 'new'))
  }

  for (const [fingerprint, finding] of baseline) {
    if (current.has(fingerprint)) continue
    if (unreachable.has(normalizeAuditPath(finding.pagePath))) {
      findings.push(withFingerprint(finding, 'persistent'))
      continue
    }
    findings.push(withFingerprint(finding, 'resolved'))
  }

  const counts: Record<FindingStatus, number> = { new: 0, persistent: 0, resolved: 0 }
  for (const finding of findings) counts[finding.status] += 1
  const potentialBlockingRegressions = findings.filter(
    finding =>
      finding.status === 'new' && (finding.priority === 'critical' || finding.priority === 'high')
  ).length
  const gate =
    potentialBlockingRegressions > 0 ? 'failed' : unreachable.size > 0 ? 'inconclusive' : 'passed'

  return {
    gate,
    findings,
    counts,
    blockingRegressions: gate === 'failed' ? potentialBlockingRegressions : 0
  }
}
