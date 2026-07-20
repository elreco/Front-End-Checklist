'use server'

import {
  applyPublicSiteConnection,
  removePublicSiteConnection,
  siteDocumentSchema
} from '@coderocket/core'
import { redirect } from 'next/navigation'
import { readBuilderConnections, readConnectionPublicConfig } from '@/lib/builder-connections'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Connect one public checkout or booking page and apply it to the requested website action. */
export async function saveBuilderLinkConnection(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const provider = readLinkProvider(formData.get('provider'))
  const url = readProviderUrl(provider, String(formData.get('url') ?? '').trim())
  if (!(siteId && provider)) redirect('/websites')
  if (!url) redirect(connectionHref(siteId, 'invalid-connection-link'))

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    redirect(`/login?next=${encodeURIComponent(`/studio/${siteId}?panel=connections`)}`)
  const [{ data: existing }, { data: revision }] = await Promise.all([
    supabase
      .from('cr_builder_connections')
      .select('id,provider,status,display_name,public_config')
      .eq('site_id', siteId)
      .eq('owner_id', auth.user.id)
      .eq('provider', provider)
      .maybeSingle(),
    supabase
      .from('cr_site_revisions')
      .select('site_document')
      .eq('site_id', siteId)
      .eq('owner_id', auth.user.id)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])
  const publicConfig = readConnectionPublicConfig(existing?.public_config)
  const { error: connectionError } = await supabase.from('cr_builder_connections').upsert(
    {
      owner_id: auth.user.id,
      site_id: siteId,
      provider,
      status: 'connected',
      display_name: provider === 'stripe' ? 'Stripe checkout' : 'Booking page',
      public_config: {
        ...publicConfig,
        capability: provider === 'stripe' ? 'payments' : 'bookings',
        mode: 'link',
        url
      },
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'site_id,provider' }
  )
  if (connectionError) redirect(connectionHref(siteId, 'connection-failed'))

  const document = siteDocumentSchema.safeParse(revision?.site_document)
  if (!document.success) redirect(connectionHref(siteId, 'connection-ready'))
  const summary = existing
    ? readBuilderConnections([existing]).find(connection => connection.provider === provider)
    : undefined
  const result = applyPublicSiteConnection(document.data, {
    provider,
    url,
    placement: summary?.placement,
    previousUrl: summary?.publicUrl
  })
  if (result.applied === 0) redirect(connectionHref(siteId, 'connection-ready'))
  const { error: revisionError } = await supabase.rpc('cr_update_builder_site_content', {
    p_site_id: siteId,
    p_site_document: result.document,
    p_revision_title: provider === 'stripe' ? 'Added Stripe payments' : 'Added appointment booking',
    p_source_revision_id: null
  })
  redirect(connectionHref(siteId, revisionError ? 'connection-partial' : 'connection-applied'))
}

/** Stop using one service on this website while preserving recoverable provider access. */
export async function disconnectBuilderConnection(formData: FormData) {
  const siteId = String(formData.get('siteId') ?? '')
  const provider = String(formData.get('provider') ?? '')
  if (
    !siteId ||
    (provider !== 'stripe' &&
      provider !== 'calendly' &&
      provider !== 'shopify' &&
      provider !== 'supabase')
  )
    redirect('/websites')
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    redirect(`/login?next=${encodeURIComponent(`/studio/${siteId}?panel=connections`)}`)
  const [{ data: connection }, { data: revision }] = await Promise.all([
    supabase
      .from('cr_builder_connections')
      .select('public_config')
      .eq('site_id', siteId)
      .eq('owner_id', auth.user.id)
      .eq('provider', provider)
      .maybeSingle(),
    supabase
      .from('cr_site_revisions')
      .select('site_document')
      .eq('site_id', siteId)
      .eq('owner_id', auth.user.id)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])
  const config = readConnectionPublicConfig(connection?.public_config)
  const { error } = await supabase
    .from('cr_builder_connections')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .eq('provider', provider)
  if (error) redirect(connectionHref(siteId, 'connection-disconnect-failed'))
  const document = siteDocumentSchema.safeParse(revision?.site_document)
  const providerUrl = typeof config.url === 'string' ? config.url : undefined
  if (document.success && providerUrl) {
    const result = removePublicSiteConnection(document.data, providerUrl)
    if (result.removed > 0)
      await supabase.rpc('cr_update_builder_site_content', {
        p_site_id: siteId,
        p_site_document: result.document,
        p_revision_title:
          provider === 'stripe' ? 'Removed Stripe payments' : 'Removed appointment booking',
        p_source_revision_id: null
      })
  }
  redirect(connectionHref(siteId, 'connection-removed'))
}

/** Accept only link-based providers supported by the current release. */
function readLinkProvider(value: FormDataEntryValue | null): 'calendly' | 'stripe' | undefined {
  if (value === 'stripe' || value === 'calendly') return value
  return undefined
}

/** Validate that the supplied public page belongs to the selected trusted provider. */
function readProviderUrl(
  provider: 'calendly' | 'stripe' | undefined,
  value: string
): string | undefined {
  if (!provider) return undefined
  try {
    const url = new URL(value)
    const stripeHost = url.hostname === 'buy.stripe.com' || url.hostname === 'checkout.stripe.com'
    const bookingHost =
      url.hostname === 'cal.com' ||
      url.hostname.endsWith('.cal.com') ||
      url.hostname === 'calendly.com' ||
      url.hostname.endsWith('.calendly.com')
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (provider === 'stripe' ? !stripeHost : !bookingHost)
    )
      return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/** Return to the open connection panel with one plain-language result notice. */
function connectionHref(siteId: string, notice: string): string {
  return `/studio/${siteId}?panel=connections&notice=${notice}`
}
