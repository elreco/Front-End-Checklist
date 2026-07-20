import { type PaidPlanId, stripeCustomerId, stripeSubscriptionPeriodEnd } from '@/lib/stripe'

export interface LegacyStripeSubscription {
  cancel_at_period_end: boolean
  customer: string | { id: string }
  items: {
    data: Array<{ current_period_end: number }>
  }
  status: string
}

export interface LegacyPremiumCandidate {
  currentPlan: 'agency' | 'free' | 'solo'
  ownerId: string
  productName: string
  stripePriceId: string
  stripeSubscriptionId: string
}

export interface LegacyPremiumGrant {
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  ownerId: string
  plan: PaidPlanId
  status: 'active' | 'trialing'
  stripeCustomerId: string
  stripePriceId: string
  stripeSubscriptionId: string
}

/** Map historical CodeRocket products to the closest current paid plan. */
export function planForLegacyProduct(productName: string): PaidPlanId | null {
  const normalizedName = productName.trim().toLowerCase()
  if (normalizedName === 'starter' || normalizedName === 'pro') return 'solo'
  if (normalizedName === 'enterprise') return 'agency'
  return null
}

/** Build a safe grant only while Stripe still considers the legacy subscription paid. */
export function buildLegacyPremiumGrant(
  candidate: LegacyPremiumCandidate,
  subscription: LegacyStripeSubscription
): LegacyPremiumGrant | null {
  if (candidate.currentPlan !== 'free') return null
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return null
  const plan = planForLegacyProduct(candidate.productName)
  if (!plan) return null
  const periodEnd = stripeSubscriptionPeriodEnd(subscription.items.data)

  return {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    ownerId: candidate.ownerId,
    plan,
    status: subscription.status,
    stripeCustomerId: stripeCustomerId(subscription.customer),
    stripePriceId: candidate.stripePriceId,
    stripeSubscriptionId: candidate.stripeSubscriptionId
  }
}
