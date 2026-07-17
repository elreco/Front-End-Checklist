import { createServiceClient } from '@coderocket/db'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Return owner-scoped website check progress plus worker availability. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('cr_projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const jobId = new URL(request.url).searchParams.get('job')
  let jobQuery = supabase
    .from('cr_jobs')
    .select(
      'id,status,attempts,progress_stage,progress_current,progress_total,progress_message,progress_updated_at,created_at,last_error,cancelled_at'
    )
    .eq('owner_id', auth.user.id)
    .eq('project_id', projectId)
    .eq('kind', 'audit')
  jobQuery = jobId
    ? jobQuery.eq('id', jobId)
    : jobQuery.order('created_at', { ascending: false }).limit(1)
  const { data: job } = await jobQuery.maybeSingle()

  const { data: heartbeat } = await createServiceClient()
    .from('cr_worker_heartbeats')
    .select('last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const workerAvailable = heartbeat?.last_seen_at
    ? Date.now() - new Date(heartbeat.last_seen_at).getTime() < 30_000
    : false

  return Response.json(
    job
      ? {
          id: job.id,
          status: job.cancelled_at ? 'cancelled' : job.status,
          stage: job.progress_stage,
          current: job.progress_current,
          total: job.progress_total,
          message: job.progress_message,
          attempts: job.attempts,
          createdAt: job.created_at,
          updatedAt: job.progress_updated_at,
          workerAvailable,
          failed: job.status === 'failed' || Boolean(job.last_error && job.attempts >= 3)
        }
      : { status: 'idle', workerAvailable },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}

/** Stop an owner-scoped website check before its result starts saving. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase
    .from('cr_projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  const jobId = new URL(request.url).searchParams.get('job')
  if (!jobId) return Response.json({ error: 'A check id is required' }, { status: 400 })

  const stoppedAt = new Date().toISOString()
  const service = createServiceClient()
  const { data: cancelledJob, error } = await service
    .from('cr_jobs')
    .update({
      status: 'failed',
      cancelled_at: stoppedAt,
      cancelled_by: auth.user.id,
      completed_at: stoppedAt,
      lease_owner: null,
      lease_expires_at: null,
      last_error: null,
      progress_stage: 'completed',
      progress_message: 'Check cancelled by you.',
      progress_updated_at: stoppedAt
    })
    .eq('id', jobId)
    .eq('owner_id', auth.user.id)
    .eq('project_id', projectId)
    .eq('kind', 'audit')
    .in('status', ['queued', 'leased'])
    .in('progress_stage', ['queued', 'starting', 'checking_pages', 'comparing', 'retrying'])
    .is('cancelled_at', null)
    .select('id,cancelled_at')
    .maybeSingle()
  if (error)
    return Response.json({ error: 'The website check could not be cancelled' }, { status: 500 })
  if (cancelledJob)
    return Response.json(
      { id: cancelledJob.id, status: 'cancelled', cancelledAt: cancelledJob.cancelled_at },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )

  const { data: existingJob } = await service
    .from('cr_jobs')
    .select('id,status,progress_stage,cancelled_at')
    .eq('id', jobId)
    .eq('owner_id', auth.user.id)
    .eq('project_id', projectId)
    .eq('kind', 'audit')
    .maybeSingle()
  if (!existingJob) return Response.json({ error: 'Check not found' }, { status: 404 })
  if (existingJob.cancelled_at)
    return Response.json(
      { id: existingJob.id, status: 'cancelled', cancelledAt: existingJob.cancelled_at },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )

  const message =
    existingJob.progress_stage === 'saving' || existingJob.progress_stage === 'completed'
      ? 'This check is already saving its result and can no longer be cancelled.'
      : 'This check has already finished.'
  return Response.json({ error: message }, { status: 409 })
}
