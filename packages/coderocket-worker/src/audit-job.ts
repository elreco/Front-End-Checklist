import {
  type AuditFindingInput,
  auditPage,
  compareFindings,
  getRulesetVersion
} from '@coderocket/core'
import { createServiceClient } from '@coderocket/db'

export interface WorkerJob {
  id: string
  owner_id: string
  project_id: string | null
  attempts: number
  payload: Record<string, unknown>
}

/** Run a scheduled production audit and persist its regression diff. */
export async function processAuditJob(
  job: WorkerJob
): Promise<{ auditId: string; blocking: number }> {
  if (!job.project_id) throw new Error('Audit job has no project')
  const db = createServiceClient()
  const { data: project, error } = await db
    .from('cr_projects')
    .select('id,owner_id,name,production_url,page_paths')
    .eq('id', job.project_id)
    .is('archived_at', null)
    .single()
  if (error || !project) throw new Error('Project is unavailable')
  const pages = []
  for (const path of project.page_paths)
    pages.push(await auditPage(new URL(path, project.production_url).toString()))
  const version = getRulesetVersion()
  const { data: baselineAudit } = await db
    .from('cr_audits')
    .select('id,ruleset_version')
    .eq('project_id', project.id)
    .eq('environment', 'production')
    .eq('status', 'succeeded')
    .neq('gate_status', 'inconclusive')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data: recentAudits } = await db
    .from('cr_audits')
    .select('gate_status')
    .eq('project_id', project.id)
    .eq('environment', 'production')
    .order('created_at', { ascending: false })
    .limit(3)
  let baseline: AuditFindingInput[] = []
  if (baselineAudit) {
    const { data: occurrences } = await db
      .from('cr_occurrences')
      .select(
        'message,cr_findings(normalized_path,rule_slug,title,priority,category,source,occurrence_key)'
      )
      .eq('audit_id', baselineAudit.id)
      .neq('status', 'resolved')
    baseline = (occurrences ?? []).flatMap(occurrence =>
      occurrence.cr_findings.map(finding => ({
        pagePath: finding.normalized_path,
        ruleSlug: finding.rule_slug,
        title: finding.title,
        priority: finding.priority,
        message: occurrence.message,
        category: finding.category,
        source: finding.source,
        occurrenceKey: finding.occurrence_key
      }))
    )
  }
  const comparison = compareFindings({
    current: pages.flatMap(page => page.findings),
    baseline,
    currentRulesetVersion: version,
    baselineRulesetVersion: baselineAudit?.ruleset_version,
    unreachablePagePaths: pages
      .filter(page => !page.reachable)
      .map(page => new URL(page.url).pathname)
  })
  const trigger =
    job.payload.trigger === 'manual' || job.payload.trigger === 'ci'
      ? job.payload.trigger
      : 'scheduled'
  const now = new Date().toISOString()
  const { data: audit, error: auditError } = await db
    .from('cr_audits')
    .insert({
      owner_id: project.owner_id,
      project_id: project.id,
      environment: 'production',
      trigger,
      status: 'succeeded',
      gate_status: comparison.gate,
      ruleset_version: version,
      baseline_audit_id: baselineAudit?.id,
      new_count: comparison.counts.new,
      persistent_count: comparison.counts.persistent,
      resolved_count: comparison.counts.resolved,
      blocking_count: comparison.blockingRegressions,
      requested_page_count: pages.length,
      checked_page_count: pages.filter(page => page.reachable).length,
      started_at: now,
      completed_at: now
    })
    .select('id')
    .single()
  if (auditError) throw new Error(auditError.message)
  await db.from('cr_audit_pages').insert(
    pages.map(page => ({
      owner_id: project.owner_id,
      audit_id: audit.id,
      url: page.url,
      normalized_path: new URL(page.url).pathname,
      reachable: page.reachable,
      http_status: page.httpStatus,
      duration_ms: page.durationMs,
      error: page.error
    }))
  )
  for (const finding of comparison.findings) {
    const { data: existing } = await db
      .from('cr_findings')
      .select('id')
      .eq('project_id', project.id)
      .eq('fingerprint', finding.fingerprint)
      .maybeSingle()
    const findingValues = {
      normalized_path: finding.pagePath,
      rule_slug: finding.ruleSlug,
      title: finding.title,
      priority: finding.priority,
      category: finding.category ?? 'quality',
      source: finding.source ?? 'frontend_checklist',
      occurrence_key: finding.occurrenceKey ?? 'primary',
      last_seen_audit_id: audit.id,
      resolved_at: finding.status === 'resolved' ? now : null,
      updated_at: now
    }
    const { data: stored } = existing
      ? await db
          .from('cr_findings')
          .update(findingValues)
          .eq('id', existing.id)
          .select('id')
          .single()
      : await db
          .from('cr_findings')
          .insert({
            owner_id: project.owner_id,
            project_id: project.id,
            fingerprint: finding.fingerprint,
            first_seen_audit_id: audit.id,
            ...findingValues
          })
          .select('id')
          .single()
    if (stored)
      await db.from('cr_occurrences').insert({
        owner_id: project.owner_id,
        audit_id: audit.id,
        finding_id: stored.id,
        status: finding.status,
        message: finding.message
      })
  }
  if (comparison.blockingRegressions > 0)
    await db.from('cr_jobs').insert({
      owner_id: project.owner_id,
      project_id: project.id,
      kind: 'email',
      payload: {
        auditId: audit.id,
        project: project.name,
        headline: 'Your website needs attention',
        detail: `${comparison.blockingRegressions} new important ${comparison.blockingRegressions === 1 ? 'problem needs' : 'problems need'} attention.`
      }
    })
  const thirdConsecutiveIncompleteCheck =
    comparison.gate === 'inconclusive' &&
    recentAudits?.[0]?.gate_status === 'inconclusive' &&
    recentAudits?.[1]?.gate_status === 'inconclusive' &&
    recentAudits?.[2]?.gate_status !== 'inconclusive'
  if (thirdConsecutiveIncompleteCheck && comparison.blockingRegressions === 0)
    await db.from('cr_jobs').insert({
      owner_id: project.owner_id,
      project_id: project.id,
      kind: 'email',
      payload: {
        auditId: audit.id,
        project: project.name,
        headline: 'CodeRocket could not check your website',
        detail:
          'Three consecutive checks were incomplete. A page may be offline or blocking CodeRocket requests.'
      }
    })
  return { auditId: audit.id, blocking: comparison.blockingRegressions }
}
