import { createHash } from 'node:crypto'
import type {
  AuditStatus,
  FindingCategory,
  FindingPriority,
  FindingStatus,
  GateStatus
} from '@coderocket/core'
import { calculateWebsiteLevel, type WebsiteLevelResult } from '@coderocket/core/website-level'
import { createServiceClient } from '@coderocket/db'
import { cache } from 'react'
import { firstRelation, normalizeRelation } from './supabase/relations'

export interface SharedReportFinding {
  category: FindingCategory
  findingId: string
  id: string
  message: string
  path: string
  priority: FindingPriority
  status: FindingStatus
  title: string
}

export interface SharedWebsiteReport {
  audit: {
    checkedPages: number
    completedAt?: string
    gate: GateStatus
    id: string
    newCount: number
    persistentCount: number
    requestedPages: number
    resolvedCount: number
    rulesetVersion: string
    status: AuditStatus
  }
  expiresAt?: string
  findings: SharedReportFinding[]
  level: WebsiteLevelResult
  project: {
    name: string
    url: string
  }
}

/** Load one valid shared audit snapshot and calculate its transparent website level. */
export const getSharedReport = cache(async (token: string): Promise<SharedWebsiteReport | null> => {
  if (token.length < 32) return null
  const db = createServiceClient()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data: link } = await db
    .from('cr_share_links')
    .select('audit_id,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (
    !link ||
    link.revoked_at ||
    (link.expires_at && new Date(link.expires_at).getTime() <= Date.now())
  )
    return null

  const { data: audit } = await db
    .from('cr_audits')
    .select(
      'id,status,gate_status,ruleset_version,new_count,persistent_count,resolved_count,requested_page_count,checked_page_count,completed_at,cr_projects(name,production_url)'
    )
    .eq('id', link.audit_id)
    .maybeSingle()
  if (!audit) return null

  const { data: occurrences } = await db
    .from('cr_occurrences')
    .select('id,status,message,cr_findings(id,title,priority,normalized_path,category)')
    .eq('audit_id', audit.id)
    .limit(100)
  const findings: SharedReportFinding[] = (occurrences ?? []).flatMap(occurrence =>
    normalizeRelation(occurrence.cr_findings).map(finding => ({
      id: `${occurrence.id}-${finding.id}`,
      findingId: finding.id,
      title: finding.title,
      message: occurrence.message,
      path: finding.normalized_path,
      priority: resolvePriority(finding.priority),
      category: resolveCategory(finding.category),
      status: resolveFindingStatus(occurrence.status)
    }))
  )
  const project = firstRelation(audit.cr_projects)
  const status = resolveAuditStatus(audit.status)
  const gate = resolveGate(audit.gate_status)
  const checkedPages = audit.checked_page_count ?? 0
  const requestedPages = audit.requested_page_count ?? 0
  const level = calculateWebsiteLevel({
    auditStatus: status,
    checkedPages,
    requestedPages,
    gate,
    rulesetCurrent: true,
    findings: findings.map(finding => ({
      identity: finding.findingId,
      priority: finding.priority,
      status: finding.status
    }))
  })

  return {
    audit: {
      id: audit.id,
      status,
      gate,
      rulesetVersion: audit.ruleset_version,
      newCount: audit.new_count,
      persistentCount: audit.persistent_count,
      resolvedCount: audit.resolved_count,
      requestedPages,
      checkedPages,
      completedAt: audit.completed_at ?? undefined
    },
    expiresAt: link.expires_at ?? undefined,
    findings,
    level,
    project: {
      name: project?.name ?? 'Website health report',
      url: project?.production_url ?? ''
    }
  }
})

/** Normalize an audit state read through the untyped worker client. */
function resolveAuditStatus(value: unknown): AuditStatus {
  return value === 'queued' || value === 'running' || value === 'succeeded' ? value : 'failed'
}

/** Normalize a stored regression state. */
function resolveFindingStatus(value: unknown): FindingStatus {
  return value === 'persistent' || value === 'resolved' ? value : 'new'
}

/** Normalize the public finding priority contract. */
function resolvePriority(value: unknown): FindingPriority {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'critical'
}

/** Normalize categories while preserving the public report vocabulary. */
function resolveCategory(value: unknown): FindingCategory {
  return value === 'availability' ||
    value === 'search' ||
    value === 'accessibility' ||
    value === 'performance' ||
    value === 'security'
    ? value
    : 'quality'
}

/** Normalize the stored quality gate contract. */
function resolveGate(value: unknown): GateStatus {
  return value === 'passed' || value === 'failed' || value === 'inconclusive'
    ? value
    : 'needs_baseline'
}
