'use server'

import { assertPublicHttpsUrl, getPlanEntitlements, type PlanId } from '@coderocket/core'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  const pagePaths = String(formData.get('pages') ?? '/')
    .split('\n')
    .map(path => path.trim())
    .filter(Boolean)
    .map(path => (path.startsWith('/') ? path : `/${path}`))
    .filter((path, index, paths) => paths.indexOf(path) === index)
  if (name.length < 1 || name.length > 120) throw new Error('Project name is required')
  await assertPublicHttpsUrl(url)
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login?next=/onboarding')
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
  if (pagePaths.length < 1) throw new Error('Add at least one page to monitor')
  if (pagePaths.length > limits.pagesPerProject)
    throw new Error(`${plan} supports ${limits.pagesPerProject} pages per project`)
  const { count } = await supabase
    .from('cr_projects')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
  if ((count ?? 0) >= limits.projects)
    throw new Error(`${plan} supports ${limits.projects} active projects`)
  const { data, error } = await supabase
    .from('cr_projects')
    .insert({ owner_id: auth.user.id, name, production_url: url, page_paths: pagePaths })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  await supabase.from('cr_jobs').insert({
    owner_id: auth.user.id,
    project_id: data.id,
    kind: 'audit',
    payload: { environment: 'production', trigger: 'manual' }
  })
  redirect(`/projects/${data.id}`)
}
