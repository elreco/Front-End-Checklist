import { randomUUID } from 'node:crypto'
import { createServiceClient } from '@coderocket/db'
import { JobCancelledError } from './job-cancellation'
import { log } from './log'
import { failSiteEditJob, processSiteEditJob } from './site-edit-job'
import { reportSiteEditProgress } from './site-edit-progress'
import { BrowserHandoffExpiredError, cleanupExpiredBuilderAccess } from './site-import-access'
import { failSiteImportJob, processSiteImportJob } from './site-import-job'
import { cleanupExpiredSiteImportArtifacts, reportSiteImportProgress } from './site-import-progress'
import type { WorkerJob } from './worker-job'

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

/** Refresh the worker signal used by the deployment readiness endpoint. */
async function heartbeat() {
  await createServiceClient()
    .from('cr_worker_heartbeats')
    .upsert({
      worker_id: workerId,
      process_version: process.env.FLY_IMAGE_REF ?? 'local',
      last_seen_at: new Date().toISOString()
    })
}

/** Route one leased builder job to its bounded implementation. */
async function handle(job: WorkerJob) {
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

/** Clean transient builder data, claim one job, and persist its terminal or retry state. */
async function tick() {
  const db = createServiceClient()
  await heartbeat()
  if (Date.now() - lastRetentionAt > 3_600_000) {
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
    } catch (caughtError) {
      if (!(await lease.stop())) continue
      if (caughtError instanceof JobCancelledError) {
        log('info', 'job.cancelled', { jobId: job.id, kind: job.kind })
        continue
      }
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown worker error'
      if (caughtError instanceof BrowserHandoffExpiredError && job.kind === 'site_import') {
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
      if (job.kind === 'site_import' && job.attempts < 3)
        await reportSiteImportProgress(typedJob, {
          eventKey: `retry-${job.attempts}`,
          kind: 'warning',
          message: `Trying again in ${delay} seconds`,
          progress: 8,
          stage: 'retrying',
          title: 'A temporary problem interrupted creation',
          detail:
            'Your request is safe. CodeRocket will try again automatically without using another website allowance.'
        })
      if (job.kind === 'site_edit') {
        try {
          await reportSiteEditProgress(typedJob, {
            current: job.attempts >= 3 ? 5 : 0,
            message:
              job.attempts >= 3
                ? 'This change could not be completed safely'
                : 'A temporary problem interrupted this attempt. Your request will continue automatically.',
            stage: job.attempts >= 3 ? 'completed' : 'retrying'
          })
        } catch (progressError) {
          if (progressError instanceof JobCancelledError) continue
          throw progressError
        }
      }
      await db.rpc('cr_retry_job', {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_error: message,
        p_delay_seconds: delay
      })
      if (job.kind === 'site_import' && job.attempts >= 3)
        await failSiteImportJob(typedJob, message)
      if (job.kind === 'site_edit' && job.attempts >= 3) await failSiteEditJob(typedJob, message)
      log('error', 'job.failed', { jobId: job.id, attempt: job.attempts, message })
    }
  }
}

/** Run the builder worker loop until the hosting platform requests a graceful stop. */
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
