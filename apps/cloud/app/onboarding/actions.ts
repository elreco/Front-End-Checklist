'use server'

import {
  assertPublicHttpsUrl,
  getPlanEntitlements,
  normalizeProjectPagePaths,
  type PlanId,
  type SiteAccessMode
} from '@coderocket/core'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const url = String(formData.get('url') ?? '').trim()
  const accessMode = resolveAccessMode(formData.get('accessMode'))
  const rawPagePaths = String(formData.get('pages') ?? '/')
    .split('\n')
    .map(path => path.trim())
    .filter(Boolean)
  if (name.length < 1 || name.length > 120) redirect('/onboarding?notice=invalid-project-name')
  let productionUrl: string
  try {
    productionUrl = (await assertPublicHttpsUrl(url)).origin
  } catch {
    redirect('/onboarding?notice=invalid-url')
  }
  let pagePaths: string[]
  try {
    pagePaths = normalizeProjectPagePaths(rawPagePaths)
  } catch {
    redirect('/onboarding?notice=invalid-pages')
  }
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
  if (pagePaths.length < 1) redirect('/onboarding?notice=missing-pages')
  if (pagePaths.length > limits.pagesPerProject) redirect('/onboarding?notice=too-many-pages')
  const { count } = await supabase
    .from('cr_projects')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
  if ((count ?? 0) >= limits.projects) redirect('/onboarding?notice=project-limit')
  const nextAuditAt = new Date(
    Date.now() + (limits.schedule === 'weekly' ? 7 : 1) * 86_400_000
  ).toISOString()
  const { data, error } = await supabase
    .from('cr_projects')
    .insert({
      owner_id: auth.user.id,
      name,
      production_url: productionUrl,
      page_paths: pagePaths,
      access_mode: accessMode,
      schedule_enabled: accessMode !== 'private',
      next_audit_at: nextAuditAt
    })
    .select('id')
    .single()
  if (error) redirect('/onboarding?notice=create-failed')
  if (accessMode === 'private') redirect(`/projects/${data.id}?notice=private-site-created`)
  const { error: queueError } = await supabase.from('cr_jobs').insert({
    owner_id: auth.user.id,
    project_id: data.id,
    kind: 'audit',
    payload: { environment: 'production', trigger: 'manual' },
    progress_stage: 'queued',
    progress_current: 0,
    progress_total: pagePaths.length,
    progress_message: 'Waiting for the website checking service',
    progress_updated_at: new Date().toISOString()
  })
  const successNotice = accessMode === 'protected' ? 'protected-site-created' : 'site-created'
  redirect(`/projects/${data.id}?notice=${queueError ? 'queue-failed' : successNotice}`)
}

function resolveAccessMode(value: FormDataEntryValue | null): SiteAccessMode {
  return value === 'protected' || value === 'private' ? value : 'public'
}
