import Stripe from 'stripe'

export type PaidPlanId = 'agency' | 'solo'

/** Create Stripe lazily so static builds never require production secrets. */
export function createStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is missing')
  return new Stripe(secretKey)
}

export function stripePriceForPlan(plan: 'solo' | 'agency'): string {
  const price =
    plan === 'solo' ? process.env.STRIPE_SOLO_PRICE_ID : process.env.STRIPE_AGENCY_PRICE_ID
  if (!price) throw new Error(`Stripe price is not configured for ${plan}`)
  return price
}

export function stripeAiOveragePrice(): string {
  const price = process.env.STRIPE_AI_OVERAGE_PRICE_ID
  if (!price) throw new Error('Stripe AI overage price is not configured')
  return price
}

export function planForStripePrice(priceId?: string): 'free' | PaidPlanId {
  if (priceId && priceId === process.env.STRIPE_SOLO_PRICE_ID) return 'solo'
  if (priceId && priceId === process.env.STRIPE_AGENCY_PRICE_ID) return 'agency'
  return 'free'
}

export function paidPlanItem(items: Array<{ price: { id: string }; current_period_end: number }>): {
  currentPeriodEnd: number
  plan: PaidPlanId
  priceId: string
} | null {
  for (const item of items) {
    const plan = planForStripePrice(item.price.id)
    if (plan !== 'free')
      return {
        currentPeriodEnd: item.current_period_end,
        plan,
        priceId: item.price.id
      }
  }
  return null
}

/** Return the stable customer ID from either expanded or compact Stripe data. */
export function stripeCustomerId(customer: string | { id: string }) {
  return typeof customer === 'string' ? customer : customer.id
}

/** Find the latest billing-period end across every item on a Stripe subscription. */
export function stripeSubscriptionPeriodEnd(
  items: Array<{ current_period_end: number }>
): number | null {
  const periodEnd = items.reduce((latest, item) => Math.max(latest, item.current_period_end), 0)
  return periodEnd > 0 ? periodEnd : null
}

/** Preserve a stored paid plan when Stripe sends an event for a grandfathered price. */
export function storedPaidPlan(value: unknown): PaidPlanId | null {
  return value === 'solo' || value === 'agency' ? value : null
}

/** Keep paid access only for Stripe states that still represent an entitled subscription. */
export function planForSubscriptionStatus(
  status: Stripe.Subscription.Status,
  paidPlan: PaidPlanId
): 'free' | PaidPlanId {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? paidPlan : 'free'
}
