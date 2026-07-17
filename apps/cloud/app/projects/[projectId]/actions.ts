'use server'

import { getPlanEntitlements, type PlanId } from '@coderocket/core'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Queue an owner-authorized, quota-checked manual website audit. */
export async function queueProjectAudit(projectId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/projects/${projectId}`)
  const [{ data: project }, { data: subscription }, { count: pending }] = await Promise.all([
    supabase
      .from('cr_projects')
      .select('id,page_paths,access_mode')
      .eq('id', projectId)
      .eq('owner_id', auth.user.id)
      .is('archived_at', null)
      .maybeSingle(),
    supabase.from('cr_subscriptions').select('plan_id').eq('owner_id', auth.user.id).maybeSingle(),
    supabase
      .from('cr_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.user.id)
      .eq('project_id', projectId)
      .eq('kind', 'audit')
      .in('status', ['queued', 'leased'])
  ])
  if (!project) redirect('/dashboard')
  if (project.access_mode === 'private')
    redirect(`/projects/${projectId}?notice=private-runner-required`)
  if ((pending ?? 0) > 0) redirect(`/projects/${projectId}?notice=already-running`)
  const plan: PlanId =
    subscription?.plan_id === 'solo' || subscription?.plan_id === 'agency'
      ? subscription.plan_id
      : 'free'
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const { count: runs } = await supabase
    .from('cr_audits')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .in('trigger', ['manual', 'ci'])
    .gte('created_at', monthStart.toISOString())
  if ((runs ?? 0) >= getPlanEntitlements(plan).onDemandRunsPerMonth)
    redirect(`/projects/${projectId}?notice=limit-reached`)
  const { error } = await supabase.from('cr_jobs').insert({
    owner_id: auth.user.id,
    project_id: projectId,
    kind: 'audit',
    payload: { environment: 'production', trigger: 'manual' },
    progress_stage: 'queued',
    progress_current: 0,
    progress_total: project.page_paths.length,
    progress_message: 'Waiting for the website checking service',
    progress_updated_at: new Date().toISOString()
  })
  redirect(`/projects/${projectId}?notice=${error ? 'queue-failed' : 'queued'}`)
}

/** Update the review state for one or more owner-scoped findings. */
export async function updateFindingWorkflow(projectId: string, formData: FormData) {
  const requestedStatus = formData.get('status')
  const status =
    requestedStatus === 'acknowledged' || requestedStatus === 'muted' ? requestedStatus : 'open'
  const findingIds = formData
    .getAll('findingId')
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .slice(0, 100)
  if (findingIds.length === 0) redirect(`/projects/${projectId}?notice=workflow-failed`)

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/projects/${projectId}`)
  const { error } = await supabase
    .from('cr_findings')
    .update({
      workflow_status: status,
      workflow_updated_at: new Date().toISOString()
    })
    .eq('project_id', projectId)
    .eq('owner_id', auth.user.id)
    .in('id', findingIds)

  revalidatePath(`/projects/${projectId}`)
  redirect(`/projects/${projectId}?notice=${error ? 'workflow-failed' : `workflow-${status}`}`)
}
