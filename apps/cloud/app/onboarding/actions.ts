'use server'

import { assertPublicHttpsUrl, getPlanEntitlements, type PlanId } from '@coderocket/core'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  const rawAudience = formData.get('audience')
  const audience =
    rawAudience === 'freelancer' || rawAudience === 'agency' ? rawAudience : 'site_owner'
  const pagePaths = String(formData.get('pages') ?? '/')
    .split('\n')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => (path.startsWith('/') ? path : `/${path}`))
    .filter((path, index, paths) => paths.indexOf(path) === index)
  if (name.length < 1 || name.length > 120) redirect('/onboarding?notice=invalid-project-name')
  try {
    await assertPublicHttpsUrl(url)
  } catch {
    redirect('/onboarding?notice=invalid-url')
  }
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login?next=/onboarding')
  await supabase.from('cr_profiles').update({ audience }).eq('id', auth.user.id)
  const { data: subscription } = await supabase
    .from('cr_subscriptions')
    .select('plan_id')
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  const plan: PlanId =
    subscription?.plan_id === 'solo' || subscription?.plan_id === 'agency'
      ? subscription.plan_id
      : 'free'
  const limits = getPlanEntitlements(plan)
  if (pagePaths.length < 1) redirect('/onboarding?notice=missing-pages')
  if (pagePaths.length > limits.pagesPerProject) redirect('/onboarding?notice=too-many-pages')
  const { count } = await supabase
    .from('cr_projects')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
  if ((count ?? 0) >= limits.projects) redirect('/onboarding?notice=project-limit')
  const { data, error } = await supabase
    .from('cr_projects')
    .insert({ owner_id: auth.user.id, name, production_url: url, page_paths: pagePaths })
    .select('id')
    .single()
  if (error) redirect('/onboarding?notice=create-failed')
  const { error: queueError } = await supabase.from('cr_jobs').insert({
    owner_id: auth.user.id,
    project_id: data.id,
    kind: 'audit',
    payload: { environment: 'production', trigger: 'manual' }
  })
  redirect(`/projects/${data.id}?notice=${queueError ? 'queue-failed' : 'site-created'}`)
}
