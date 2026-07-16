import type { PlanEntitlements, PlanId } from './types'

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  free: {
    projects: 1,
    pagesPerProject: 5,
    schedule: 'weekly',
    onDemandRunsPerMonth: 10,
    retentionDays: 30,
    secondaryBranding: true
  },
  solo: {
    projects: 3,
    pagesPerProject: 25,
    schedule: 'daily',
    onDemandRunsPerMonth: 100,
    retentionDays: 90,
    secondaryBranding: true
  },
  agency: {
    projects: 50,
    pagesPerProject: 50,
    schedule: 'daily',
    onDemandRunsPerMonth: 500,
    retentionDays: 365,
    secondaryBranding: false
  }
}

/** Return immutable product limits for a plan. */
export function getPlanEntitlements(plan: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan]
}
