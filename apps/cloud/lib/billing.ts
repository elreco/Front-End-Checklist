import type { PlanId } from '@coderocket/core'

export interface BillingAccountData {
  cancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
  hasStripeSubscription: boolean
  subscriptionPeriodEndsAt: string | null
  subscriptionStatus: string
}

/** Identify the billing connection state shown beside subscription actions. */
export function billingConnectionState(
  plan: PlanId,
  account: Pick<BillingAccountData, 'hasStripeCustomer' | 'hasStripeSubscription'>
): 'connected' | 'free' | 'test' {
  if (plan === 'free') return 'free'
  return account.hasStripeCustomer ? 'connected' : 'test'
}
