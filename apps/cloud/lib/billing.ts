import type { PlanId } from '@coderocket/core'

export const AI_ANALYSIS_RESERVATION_CREDITS = 1_000
export const MAX_AI_OVERAGE_BUDGET_EUR = 500
const MICROEUROS_PER_EURO = 1_000_000

export interface AiUsageSnapshot {
  billedOverageMicroeur: number
  consumedCredits: number
  includedCredits: number
  overageCapMicroeur: number
  overageEnabled: boolean
  periodEndsAt: string
  reservedCredits: number
}

export interface BillingAccountData {
  cancelAtPeriodEnd: boolean
  hasStripeCustomer: boolean
  hasStripeSubscription: boolean
  subscriptionPeriodEndsAt: string | null
  subscriptionStatus: string
  usage: AiUsageSnapshot
}

export interface AiUsageSummary extends AiUsageSnapshot {
  alert: {
    description: string
    title: string
    tone: 'danger' | 'warning'
  } | null
  committedIncludedCredits: number
  estimatedAnalysesRemaining: number
  includedUsagePercent: number
  overageUsagePercent: number
  remainingIncludedCredits: number
}

/** Turn stored credit and spending counters into safe, user-facing usage values. */
export function summarizeAiUsage(snapshot: AiUsageSnapshot): AiUsageSummary {
  const committedIncludedCredits = Math.min(
    snapshot.includedCredits,
    snapshot.consumedCredits + snapshot.reservedCredits
  )
  const remainingIncludedCredits = Math.max(
    0,
    snapshot.includedCredits - snapshot.consumedCredits - snapshot.reservedCredits
  )
  const includedUsagePercent = percentage(committedIncludedCredits, snapshot.includedCredits)
  const overageUsagePercent = snapshot.overageEnabled
    ? percentage(snapshot.billedOverageMicroeur, snapshot.overageCapMicroeur)
    : 0

  return {
    ...snapshot,
    alert: usageAlert(snapshot, includedUsagePercent, overageUsagePercent),
    committedIncludedCredits,
    estimatedAnalysesRemaining: Math.floor(
      remainingIncludedCredits / AI_ANALYSIS_RESERVATION_CREDITS
    ),
    includedUsagePercent,
    overageUsagePercent,
    remainingIncludedCredits
  }
}

/** Identify the billing connection state shown beside subscription actions. */
export function billingConnectionState(
  plan: PlanId,
  account: Pick<BillingAccountData, 'hasStripeCustomer' | 'hasStripeSubscription'>
): 'connected' | 'free' | 'test' {
  if (plan === 'free') return 'free'
  return account.hasStripeCustomer ? 'connected' : 'test'
}

/** Convert a whole-euro spending budget into the integer unit stored in Postgres. */
export function eurosToMicroeuros(euros: number): number {
  return Math.round(euros * MICROEUROS_PER_EURO)
}

/** Calculate a bounded percentage for billing progress indicators. */
function percentage(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)))
}

/** Pick the most urgent included-credit or overage-budget warning. */
function usageAlert(
  snapshot: AiUsageSnapshot,
  includedUsagePercent: number,
  overageUsagePercent: number
): AiUsageSummary['alert'] {
  if (snapshot.overageEnabled && overageUsagePercent >= 100)
    return {
      title: 'Monthly AI budget reached',
      description:
        'Additional paid analyses are paused. Included credits will become available again on the reset date below.',
      tone: 'danger'
    }
  if (snapshot.overageEnabled && overageUsagePercent >= 80)
    return {
      title: '80% of the AI budget has been used',
      description:
        'Additional usage will stop automatically at 100% of the monthly budget you selected.',
      tone: 'warning'
    }
  if (includedUsagePercent >= 100)
    return snapshot.overageEnabled
      ? {
          title: 'Included AI credits have been used',
          description: 'New analyses now count toward your additional monthly AI budget.',
          tone: 'warning'
        }
      : {
          title: 'Included AI credits have been used',
          description:
            'New analyses are paused until the reset date. Enable a budget if you want them to continue.',
          tone: 'danger'
        }
  if (includedUsagePercent >= 80)
    return {
      title: '80% of included AI credits have been used',
      description:
        'Usage will either pause at 100% or continue within your enabled monthly budget.',
      tone: 'warning'
    }
  return null
}
