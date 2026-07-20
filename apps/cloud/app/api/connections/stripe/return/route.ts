import { NextResponse } from 'next/server'
import { readConnectionPublicConfig } from '@/lib/builder-connections'
import { createStripeClient } from '@/lib/stripe'
import { stripeConnectedAccountName, stripeConnectedAccountStatus } from '@/lib/stripe-connect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Verify the connected account after the owner leaves Stripe-hosted onboarding. */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const siteId = requestUrl.searchParams.get('siteId') ?? ''
  const studioUrl = new URL(`/studio/${siteId}?panel=connections`, request.url)
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(studioUrl.pathname + studioUrl.search)}`,
        request.url
      )
    )
  const { data: connection } = await supabase
    .from('cr_builder_connections')
    .select('public_config')
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .eq('provider', 'stripe')
    .maybeSingle()
  const publicConfig = readConnectionPublicConfig(connection?.public_config)
  const accountId = typeof publicConfig.accountId === 'string' ? publicConfig.accountId : undefined
  if (!accountId) {
    studioUrl.searchParams.set('notice', 'connection-failed')
    return NextResponse.redirect(studioUrl)
  }
  try {
    const account = await createStripeClient().accounts.retrieve(accountId)
    const status = stripeConnectedAccountStatus(account)
    const { error } = await supabase
      .from('cr_builder_connections')
      .update({
        status,
        display_name: stripeConnectedAccountName(account),
        public_config: {
          ...publicConfig,
          defaultCurrency: account.default_currency ?? 'eur'
        },
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId)
      .eq('owner_id', auth.user.id)
      .eq('provider', 'stripe')
    if (error) throw new Error(error.message)
    studioUrl.searchParams.set(
      'notice',
      status === 'connected' ? 'connection-ready' : 'connection-attention'
    )
  } catch {
    studioUrl.searchParams.set('notice', 'connection-failed')
  }
  return NextResponse.redirect(studioUrl)
}
