import type { AuditStatus, FindingPriority, FindingStatus, GateStatus } from './types'

export const WEBSITE_LEVELS = [
  'unverified',
  'needs_attention',
  'bronze',
  'silver',
  'gold',
  'platinum'
] as const

export type WebsiteLevel = (typeof WEBSITE_LEVELS)[number]

export type WebsiteStabilityMilestone = 'starting' | 'steady' | 'trusted' | 'proven'

export interface WebsiteLevelFinding {
  identity: string
  priority: FindingPriority
  status: FindingStatus
}

export interface WebsiteLevelInput {
  auditStatus?: AuditStatus
  checkedPages: number
  findings: WebsiteLevelFinding[]
  gate?: GateStatus
  requestedPages: number
  rulesetCurrent?: boolean
}

export interface WebsiteLevelResult {
  counts: Record<FindingPriority, number>
  eligible: boolean
  level: WebsiteLevel
  nextLevel?: Exclude<WebsiteLevel, 'unverified' | 'needs_attention'>
  openCount: number
  requiredFixCount: number
  requiredPriority?: FindingPriority
}

export interface WebsiteStabilityAudit {
  blockingCount: number
  checkedPages: number
  requestedPages: number
  rulesetVersion: string
  status: AuditStatus
}

export interface WebsiteStabilityResult {
  checks: number
  milestone: WebsiteStabilityMilestone
  nextMilestone?: Exclude<WebsiteStabilityMilestone, 'starting'>
  nextTarget?: number
}

const EMPTY_COUNTS: Record<FindingPriority, number> = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0
}

/** Calculate a transparent absolute website level from a complete deterministic check. */
export function calculateWebsiteLevel(input: WebsiteLevelInput): WebsiteLevelResult {
  const counts = countOpenFindings(input.findings)
  const openCount = Object.values(counts).reduce((total, count) => total + count, 0)
  const eligible =
    input.auditStatus === 'succeeded' &&
    input.requestedPages > 0 &&
    input.checkedPages === input.requestedPages &&
    input.gate !== 'inconclusive' &&
    input.rulesetCurrent !== false

  if (!eligible)
    return {
      counts,
      eligible: false,
      level: 'unverified',
      openCount,
      requiredFixCount: 0
    }

  if (counts.critical > 0)
    return nextLevelResult(counts, openCount, 'needs_attention', 'bronze', 'critical')
  if (counts.high > 0) return nextLevelResult(counts, openCount, 'bronze', 'silver', 'high')
  if (counts.medium > 0) return nextLevelResult(counts, openCount, 'silver', 'gold', 'medium')
  if (counts.low > 0) return nextLevelResult(counts, openCount, 'gold', 'platinum', 'low')
  return {
    counts,
    eligible: true,
    level: 'platinum',
    openCount: 0,
    requiredFixCount: 0
  }
}

/** Count consecutive complete current-ruleset checks without a new important regression. */
export function calculateWebsiteStability(
  audits: WebsiteStabilityAudit[],
  currentRulesetVersion: string
): WebsiteStabilityResult {
  let checks = 0
  for (const audit of audits) {
    const complete =
      audit.status === 'succeeded' &&
      audit.requestedPages > 0 &&
      audit.checkedPages === audit.requestedPages &&
      audit.rulesetVersion === currentRulesetVersion
    if (!(complete && audit.blockingCount === 0)) break
    checks += 1
  }

  if (checks >= 30) return { checks, milestone: 'proven' }
  if (checks >= 10) return { checks, milestone: 'trusted', nextMilestone: 'proven', nextTarget: 30 }
  if (checks >= 3) return { checks, milestone: 'steady', nextMilestone: 'trusted', nextTarget: 10 }
  return { checks, milestone: 'starting', nextMilestone: 'steady', nextTarget: 3 }
}

/** Deduplicate page occurrences before counting the unresolved priority mix. */
function countOpenFindings(findings: WebsiteLevelFinding[]): Record<FindingPriority, number> {
  const counts = { ...EMPTY_COUNTS }
  const seen = new Set<string>()
  for (const finding of findings) {
    if (finding.status === 'resolved' || seen.has(finding.identity)) continue
    seen.add(finding.identity)
    counts[finding.priority] += 1
  }
  return counts
}

/** Build the progress contract for one non-final website level. */
function nextLevelResult(
  counts: Record<FindingPriority, number>,
  openCount: number,
  level: Exclude<WebsiteLevel, 'unverified' | 'platinum'>,
  nextLevel: Exclude<WebsiteLevel, 'unverified' | 'needs_attention'>,
  requiredPriority: FindingPriority
): WebsiteLevelResult {
  return {
    counts,
    eligible: true,
    level,
    nextLevel,
    openCount,
    requiredFixCount: counts[requiredPriority],
    requiredPriority
  }
}
