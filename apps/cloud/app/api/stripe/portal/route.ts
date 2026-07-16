import { redirect } from 'next/navigation'
import { createStripeClient } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login?next=/settings/billing')
  const { data: subscription } = await supabase
    .from('cr_subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', data.user.id)
    .maybeSingle()
  if (!subscription?.stripe_customer_id) redirect('/pricing')
  const portal = await createStripeClient().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coderocket.app'}/settings/billing`
  })
  redirect(portal.url)
}
