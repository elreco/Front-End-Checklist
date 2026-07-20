import { NextResponse } from 'next/server'
import { readConnectionPublicConfig } from '@/lib/builder-connections'
import { createStripeClient } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Open a short-lived Stripe Express Dashboard link for the authenticated website owner. */
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
  const { data: connection } = await supabase
    .from('cr_builder_connections')
    .select('public_config')
    .eq('site_id', siteId)
    .eq('owner_id', auth.user.id)
    .eq('provider', 'stripe')
    .in('status', ['connected', 'attention'])
    .maybeSingle()
  const publicConfig = readConnectionPublicConfig(connection?.public_config)
  const accountId = typeof publicConfig.accountId === 'string' ? publicConfig.accountId : undefined
  if (!accountId) {
    studioUrl.searchParams.set('notice', 'connection-failed')
    return NextResponse.redirect(studioUrl)
  }
  try {
    const login = await createStripeClient().accounts.createLoginLink(accountId)
    return NextResponse.redirect(login.url)
  } catch {
    studioUrl.searchParams.set('notice', 'connection-failed')
    return NextResponse.redirect(studioUrl)
  }
}
