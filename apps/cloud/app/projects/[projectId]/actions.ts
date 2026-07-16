'use server'

import { getPlanEntitlements, type PlanId } from '@coderocket/core'
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
      .select('id')
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
      .in('status', ['queued', 'leased'])
  ])
  if (!project) redirect('/dashboard')
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
    payload: { environment: 'production', trigger: 'manual' }
  })
  redirect(`/projects/${projectId}?notice=${error ? 'queue-failed' : 'queued'}`)
}
