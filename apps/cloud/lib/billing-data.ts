import type { PlanId } from '@coderocket/core'
import type { BillingAccountData } from './billing'
import { getSupabaseServerConfig } from './supabase/config'
import { createSupabaseServerClient } from './supabase/server'

/** Load the authenticated subscription shown in the billing workspace. */
export async function getBillingAccountData(_plan: PlanId): Promise<BillingAccountData> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return fallbackBillingAccount()
  if (!getSupabaseServerConfig()) return fallbackBillingAccount()

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return fallbackBillingAccount()

  const { data: subscription } = await supabase
    .from('cr_subscriptions')
    .select('status,stripe_customer_id,stripe_subscription_id,current_period_end,cancel_at_period_end')
    .eq('owner_id', auth.user.id)
    .maybeSingle()

  return {
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    hasStripeCustomer: Boolean(subscription?.stripe_customer_id),
    hasStripeSubscription: Boolean(subscription?.stripe_subscription_id),
    subscriptionPeriodEndsAt: subscription?.current_period_end ?? null,
    subscriptionStatus: subscription?.status ?? 'free'
  }
}

/** Build a safe local billing snapshot when no authenticated database is available. */
function fallbackBillingAccount(): BillingAccountData {
  return {
    cancelAtPeriodEnd: false,
    hasStripeCustomer: false,
    hasStripeSubscription: false,
    subscriptionPeriodEndsAt: null,
    subscriptionStatus: 'free'
  }
}
