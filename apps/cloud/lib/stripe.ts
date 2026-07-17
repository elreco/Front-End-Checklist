import Stripe from 'stripe'

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

export function planForStripePrice(priceId?: string): 'free' | 'solo' | 'agency' {
  if (priceId && priceId === process.env.STRIPE_SOLO_PRICE_ID) return 'solo'
  if (priceId && priceId === process.env.STRIPE_AGENCY_PRICE_ID) return 'agency'
  return 'free'
}

export function paidPlanItem(items: Array<{ price: { id: string }; current_period_end: number }>): {
  currentPeriodEnd: number
  plan: 'solo' | 'agency'
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
