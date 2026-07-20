export type PlanId = 'free' | 'solo' | 'agency'

export type UpgradeSource =
  | 'billing'
  | 'dashboard_plan'
  | 'sidebar_plan'
  | 'site_limit'
  | 'website_creation'

export interface PricingUpgradeContext {
  currentPlan?: PlanId
  recommendedPlan?: Exclude<PlanId, 'free'>
  source?: UpgradeSource
}

type PricingSearchParams = Record<string, string | string[] | undefined>

/** Return the next self-serve plan without inventing an upgrade beyond Studio. */
export function getNextPlan(plan: PlanId): Exclude<PlanId, 'free'> | undefined {
  if (plan === 'free') return 'solo'
  if (plan === 'solo') return 'agency'
  return undefined
}

/** Return the public label used for one builder plan. */
export function getPlanLabel(plan: PlanId): string {
  if (plan === 'solo') return 'Launch'
  if (plan === 'agency') return 'Studio'
  return 'Free'
}

/** Build a contextual pricing destination using only non-identifying product state. */
export function buildPricingHref({
  currentPlan,
  recommendedPlan,
  source
}: Required<PricingUpgradeContext>): string {
  const searchParams = new URLSearchParams({
    current: currentPlan,
    recommended: recommendedPlan,
    source
  })
  return `/pricing?${searchParams.toString()}`
}

/** Parse a pricing attribution query without trusting arbitrary parameter values. */
export function parsePricingUpgradeContext(
  searchParams: PricingSearchParams
): PricingUpgradeContext {
  return {
    currentPlan: parsePlan(readSingleValue(searchParams.current)),
    recommendedPlan: parsePaidPlan(readSingleValue(searchParams.recommended)),
    source: parseUpgradeSource(readSingleValue(searchParams.source))
  }
}

/** Accept a known upgrade source before adding it to analytics or billing metadata. */
export function parseUpgradeSource(
  value: FormDataEntryValue | string | null | undefined
): UpgradeSource | undefined {
  if (
    value === 'billing' ||
    value === 'dashboard_plan' ||
    value === 'sidebar_plan' ||
    value === 'site_limit' ||
    value === 'website_creation'
  )
    return value
  return undefined
}

/** Return one query value while rejecting repeated parameters. */
function readSingleValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Parse a plan that may represent the visitor's current subscription. */
function parsePlan(value?: string): PlanId | undefined {
  if (value === 'free' || value === 'solo' || value === 'agency') return value
  return undefined
}

/** Parse a plan that can be purchased as a self-serve upgrade. */
function parsePaidPlan(value?: string): Exclude<PlanId, 'free'> | undefined {
  return value === 'solo' || value === 'agency' ? value : undefined
}
