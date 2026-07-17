import type { PlanEntitlements, PlanId } from './types'

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  free: {
    projects: 1,
    pagesPerProject: 5,
    schedule: 'weekly',
    onDemandRunsPerMonth: 10,
    retentionDays: 30,
    secondaryBranding: true,
    aiCreditsPerMonth: 3_000
  },
  solo: {
    projects: 3,
    pagesPerProject: 25,
    schedule: 'daily',
    onDemandRunsPerMonth: 100,
    retentionDays: 90,
    secondaryBranding: true,
    aiCreditsPerMonth: 100_000
  },
  agency: {
    projects: 50,
    pagesPerProject: 50,
    schedule: 'daily',
    onDemandRunsPerMonth: 500,
    retentionDays: 365,
    secondaryBranding: false,
    aiCreditsPerMonth: 600_000
  }
}

/** Return immutable product limits for a plan. */
export function getPlanEntitlements(plan: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan]
}
