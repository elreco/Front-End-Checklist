export const BUILDER_CREDIT_COSTS = {
  firstVersion: 20,
  guidedChange: 6,
  newPage: 6,
  quickEdit: 0,
  structuredData: 6
} as const

/** Return the builder limits whose variable-cost ceilings protect plan margin. */
export function getBuilderPlanEntitlements(plan: 'free' | 'solo' | 'agency') {
  if (plan === 'agency')
    return {
      sites: 10,
      pagesPerImport: 5,
      importsPerMonth: 30,
      creationCreditsPerMonth: 600,
      firstVersionCreditCost: BUILDER_CREDIT_COSTS.firstVersion,
      hostedVisitsPerMonth: 250_000,
      storageMegabytes: 10_240,
      variableCostBudgetMicroeur: 40_000_000
    }
  if (plan === 'solo')
    return {
      sites: 1,
      pagesPerImport: 5,
      importsPerMonth: 5,
      creationCreditsPerMonth: 100,
      firstVersionCreditCost: BUILDER_CREDIT_COSTS.firstVersion,
      hostedVisitsPerMonth: 20_000,
      storageMegabytes: 1024,
      variableCostBudgetMicroeur: 6_000_000
    }
  return {
    sites: 0,
    pagesPerImport: 0,
    importsPerMonth: 0,
    creationCreditsPerMonth: 0,
    firstVersionCreditCost: 0,
    hostedVisitsPerMonth: 0,
    storageMegabytes: 0,
    variableCostBudgetMicroeur: 0
  }
}
