import {
  type AuditFindingInput,
  auditPage,
  auditSiteInfrastructure,
  buildProjectPageUrl,
  type CheckProgressStage,
  compareFindings,
  getRulesetVersion,
  type PageAuditResult
} from '@coderocket/core'
import { createServiceClient, persistAudit } from '@coderocket/db'

const PAGE_CONCURRENCY = 4

export interface WorkerJob {
  id: string
  owner_id: string
  project_id: string | null
  attempts: number
  payload: Record<string, unknown>
}

/** Signal that an owner stopped a job while the worker was processing it. */
export class JobCancelledError extends Error {
  constructor() {
    super('Audit job was cancelled by its owner')
    this.name = 'JobCancelledError'
  }
}

/** Persist owner-visible job progress while refusing work cancelled during execution. */
async function updateProgress(
  job: WorkerJob,
  progress: {
    current: number
    message: string
    stage: CheckProgressStage
    total: number
  }
) {
  const { data, error } = await createServiceClient()
    .from('cr_jobs')
    .update({
      progress_stage: progress.stage,
      progress_current: progress.current,
      progress_total: progress.total,
      progress_message: progress.message,
      progress_updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
    .eq('status', 'leased')
    .is('cancelled_at', null)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new JobCancelledError()
}

/** Audit configured pages in bounded concurrent batches with durable progress updates. */
async function auditProjectPages(job: WorkerJob, urls: string[]): Promise<PageAuditResult[]> {
  const pages: PageAuditResult[] = []
  for (let offset = 0; offset < urls.length; offset += PAGE_CONCURRENCY) {
    const batch = urls.slice(offset, offset + PAGE_CONCURRENCY)
    const pageNames = batch.map(url => new URL(url).pathname).join(', ')
    await updateProgress(job, {
      stage: 'checking_pages',
      current: pages.length,
      total: urls.length,
      message: `Checking ${pageNames}`
    })
    pages.push(...(await Promise.all(batch.map(url => auditPage(url)))))
    await updateProgress(job, {
      stage: 'checking_pages',
      current: pages.length,
      total: urls.length,
      message: `${pages.length} of ${urls.length} pages checked`
    })
  }
  return pages
}

/** Run a scheduled production audit and persist its regression diff. */
export async function processAuditJob(
  job: WorkerJob
): Promise<{ auditId: string; blocking: number }> {
  if (!job.project_id) throw new Error('Audit job has no project')
  const startedAt = new Date().toISOString()
  const db = createServiceClient()
  const { data: completedAudit, error: completedAuditError } = await db
    .from('cr_audits')
    .select('id,blocking_count')
    .eq('job_id', job.id)
    .maybeSingle()
  if (completedAuditError) throw new Error(completedAuditError.message)
  if (completedAudit) {
    await updateProgress(job, {
      stage: 'completed',
      current: 0,
      total: 0,
      message: 'Check complete. Updating your dashboard…'
    })
    return { auditId: completedAudit.id, blocking: completedAudit.blocking_count }
  }

  const { data: project, error } = await db
    .from('cr_projects')
    .select('id,owner_id,name,production_url,page_paths,baseline_reset_at')
    .eq('id', job.project_id)
    .eq('owner_id', job.owner_id)
    .is('archived_at', null)
    .single()
  if (error || !project) throw new Error('Project is unavailable')
  const pageUrls = project.page_paths.map((path: string) =>
    buildProjectPageUrl(project.production_url, path)
  )
  await updateProgress(job, {
    stage: 'starting',
    current: 0,
    total: pageUrls.length,
    message: 'Preparing a safe connection to your website'
  })
  const pages = await auditProjectPages(job, pageUrls)
  await updateProgress(job, {
    stage: 'checking_pages',
    current: pages.length,
    total: pages.length,
    message: 'Checking how search engines can read the website'
  })
  const infrastructureFindings = await auditSiteInfrastructure(project.production_url)
  if (pages[0]) pages[0].findings.push(...infrastructureFindings)
  await updateProgress(job, {
    stage: 'comparing',
    current: pages.length,
    total: pages.length,
    message: 'Looking for changes since the previous complete check'
  })
  const version = getRulesetVersion()
  let baselineQuery = db
    .from('cr_audits')
    .select('id,ruleset_version')
    .eq('project_id', project.id)
    .eq('environment', 'production')
    .eq('status', 'succeeded')
    .neq('gate_status', 'inconclusive')
    .order('created_at', { ascending: false })
    .limit(1)
  if (project.baseline_reset_at)
    baselineQuery = baselineQuery.gte('created_at', project.baseline_reset_at)
  const { data: baselineAudit, error: baselineAuditError } = await baselineQuery.maybeSingle()
  if (baselineAuditError) throw new Error(baselineAuditError.message)
  let recentAuditsQuery = db
    .from('cr_audits')
    .select('gate_status')
    .eq('project_id', project.id)
    .eq('environment', 'production')
    .order('created_at', { ascending: false })
    .limit(3)
  if (project.baseline_reset_at)
    recentAuditsQuery = recentAuditsQuery.gte('created_at', project.baseline_reset_at)
  const { data: recentAudits, error: recentAuditsError } = await recentAuditsQuery
  if (recentAuditsError) throw new Error(recentAuditsError.message)
  let baseline: AuditFindingInput[] = []
  if (baselineAudit) {
    const { data: occurrences, error: occurrencesError } = await db
      .from('cr_occurrences')
      .select(
        'message,cr_findings(normalized_path,rule_slug,title,priority,category,source,occurrence_key)'
      )
      .eq('audit_id', baselineAudit.id)
      .neq('status', 'resolved')
    if (occurrencesError) throw new Error(occurrencesError.message)
    baseline = (occurrences ?? []).flatMap(occurrence => {
      const relatedFindings = Array.isArray(occurrence.cr_findings)
        ? occurrence.cr_findings
        : [occurrence.cr_findings]
      return relatedFindings.flatMap(finding =>
        finding
          ? [
              {
                pagePath: finding.normalized_path,
                ruleSlug: finding.rule_slug,
                title: finding.title,
                priority: finding.priority,
                message: occurrence.message,
                category: finding.category,
                source: finding.source,
                occurrenceKey: finding.occurrence_key
              }
            ]
          : []
      )
    })
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
  await updateProgress(job, {
    stage: 'saving',
    current: pages.length,
    total: pages.length,
    message: 'Updating your dashboard with the new result'
  })
  const auditId = await persistAudit({
    db,
    ownerId: project.owner_id,
    projectId: project.id,
    jobId: job.id,
    environment: 'production',
    trigger,
    rulesetVersion: version,
    baselineAuditId: baselineAudit?.id,
    comparison,
    pages,
    startedAt
  })
  if (comparison.gate === 'failed' && comparison.blockingRegressions > 0)
    await db.from('cr_jobs').insert({
      owner_id: project.owner_id,
      project_id: project.id,
      kind: 'email',
      payload: {
        auditId,
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
        auditId,
        project: project.name,
        headline: 'CodeRocket could not check your website',
        detail:
          'Three consecutive checks were incomplete. A page may be offline or blocking CodeRocket requests.'
      }
    })
  await updateProgress(job, {
    stage: 'completed',
    current: pages.length,
    total: pages.length,
    message: 'Check complete. Updating your dashboard…'
  })
  return { auditId, blocking: comparison.blockingRegressions }
}
