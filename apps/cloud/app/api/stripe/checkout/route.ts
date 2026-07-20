import { redirect } from 'next/navigation'
import { readPricingCurrency, stripeCurrency } from '@/lib/pricing'
import { createStripeClient, stripePriceForPlan } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { parseUpgradeSource } from '@/lib/upgrade'
import { normalizeWebsiteDraft } from '@/lib/website-draft'

/** Start a plan checkout while preserving the safe in-product upgrade attribution. */
export async function POST(request: Request) {
  if (process.env.CODEROCKET_COMMERCIAL_LAUNCH !== 'true') {
    redirect('/pricing?checkout=unavailable')
  }
  const formData = await request.formData()
  const plan = formData.get('plan')
  if (plan !== 'solo' && plan !== 'agency') redirect('/pricing?checkout=invalid')
  const currency = readPricingCurrency(formData.get('currency'))
  const source = parseUpgradeSource(formData.get('source'))
  const websiteDraft = normalizeWebsiteDraft(String(formData.get('website') ?? ''))
  const websiteQuery = websiteDraft ? `&url=${encodeURIComponent(websiteDraft)}` : ''
  const attributedPricingPath = source
    ? `/pricing?source=${source}&recommended=${plan}${websiteQuery}`
    : '/pricing'
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect(`/login?next=${encodeURIComponent(attributedPricingPath)}`)
  const { data: subscription } = await supabase
    .from('cr_subscriptions')
    .select('stripe_customer_id')
    .eq('owner_id', data.user.id)
    .maybeSingle()
  const customerId = subscription?.stripe_customer_id ?? undefined
  const stripe = createStripeClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app'
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    currency: stripeCurrency(currency),
    line_items: [{ price: stripePriceForPlan(plan), quantity: 1 }],
    customer: customerId,
    customer_email: customerId ? undefined : data.user.email,
    ...(customerId ? { customer_update: { address: 'auto', name: 'auto' } } : {}),
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    locale: 'auto',
    success_url: websiteDraft
      ? `${siteUrl}/create?url=${encodeURIComponent(websiteDraft)}&checkout=success`
      : `${siteUrl}/settings/billing?checkout=success`,
    cancel_url: `${siteUrl}${attributedPricingPath}${source ? '&' : '?'}checkout=cancelled`,
    metadata: { ownerId: data.user.id, planId: plan, upgradeSource: source ?? 'pricing' },
    subscription_data: {
      metadata: { ownerId: data.user.id, planId: plan, upgradeSource: source ?? 'pricing' }
    }
  })
  if (!session.url) redirect('/pricing?checkout=failed')
  redirect(session.url)
}
