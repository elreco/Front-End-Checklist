import { randomUUID } from 'node:crypto'
import { getPlanEntitlements, type PlanId } from '@coderocket/core'
import { createServiceClient } from '@coderocket/db'
import { failAiAnalysisJob, processAiAnalysisJob } from './ai-analysis-job'
import { processAiUsageJob } from './ai-usage-job'
import { processAuditJob, type WorkerJob } from './audit-job'
import { sendAlertEmail } from './email'
import { allowsEmailAlert, readEmailAlertKind } from './email-policy'
import { JobCancelledError } from './job-cancellation'
import { log } from './log'
import { failSiteEditJob, processSiteEditJob } from './site-edit-job'
import { BrowserHandoffExpiredError, cleanupExpiredBuilderAccess } from './site-import-access'
import { failSiteImportJob, processSiteImportJob } from './site-import-job'
import { cleanupExpiredSiteImportArtifacts, reportSiteImportProgress } from './site-import-progress'

const workerId = `fly-${process.env.FLY_MACHINE_ID ?? randomUUID()}`
const JOB_LEASE_RENEW_INTERVAL_MS = 15_000
let stopping = false
let lastRetentionAt = 0

process.on('SIGTERM', () => {
  stopping = true
  log('info', 'worker.stopping', { workerId })
})
process.on('SIGINT', () => {
  stopping = true
  log('info', 'worker.stopping', { workerId })
})

/** Refresh the worker lease signal used by operational health checks. */
async function heartbeat() {
  await createServiceClient()
    .from('cr_worker_heartbeats')
    .upsert({
      worker_id: workerId,
      process_version: process.env.FLY_IMAGE_REF ?? 'local',
      last_seen_at: new Date().toISOString()
    })
}

/** Deliver one queued alert only if the site's latest preferences still allow it. */
async function processEmail(job: WorkerJob) {
  const db = createServiceClient()
  const alertKind = readEmailAlertKind(job.payload.alertKind)
  if (job.project_id && alertKind) {
    const { data: project, error } = await db
      .from('cr_projects')
      .select('email_alerts_enabled,alert_on_new_problems,alert_on_check_failures')
      .eq('id', job.project_id)
      .eq('owner_id', job.owner_id)
      .is('archived_at', null)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (
      !project ||
      !allowsEmailAlert(
        {
          checkFailures: project.alert_on_check_failures,
          enabled: project.email_alerts_enabled,
          newProblems: project.alert_on_new_problems
        },
        alertKind
      )
    )
      return
  }
  const { data: user } = await db.auth.admin.getUserById(job.owner_id)
  if (!user.user?.email) throw new Error('Owner email is unavailable')
  const auditId = String(job.payload.auditId ?? '')
  await sendAlertEmail({
    to: user.user.email,
    project: String(job.payload.project ?? 'CodeRocket website'),
    headline: String(job.payload.headline ?? 'Website needs attention'),
    detail: String(job.payload.detail ?? 'Open CodeRocket to review this website check.'),
    runUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app'}/projects/${job.project_id ?? auditId}`
  })
}

/** Route one leased job to its bounded worker implementation. */
async function handle(job: WorkerJob) {
  if (job.payload.kind === 'email') return processEmail(job)
  if (job.payload.kind === 'audit') return processAuditJob(job)
  if (job.payload.kind === 'ai_analysis') return processAiAnalysisJob(job)
  if (job.payload.kind === 'ai_usage') return processAiUsageJob(job)
  if (job.payload.kind === 'site_import') return processSiteImportJob(job)
  if (job.payload.kind === 'site_edit') return processSiteEditJob(job)
  throw new Error(`Unsupported worker job kind: ${String(job.payload.kind)}`)
}

/** Keep one claimed job private to this worker until it finishes or the worker disappears. */
function startJobLeaseGuard(jobId: string): { stop: () => Promise<boolean> } {
  let active = true
  let stopped = false
  let timer: NodeJS.Timeout | undefined
  let renewal: Promise<void> | undefined
  let stopResult: Promise<boolean> | undefined

  /** Extend the database lease only while this worker still owns it. */
  const renew = async () => {
    const [{ data, error }] = await Promise.all([
      createServiceClient().rpc('cr_renew_job_lease', {
        p_job_id: jobId,
        p_worker_id: workerId
      }),
      heartbeat().catch(heartbeatError => {
        log('error', 'worker.heartbeat_failed', {
          message:
            heartbeatError instanceof Error ? heartbeatError.message : 'Unknown heartbeat error'
        })
      })
    ])
    if (!error && data === true) return
    active = false
    log('error', 'job.lease_lost', {
      jobId,
      message: error?.message ?? 'The job is now owned by another worker'
    })
  }

  /** Schedule a non-overlapping renewal while the job handler is still active. */
  const schedule = () => {
    timer = setTimeout(() => {
      renewal = renew().finally(() => {
        renewal = undefined
        if (active && !stopped) schedule()
      })
    }, JOB_LEASE_RENEW_INTERVAL_MS)
  }

  schedule()
  return {
    stop: () => {
      stopResult ??= (async () => {
        stopped = true
        if (timer) clearTimeout(timer)
        await renewal
        if (!active) return false
        await renew()
        return active
      })()
      return stopResult
    }
  }
}

/** Enqueue due work, claim one job, and persist its terminal or retry state. */
async function tick() {
  const db = createServiceClient()
  await heartbeat()
  await db.rpc('cr_enqueue_due_audits')
  if (Date.now() - lastRetentionAt > 3_600_000) {
    const { data: subscriptions } = await db.from('cr_subscriptions').select('owner_id,plan_id')
    for (const subscription of subscriptions ?? []) {
      const plan: PlanId =
        subscription.plan_id === 'solo' || subscription.plan_id === 'agency'
          ? subscription.plan_id
          : 'free'
      const cutoff = new Date(
        Date.now() - getPlanEntitlements(plan).retentionDays * 86_400_000
      ).toISOString()
      await db
        .from('cr_audits')
        .delete()
        .eq('owner_id', subscription.owner_id)
        .lt('created_at', cutoff)
    }
    await db
      .from('cr_idempotency_keys')
      .delete()
      .lt('created_at', new Date(Date.now() - 31 * 86_400_000).toISOString())
    await cleanupExpiredSiteImportArtifacts()
    await cleanupExpiredBuilderAccess(db)
    lastRetentionAt = Date.now()
  }
  const { data, error } = await db.rpc('cr_claim_jobs', { p_worker_id: workerId, p_limit: 1 })
  if (error) throw new Error(error.message)
  for (const job of data ?? []) {
    const typedJob: WorkerJob = {
      id: job.id,
      owner_id: job.owner_id,
      project_id: job.project_id,
      builder_site_id: job.builder_site_id,
      attempts: job.attempts,
      payload: { ...job.payload, kind: job.kind }
    }
    const lease = startJobLeaseGuard(job.id)
    try {
      await handle(typedJob)
      if (!(await lease.stop())) continue
      await db.rpc('cr_finish_job', { p_job_id: job.id, p_worker_id: workerId })
      log('info', 'job.succeeded', { jobId: job.id, kind: job.kind })
    } catch (error) {
      if (!(await lease.stop())) continue
      if (error instanceof JobCancelledError) {
        log('info', 'job.cancelled', { jobId: job.id, kind: job.kind })
        continue
      }
      const message = error instanceof Error ? error.message : 'Unknown worker error'
      if (error instanceof BrowserHandoffExpiredError && job.kind === 'site_import') {
        await failSiteImportJob(typedJob, message)
        await db
          .from('cr_jobs')
          .update({
            status: 'failed',
            last_error: message,
            lease_owner: null,
            lease_expires_at: null,
            progress_stage: 'completed',
            progress_message: 'The guided browser expired safely',
            progress_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
          .eq('lease_owner', workerId)
        log('info', 'job.guided_browser_expired', { jobId: job.id, kind: job.kind })
        continue
      }
      const delay = Math.min(300, 15 * 2 ** Math.max(0, job.attempts - 1))
      if (job.kind === 'audit')
        await db
          .from('cr_jobs')
          .update({
            progress_stage: 'retrying',
            progress_message:
              job.attempts >= 3
                ? 'The check could not finish after three attempts.'
                : `A temporary problem interrupted the check. Retrying in ${delay} seconds.`,
            progress_updated_at: new Date().toISOString()
          })
          .eq('id', job.id)
          .eq('lease_owner', workerId)
      if (job.kind === 'site_import' && job.attempts < 3)
        await reportSiteImportProgress(
          {
            id: job.id,
            owner_id: job.owner_id,
            project_id: job.project_id,
            builder_site_id: job.builder_site_id,
            attempts: job.attempts,
            payload: { ...job.payload, kind: job.kind }
          },
          {
            eventKey: `retry-${job.attempts}`,
            kind: 'warning',
            message: `Trying again in ${delay} seconds`,
            progress: 8,
            stage: 'retrying',
            title: 'A temporary problem interrupted creation',
            detail:
              'Your request is safe. CodeRocket will try again automatically without using another website allowance.'
          }
        )
      await db.rpc('cr_retry_job', {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_error: message,
        p_delay_seconds: delay
      })
      if (job.kind === 'ai_analysis' && job.attempts >= 3)
        await failAiAnalysisJob(
          {
            id: job.id,
            owner_id: job.owner_id,
            project_id: job.project_id,
            attempts: job.attempts,
            payload: { ...job.payload, kind: job.kind }
          },
          message
        )
      if (job.kind === 'site_import' && job.attempts >= 3)
        await failSiteImportJob(
          {
            id: job.id,
            owner_id: job.owner_id,
            project_id: job.project_id,
            builder_site_id: job.builder_site_id,
            attempts: job.attempts,
            payload: { ...job.payload, kind: job.kind }
          },
          message
        )
      if (job.kind === 'site_edit' && job.attempts >= 3)
        await failSiteEditJob(
          {
            id: job.id,
            owner_id: job.owner_id,
            project_id: job.project_id,
            builder_site_id: job.builder_site_id,
            attempts: job.attempts,
            payload: { ...job.payload, kind: job.kind }
          },
          message
        )
      if (job.kind === 'audit' && job.attempts >= 3) {
        const { data: project } = await db
          .from('cr_projects')
          .select('name,email_alerts_enabled,alert_on_new_problems,alert_on_check_failures')
          .eq('id', job.project_id)
          .maybeSingle()
        if (
          project &&
          allowsEmailAlert(
            {
              checkFailures: project.alert_on_check_failures,
              enabled: project.email_alerts_enabled,
              newProblems: project.alert_on_new_problems
            },
            'check_failures'
          )
        )
          await db.from('cr_jobs').insert({
            owner_id: job.owner_id,
            project_id: job.project_id,
            kind: 'email',
            payload: {
              alertKind: 'check_failures',
              project: project.name,
              headline: 'Website check failed repeatedly',
              detail:
                'CodeRocket could not complete this website check after three attempts. Open the site to inspect the last operational error.'
            }
          })
      }
      log('error', 'job.failed', { jobId: job.id, attempt: job.attempts, message })
    }
  }
}

/** Run the worker loop until the hosting platform requests a graceful stop. */
async function main() {
  log('info', 'worker.started', { workerId })
  while (!stopping) {
    try {
      await tick()
    } catch (error) {
      log('error', 'worker.tick_failed', {
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
    if (!stopping) await new Promise(resolve => setTimeout(resolve, 10_000))
  }
  log('info', 'worker.stopped', { workerId })
}

await main()
