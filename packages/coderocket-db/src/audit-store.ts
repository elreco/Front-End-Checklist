import {
  type AuditComparison,
  type AuditEnvironment,
  type AuditTrigger,
  normalizeAuditPath,
  type PageAuditResult
} from '@coderocket/core'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PersistAuditOptions {
  baselineAuditId?: string
  branch?: string
  commitSha?: string
  comparison: AuditComparison
  db: SupabaseClient
  environment: AuditEnvironment
  jobId?: string
  ownerId: string
  pages: PageAuditResult[]
  projectId: string
  pullRequest?: string
  rulesetVersion: string
  startedAt: string
  trigger: AuditTrigger
}

/** Persist an audit, its pages, findings, and occurrences in one PostgreSQL transaction. */
export async function persistAudit(options: PersistAuditOptions): Promise<string> {
  const { data, error } = await options.db.rpc('cr_persist_audit', {
    p_owner_id: options.ownerId,
    p_project_id: options.projectId,
    p_job_id: options.jobId ?? null,
    p_environment: options.environment,
    p_trigger: options.trigger,
    p_ruleset_version: options.rulesetVersion,
    p_baseline_audit_id: options.baselineAuditId ?? null,
    p_commit_sha: options.commitSha ?? null,
    p_branch: options.branch ?? null,
    p_pull_request: options.pullRequest ?? null,
    p_gate: options.comparison.gate,
    p_started_at: options.startedAt,
    p_pages: options.pages.map(page => ({
      url: page.url,
      normalized_path: normalizeAuditPath(new URL(page.url).pathname),
      reachable: page.reachable,
      http_status: page.httpStatus ?? null,
      duration_ms: page.durationMs ?? null,
      final_url: page.finalUrl ?? null,
      document_proof: page.document ?? {},
      error: page.error ?? null
    })),
    p_findings: options.comparison.findings.map(finding => ({
      fingerprint: finding.fingerprint,
      normalized_path: finding.pagePath,
      rule_slug: finding.ruleSlug,
      title: finding.title,
      priority: finding.priority,
      category: finding.category ?? 'quality',
      source: finding.source ?? 'frontend_checklist',
      occurrence_key: finding.occurrenceKey ?? 'primary',
      status: finding.status,
      message: finding.message,
      evidence: finding.evidence ?? {}
    }))
  })
  if (error) throw new Error(error.message)
  if (typeof data !== 'string') throw new Error('Audit persistence returned an invalid identifier')
  return data
}
