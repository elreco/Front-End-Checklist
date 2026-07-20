'use server'

import { assertPublicHttpsUrl } from '@coderocket/core'
import {
  readBrowserHandoffCredential,
  writeBrowserHandoffCredential
} from '@coderocket/core/browser-handoff'
import { writeBrowserLoginCredential } from '@coderocket/core/browser-login'
import { createServiceClient, decryptAccessHeaders, encryptAccessHeaders } from '@coderocket/db'
import { redirect } from 'next/navigation'
import {
  closeBrowserHandoff,
  createBrowserHandoff,
  estimateBrowserHandoffCostMicroeur
} from '@/lib/browser-handoff'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Connect a short-lived demo account and retry one authorised private-app recreation. */
export async function connectBuilderTestAccount(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const confirmed = formData.get('safeAccount') === 'confirmed'
  if (!siteId) redirect('/websites')
  if (!confirmed || !username || username.length > 1024 || !password || password.length > 4096)
    redirect(`/studio/${siteId}?notice=invalid-test-account`)
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data: site } = await supabase
    .from('cr_builder_sites')
    .select('source_url,status')
    .eq('id', siteId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (site?.status !== 'failed') redirect(`/studio/${siteId}?notice=private-access-failed`)
  let privatePage: URL
  let loginPage: URL
  try {
    privatePage = await assertPublicHttpsUrl(String(formData.get('privatePage') ?? '').trim())
    loginPage = await assertPublicHttpsUrl(String(formData.get('loginPage') ?? '').trim())
    const siteOrigin = new URL(site.source_url).origin
    if (privatePage.origin !== siteOrigin || loginPage.origin !== siteOrigin)
      throw new Error('The pages belong to another website')
  } catch {
    redirect(`/studio/${siteId}?notice=invalid-private-pages`)
  }
  let encryptedCredentials: string
  try {
    encryptedCredentials = encryptAccessHeaders(
      writeBrowserLoginCredential({
        loginUrl: loginPage.toString(),
        password,
        username
      })
    )
  } catch {
    redirect(`/studio/${siteId}?notice=private-access-unavailable`)
  }
  const { error } = await supabase.rpc('cr_connect_builder_test_account', {
    p_encrypted_credentials: encryptedCredentials,
    p_site_id: siteId,
    p_source_url: privatePage.toString()
  })
  const notice = error
    ? error.message.includes('budget')
      ? 'monthly-limit'
      : 'private-access-failed'
    : 'private-access-started'
  redirect(`/studio/${siteId}?notice=${notice}`)
}

/** Open a short-lived remote browser that the owner can control before the worker resumes. */
export async function startBuilderBrowserHandoff(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const confirmed = formData.get('authorisedAccess') === 'confirmed'
  if (!siteId) redirect('/websites')
  if (!confirmed) redirect(`/studio/${siteId}?notice=confirm-authorised-access`)
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data: site } = await supabase
    .from('cr_builder_sites')
    .select('source_url,source_mode,status')
    .eq('id', siteId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (site?.status !== 'failed' || site.source_mode !== 'owned')
    redirect(`/studio/${siteId}?notice=secure-browser-unavailable`)
  let target: URL
  try {
    target = await assertPublicHttpsUrl(String(formData.get('targetPage') ?? '').trim())
    if (target.origin !== new URL(site.source_url).origin)
      throw new Error('The page belongs to another website')
  } catch {
    redirect(`/studio/${siteId}?notice=invalid-private-pages`)
  }
  let prepared: Awaited<ReturnType<typeof prepareBrowserHandoff>>
  try {
    prepared = await prepareBrowserHandoff(target.toString())
  } catch {
    redirect(`/studio/${siteId}?notice=secure-browser-failed`)
  }
  const { error } = await supabase.rpc('cr_begin_builder_browser_handoff', {
    p_encrypted_session: prepared.encryptedSession,
    p_expires_at: prepared.created.expiresAt,
    p_site_id: siteId,
    p_target_url: target.toString()
  })
  if (error) {
    await closeBrowserHandoff(prepared.created.credential).catch(() => undefined)
    const notice = error.message.includes('budget') ? 'monthly-limit' : 'secure-browser-failed'
    redirect(`/studio/${siteId}?notice=${notice}`)
  }
  redirect(`/studio/${siteId}?notice=secure-browser-ready`)
}

/** Encrypt the detached provider session and close it immediately if encryption cannot complete. */
async function prepareBrowserHandoff(targetUrl: string) {
  const created = await createBrowserHandoff(targetUrl)
  try {
    return {
      created,
      encryptedSession: encryptAccessHeaders(writeBrowserHandoffCredential(created.credential))
    }
  } catch (error) {
    await closeBrowserHandoff(created.credential).catch(() => undefined)
    throw error
  }
}

/** Release one confirmed handoff job only after the owner says the protected page is open. */
export async function confirmBuilderBrowserHandoff(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { error } = await supabase.rpc('cr_confirm_builder_browser_handoff', {
    p_site_id: siteId
  })
  redirect(
    `/studio/${siteId}?notice=${error ? 'secure-browser-expired' : 'secure-browser-continued'}`
  )
}

/** Stop one owner-controlled browser immediately and return the unused import reservation. */
export async function cancelBuilderBrowserHandoff(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data: handoff } = await supabase
    .from('cr_builder_browser_handoffs')
    .select('encrypted_session,status')
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  if (!(handoff?.encrypted_session && handoff.status === 'ready'))
    redirect(`/studio/${siteId}?notice=secure-browser-stop-failed`)
  let credential: ReturnType<typeof readBrowserHandoffCredential>
  try {
    credential = readBrowserHandoffCredential(decryptAccessHeaders(handoff.encrypted_session))
  } catch {
    redirect(`/studio/${siteId}?notice=secure-browser-stop-failed`)
  }
  if (!credential) redirect(`/studio/${siteId}?notice=secure-browser-stop-failed`)
  const { error } = await createServiceClient().rpc('cr_cancel_builder_browser_handoff', {
    p_owner_id: auth.user.id,
    p_provider_cost_microeur: estimateBrowserHandoffCostMicroeur(credential),
    p_site_id: siteId
  })
  if (error) redirect(`/studio/${siteId}?notice=secure-browser-stop-failed`)
  await closeBrowserHandoff(credential).catch(() => undefined)
  redirect(`/studio/${siteId}?notice=secure-browser-stopped`)
}
