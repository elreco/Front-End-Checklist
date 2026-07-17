import { redirect } from 'next/navigation'
import { createStripeClient, stripeAiOveragePrice, stripePriceForPlan } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseUpgradeSource } from '@/lib/upgrade'

export async function POST(request: Request) {
  if (process.env.CODEROCKET_COMMERCIAL_LAUNCH !== 'true') {
    redirect('/pricing?checkout=unavailable')
  }
  const formData = await request.formData()
  const plan = formData.get('plan')
  if (plan !== 'solo' && plan !== 'agency') redirect('/pricing?checkout=invalid')
  const source = parseUpgradeSource(formData.get('source'))
  const attributedPricingPath = source
    ? `/pricing?source=${source}&recommended=${plan}`
    : '/pricing'
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect(`/login?next=${encodeURIComponent(attributedPricingPath)}`)
  const { data: subscription } = await supabase
    .from('cr_subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', data.user.id)
    .maybeSingle()
  const stripe = createStripeClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app'
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      { price: stripePriceForPlan(plan), quantity: 1 },
      { price: stripeAiOveragePrice() }
    ],
    customer: subscription?.stripe_customer_id ?? undefined,
    customer_email: subscription?.stripe_customer_id ? undefined : data.user.email,
    customer_creation: subscription?.stripe_customer_id ? undefined : 'always',
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    allow_promotion_codes: true,
    success_url: `${siteUrl}/settings/billing?checkout=success`,
    cancel_url: `${siteUrl}${attributedPricingPath}${source ? '&' : '?'}checkout=cancelled`,
    metadata: { ownerId: data.user.id, planId: plan, upgradeSource: source ?? 'pricing' },
    subscription_data: {
      metadata: { ownerId: data.user.id, planId: plan, upgradeSource: source ?? 'pricing' }
    }
  })
  if (!session.url) redirect('/pricing?checkout=failed')
  redirect(session.url)
}
