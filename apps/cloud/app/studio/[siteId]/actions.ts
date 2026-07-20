'use server'

import {
  assertPublicHttpsUrl,
  type SiteEditSelection,
  siteDocumentSchema,
  siteEditSelectionSchema
} from '@coderocket/core'
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

/** Restart one failed recreation without creating or counting another website import. */
export async function retryBuilderSite(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { error } = await supabase.rpc('cr_retry_site_import', { p_site_id: siteId })
  redirect(`/studio/${siteId}?notice=${error ? 'retry-failed' : 'retry-started'}`)
}

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

/** Queue one bounded conversational change and reserve its visible credits before work starts. */
export async function requestBuilderSiteEdit(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const instruction = String(formData.get('instruction') ?? '')
    .trim()
    .slice(0, 2000)
  const rawSelection = String(formData.get('selection') ?? '')
  const selection = parseEditSelection(rawSelection)
  if (!siteId) redirect('/websites')
  if (instruction.length < 2) redirect(`/studio/${siteId}?notice=describe-change`)
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { error } = await supabase.rpc('cr_request_site_edit_with_selection', {
    p_site_id: siteId,
    p_instruction: instruction,
    p_selection: selection ?? null
  })
  const notice = error
    ? error.message.includes('creation credits')
      ? 'not-enough-credits'
      : error.message.includes('already')
        ? 'change-already-running'
        : 'change-failed'
    : 'change-started'
  redirect(`/studio/${siteId}?notice=${notice}`)
}

/** Accept only the bounded preview context generated by CodeRocket's selection mode. */
function parseEditSelection(value: string): SiteEditSelection | undefined {
  if (!value) return undefined
  try {
    const parsed = siteEditSelectionSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

const collectionPresets = {
  products: {
    name: 'Products',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'long_text', required: false },
      { key: 'price', label: 'Price', type: 'price', required: true },
      { key: 'image', label: 'Image', type: 'image', required: false },
      { key: 'available', label: 'Available', type: 'yes_no', required: true }
    ]
  },
  contacts: {
    name: 'Contacts',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'message', label: 'Message', type: 'long_text', required: false }
    ]
  },
  bookings: {
    name: 'Bookings',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'startsAt', label: 'Date and time', type: 'date_time', required: true },
      { key: 'status', label: 'Status', type: 'text', required: true }
    ]
  }
} as const

/** Create a managed data collection from a novice-friendly business preset. */
export async function createBuilderCollection(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const requestedPreset = String(formData.get('preset') ?? '')
  const preset =
    requestedPreset === 'products' ||
    requestedPreset === 'contacts' ||
    requestedPreset === 'bookings'
      ? requestedPreset
      : undefined
  if (!(siteId && preset)) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}?panel=data`)
  const template = collectionPresets[preset]
  const { error } = await supabase.from('cr_builder_collections').insert({
    owner_id: auth.user.id,
    site_id: siteId,
    name: template.name,
    kind: preset,
    fields: template.fields
  })
  redirect(`/studio/${siteId}?panel=data&notice=${error ? 'data-failed' : 'data-ready'}`)
}

/** Save a no-secret payment or scheduling link as a usable first connector. */
export async function saveBuilderLinkConnection(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const provider = String(formData.get('provider') ?? '')
  const rawUrl = String(formData.get('url') ?? '').trim()
  if (!(siteId && (provider === 'stripe' || provider === 'calendly'))) redirect('/websites')
  let url: URL
  try {
    url = new URL(rawUrl)
    const accepted =
      provider === 'stripe'
        ? url.protocol === 'https:' &&
          (url.hostname === 'buy.stripe.com' || url.hostname === 'checkout.stripe.com')
        : url.protocol === 'https:' &&
          (url.hostname === 'calendly.com' || url.hostname === 'cal.com')
    if (!accepted) throw new Error('Unsupported link')
  } catch {
    redirect(`/studio/${siteId}?panel=connections&notice=invalid-connection-link`)
  }
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}?panel=connections`)
  const { error } = await supabase.from('cr_builder_connections').upsert(
    {
      owner_id: auth.user.id,
      site_id: siteId,
      provider,
      status: 'connected',
      display_name: provider === 'stripe' ? 'Stripe payment link' : 'Scheduling link',
      public_config: { url: url.toString() },
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'site_id,provider' }
  )
  redirect(
    `/studio/${siteId}?panel=connections&notice=${error ? 'connection-failed' : 'connection-ready'}`
  )
}

/** Save novice-facing content fields as a new recoverable site revision. */
export async function updateBuilderSite(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const requestedPagePath = String(formData.get('pagePath') ?? '/')
  const pagePath = requestedPagePath.startsWith('/') ? requestedPagePath : '/'
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data: revision } = await supabase
    .from('cr_site_revisions')
    .select('site_document')
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const parsed = siteDocumentSchema.safeParse(revision?.site_document)
  if (!parsed.success) redirect(studioNoticeHref(siteId, pagePath, 'missing-version'))
  const selectedPage = parsed.data.pages?.find(page => page.path === pagePath)
  if (pagePath !== '/' && !selectedPage) redirect(studioNoticeHref(siteId, '/', 'missing-version'))
  const selectedSections = selectedPage?.sections ?? parsed.data.sections
  const firstSection = selectedSections[0]
  if (!firstSection) redirect(studioNoticeHref(siteId, pagePath, 'missing-version'))
  const identityName = String(formData.get('identityName') ?? '')
    .trim()
    .slice(0, 120)
  const heading = String(formData.get('heading') ?? '')
    .trim()
    .slice(0, 180)
  const body = String(formData.get('body') ?? '')
    .trim()
    .slice(0, 1200)
  const ctaLabel = String(formData.get('ctaLabel') ?? '')
    .trim()
    .slice(0, 80)
  const rawCtaUrl = String(formData.get('ctaUrl') ?? '').trim()
  if (!identityName || !heading) redirect(studioNoticeHref(siteId, pagePath, 'invalid-content'))
  let ctaUrl: string | undefined
  if (rawCtaUrl) {
    try {
      const parsedUrl = new URL(rawCtaUrl)
      if (parsedUrl.protocol !== 'https:') throw new Error('HTTPS is required')
      ctaUrl = parsedUrl.toString()
    } catch {
      redirect(studioNoticeHref(siteId, pagePath, 'invalid-action-link'))
    }
  }
  const nextSections = [
    {
      ...firstSection,
      heading,
      body,
      links:
        ctaLabel && ctaUrl
          ? [{ href: ctaUrl, label: ctaLabel }, ...firstSection.links.slice(1)]
          : firstSection.links
    },
    ...selectedSections.slice(1)
  ]
  const nextDocument = siteDocumentSchema.parse({
    ...parsed.data,
    identity: { ...parsed.data.identity, name: identityName },
    sections: pagePath === '/' ? nextSections : parsed.data.sections,
    pages: parsed.data.pages?.map(page =>
      page.path === pagePath ? { ...page, title: heading, sections: nextSections } : page
    )
  })
  const { error } = await supabase.rpc('cr_update_builder_site_content', {
    p_site_id: siteId,
    p_site_document: nextDocument
  })
  redirect(studioNoticeHref(siteId, pagePath, error ? 'save-failed' : 'saved'))
}

/** Restore an owner-visible revision by copying it into a new immutable latest version. */
export async function restoreBuilderRevision(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const revisionId = String(formData.get('revisionId') ?? '')
  const requestedPagePath = String(formData.get('pagePath') ?? '/')
  const pagePath = requestedPagePath.startsWith('/') ? requestedPagePath : '/'
  if (!(siteId && revisionId)) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { data: revision } = await supabase
    .from('cr_site_revisions')
    .select('site_document')
    .eq('id', revisionId)
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  const parsed = siteDocumentSchema.safeParse(revision?.site_document)
  if (!parsed.success) redirect(studioNoticeHref(siteId, pagePath, 'restore-failed'))
  const { error } = await supabase.rpc('cr_update_builder_site_content', {
    p_site_id: siteId,
    p_site_document: parsed.data
  })
  redirect(studioNoticeHref(siteId, pagePath, error ? 'restore-failed' : 'restored'))
}

/** Point the public slug at the latest immutable revision. */
export async function publishBuilderSite(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  if (!siteId) redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect(`/login?next=/studio/${encodeURIComponent(siteId)}`)
  const { error } = await supabase.rpc('cr_publish_builder_site', { p_site_id: siteId })
  redirect(`/studio/${siteId}?notice=${error ? 'publish-failed' : 'published'}`)
}

/** Keep the selected page visible after a save or validation notice. */
function studioNoticeHref(siteId: string, pagePath: string, notice: string): string {
  const query = new URLSearchParams({ notice })
  if (pagePath !== '/') query.set('page', pagePath)
  return `/studio/${siteId}?${query.toString()}`
}
