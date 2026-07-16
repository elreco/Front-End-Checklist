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

export function planForStripePrice(priceId?: string): 'free' | 'solo' | 'agency' {
  if (priceId && priceId === process.env.STRIPE_SOLO_PRICE_ID) return 'solo'
  if (priceId && priceId === process.env.STRIPE_AGENCY_PRICE_ID) return 'agency'
  return 'free'
}
