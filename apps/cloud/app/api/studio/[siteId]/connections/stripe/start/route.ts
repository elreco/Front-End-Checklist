import { NextResponse } from 'next/server'
import { readConnectionPublicConfig } from '@/lib/builder-connections'
import { createStripeClient } from '@/lib/stripe'
import {
  stripeAccountConnectionEnabled,
  stripeConnectedAccountName,
  stripeConnectedAccountStatus,
  stripeConnectReturnUrl
} from '@/lib/stripe-connect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Create or resume one Stripe-hosted Express onboarding flow for this website owner. */
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
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
  const [{ data: site }, { data: connection }] = await Promise.all([
    supabase
      .from('cr_builder_sites')
      .select('id')
      .eq('id', siteId)
      .eq('owner_id', auth.user.id)
      .is('archived_at', null)
      .maybeSingle(),
    supabase
      .from('cr_builder_connections')
      .select('public_config')
      .eq('site_id', siteId)
      .eq('owner_id', auth.user.id)
      .eq('provider', 'stripe')
      .maybeSingle()
  ])
  if (!site || !stripeAccountConnectionEnabled()) {
    studioUrl.searchParams.set('notice', 'connection-unavailable')
    return NextResponse.redirect(studioUrl)
  }

  try {
    const stripe = createStripeClient()
    const publicConfig = readConnectionPublicConfig(connection?.public_config)
    const storedAccountId =
      typeof publicConfig.accountId === 'string' ? publicConfig.accountId : undefined
    const account = storedAccountId
      ? await stripe.accounts.retrieve(storedAccountId)
      : await stripe.accounts.create(
          {
            type: 'express',
            email: auth.user.email,
            metadata: { coderocketSiteId: siteId }
          },
          { idempotencyKey: `coderocket-site-${siteId}-stripe-account` }
        )
    const status = stripeConnectedAccountStatus(account)
    const { error } = await supabase.from('cr_builder_connections').upsert(
      {
        owner_id: auth.user.id,
        site_id: siteId,
        provider: 'stripe',
        status,
        display_name: stripeConnectedAccountName(account),
        public_config: {
          ...publicConfig,
          accountId: account.id,
          capability: 'payments',
          defaultCurrency: account.default_currency ?? 'eur',
          mode: 'account'
        },
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'site_id,provider' }
    )
    if (error) throw new Error(error.message)
    if (status === 'connected') {
      studioUrl.searchParams.set('notice', 'connection-ready')
      return NextResponse.redirect(studioUrl)
    }
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      collection_options: { fields: 'eventually_due' },
      refresh_url: request.url,
      return_url: stripeConnectReturnUrl(request.url, siteId),
      type: 'account_onboarding'
    })
    return NextResponse.redirect(accountLink.url)
  } catch {
    studioUrl.searchParams.set('notice', 'connection-failed')
    return NextResponse.redirect(studioUrl)
  }
}
