import { randomUUID } from 'node:crypto'
import { getPlanEntitlements, type PlanId } from '@coderocket/core'
import { createServiceClient } from '@coderocket/db'
import { failAiAnalysisJob, processAiAnalysisJob } from './ai-analysis-job'
import { JobCancelledError, processAuditJob, type WorkerJob } from './audit-job'
import { sendAlertEmail } from './email'
import { log } from './log'

const workerId = `fly-${process.env.FLY_MACHINE_ID ?? randomUUID()}`
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

async function heartbeat() {
  await createServiceClient()
    .from('cr_worker_heartbeats')
    .upsert({
      worker_id: workerId,
      process_version: process.env.FLY_IMAGE_REF ?? 'local',
      last_seen_at: new Date().toISOString()
    })
}

async function processEmail(job: WorkerJob) {
  const db = createServiceClient()
  const { data: user } = await db.auth.admin.getUserById(job.owner_id)
  if (!user.user?.email) throw new Error('Owner email is unavailable')
  const auditId = String(job.payload.auditId ?? '')
  await sendAlertEmail({
    to: user.user.email,
    project: String(job.payload.project ?? 'CodeRocket website'),
    headline: String(job.payload.headline ?? 'Website needs attention'),
    detail: String(job.payload.detail ?? 'Open CodeRocket to review this website check.'),
    runUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coderocket.app'}/projects/${job.project_id ?? auditId}`
  })
}

async function handle(job: WorkerJob) {
  if (job.payload.kind === 'email') return processEmail(job)
  if (job.payload.kind === 'audit') return processAuditJob(job)
  if (job.payload.kind === 'ai_analysis') return processAiAnalysisJob(job)
  throw new Error(`Unsupported worker job kind: ${String(job.payload.kind)}`)
}

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
    lastRetentionAt = Date.now()
  }
  const { data, error } = await db.rpc('cr_claim_jobs', { p_worker_id: workerId, p_limit: 1 })
  if (error) throw new Error(error.message)
  for (const job of data ?? []) {
    try {
      const typedJob: WorkerJob = {
        id: job.id,
        owner_id: job.owner_id,
        project_id: job.project_id,
        attempts: job.attempts,
        payload: { ...job.payload, kind: job.kind }
      }
      await handle(typedJob)
      await db.rpc('cr_finish_job', { p_job_id: job.id, p_worker_id: workerId })
      log('info', 'job.succeeded', { jobId: job.id, kind: job.kind })
    } catch (error) {
      if (error instanceof JobCancelledError) {
        log('info', 'job.cancelled', { jobId: job.id, kind: job.kind })
        continue
      }
      const message = error instanceof Error ? error.message : 'Unknown worker error'
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
      if (job.kind === 'audit' && job.attempts >= 3) {
        const { data: project } = await db
          .from('cr_projects')
          .select('name')
          .eq('id', job.project_id)
          .maybeSingle()
        await db.from('cr_jobs').insert({
          owner_id: job.owner_id,
          project_id: job.project_id,
          kind: 'email',
          payload: {
            project: project?.name ?? 'CodeRocket website',
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
