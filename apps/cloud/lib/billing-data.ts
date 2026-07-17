import type { PlanId } from '@coderocket/core'
import type { AiUsageSnapshot, BillingAccountData } from './billing'
import { getSupabaseServerConfig } from './supabase/config'
import { createSupabaseServerClient } from './supabase/server'

/** Load subscription connection and AI usage counters for the billing workspace. */
export async function getBillingAccountData(
  plan: PlanId,
  includedCredits: number
): Promise<BillingAccountData> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true')
    return fallbackBillingAccount(includedCredits, 800)
  if (!getSupabaseServerConfig()) return fallbackBillingAccount(includedCredits, 0)

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return fallbackBillingAccount(includedCredits, 0)

  const [{ data: subscription }, { data: usage }] = await Promise.all([
    supabase
      .from('cr_subscriptions')
      .select(
        'status,stripe_customer_id,stripe_subscription_id,current_period_end,cancel_at_period_end'
      )
      .eq('owner_id', auth.user.id)
      .maybeSingle(),
    supabase
      .from('cr_ai_usage_accounts')
      .select(
        'included_credits,consumed_credits,reserved_credits,overage_enabled,overage_cap_microeur,billed_overage_microeur,period_ends_at'
      )
      .eq('owner_id', auth.user.id)
      .maybeSingle()
  ])
  const resetDate = normalizeResetDate(usage?.period_ends_at, subscription?.current_period_end)
  const periodExpired = usage?.period_ends_at
    ? new Date(usage.period_ends_at).getTime() <= Date.now()
    : false
  const snapshot: AiUsageSnapshot = {
    billedOverageMicroeur: periodExpired ? 0 : (usage?.billed_overage_microeur ?? 0),
    consumedCredits: periodExpired ? 0 : (usage?.consumed_credits ?? 0),
    includedCredits: usage?.included_credits ?? includedCredits,
    overageCapMicroeur: usage?.overage_cap_microeur ?? 0,
    overageEnabled: plan !== 'free' && Boolean(usage?.overage_enabled),
    periodEndsAt: resetDate,
    reservedCredits: periodExpired ? 0 : (usage?.reserved_credits ?? 0)
  }

  return {
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    hasStripeCustomer: Boolean(subscription?.stripe_customer_id),
    hasStripeSubscription: Boolean(subscription?.stripe_subscription_id),
    subscriptionPeriodEndsAt: subscription?.current_period_end ?? null,
    subscriptionStatus: subscription?.status ?? 'free',
    usage: snapshot
  }
}

/** Build a safe local billing snapshot when no authenticated database is available. */
function fallbackBillingAccount(
  includedCredits: number,
  consumedCredits: number
): BillingAccountData {
  return {
    cancelAtPeriodEnd: false,
    hasStripeCustomer: false,
    hasStripeSubscription: false,
    subscriptionPeriodEndsAt: null,
    subscriptionStatus: 'free',
    usage: {
      billedOverageMicroeur: 0,
      consumedCredits,
      includedCredits,
      overageCapMicroeur: 0,
      overageEnabled: false,
      periodEndsAt: nextMonthlyReset(),
      reservedCredits: 0
    }
  }
}

/** Prefer a future usage reset, then a future Stripe period end, then one month from now. */
function normalizeResetDate(
  usagePeriodEnd: string | null | undefined,
  subscriptionPeriodEnd: string | null | undefined
): string {
  if (usagePeriodEnd && new Date(usagePeriodEnd).getTime() > Date.now()) return usagePeriodEnd
  if (subscriptionPeriodEnd && new Date(subscriptionPeriodEnd).getTime() > Date.now())
    return subscriptionPeriodEnd
  return nextMonthlyReset()
}

/** Return a stable fallback reset date one UTC month from now. */
function nextMonthlyReset(): string {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() + 1)
  return date.toISOString()
}
