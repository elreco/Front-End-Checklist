import { createServiceClient } from '@coderocket/db'
import { JobCancelledError } from './job-cancellation'
import type { WorkerJob } from './worker-job'

type SiteEditProgressStage =
  | 'starting'
  | 'comparing'
  | 'checking_pages'
  | 'saving'
  | 'retrying'
  | 'completed'

interface SiteEditProgress {
  current: number
  message: string
  stage: SiteEditProgressStage
}

/** Persist only stable owner-facing edit milestones on the job and its conversation request. */
export async function reportSiteEditProgress(
  job: WorkerJob,
  progress: SiteEditProgress
): Promise<void> {
  const db = createServiceClient()
  const now = new Date().toISOString()
  const { data, error } = await db
    .from('cr_jobs')
    .update({
      progress_stage: progress.stage,
      progress_current: progress.current,
      progress_total: 5,
      progress_message: progress.message,
      progress_updated_at: now
    })
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
    .eq('status', 'leased')
    .is('cancelled_at', null)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new JobCancelledError()

  const { error: messageError } = await db
    .from('cr_builder_messages')
    .update({
      progress_stage: progress.stage,
      progress_current: progress.current,
      progress_total: 5,
      progress_message: progress.message,
      progress_updated_at: now
    })
    .eq('job_id', job.id)
    .eq('owner_id', job.owner_id)
    .eq('role', 'user')
    .in('status', ['queued', 'working', 'completed'])
  if (messageError) throw new Error(messageError.message)
}
