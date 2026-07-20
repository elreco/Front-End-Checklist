import { createServiceClient } from '@coderocket/db'
import type Stripe from 'stripe'
import { z } from 'zod'
import {
  buildLegacyPremiumGrant,
  type LegacyPremiumCandidate,
  type LegacyPremiumGrant,
  planForLegacyProduct
} from '@/lib/legacy-premium'
import { createStripeClient } from '@/lib/stripe'

const legacySubscriptionSchema = z.object({
  id: z.string().min(1),
  price_id: z.string().nullable(),
  status: z.string(),
  user_id: z.string().uuid()
})
const legacyPriceSchema = z.object({
  id: z.string().min(1),
  product_id: z.string().nullable()
})
const legacyProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable()
})
const currentSubscriptionSchema = z.object({
  owner_id: z.string().uuid(),
  plan_id: z.enum(['free', 'solo', 'agency'])
})

type CurrentPlan = z.infer<typeof currentSubscriptionSchema>['plan_id']

interface LegacyRows {
  currentPlans: Map<string, CurrentPlan>
  prices: Map<string, string>
  products: Map<string, string>
  subscriptions: Array<z.infer<typeof legacySubscriptionSchema>>
}

type Inspection =
  | { kind: 'already-paid' }
  | { kind: 'eligible'; grant: LegacyPremiumGrant }
  | { kind: 'no-longer-paid' }
  | { kind: 'stripe-error' }

interface SyncSummary {
  alreadyPaid: number
  eligible: number
  failed: number
  noLongerPaid: number
  promoted: number
  raceSkipped: number
  stripeErrors: number
}

const db = createServiceClient()
const stripe = createStripeClient()
const applyChanges = process.argv.includes('--apply')

/** Stop on unsupported flags so an operator cannot accidentally misunderstand the mode. */
function validateArguments(): void {
  const unsupported = process.argv.slice(2).filter(argument => argument !== '--apply')
  if (unsupported.length > 0) throw new Error(`Unsupported arguments: ${unsupported.join(', ')}`)
}

/** Parse a Supabase response and retain the table name in any operational error. */
function parseRows<T>(schema: z.ZodType<T>, data: unknown, table: string): T[] {
  const parsed = z.array(schema).safeParse(data ?? [])
  if (!parsed.success) throw new Error(`Unexpected ${table} data: ${parsed.error.message}`)
  return parsed.data
}

/** Require a successful Supabase read before making any entitlement decision. */
function requireRead<T>(
  result: { data: T | null; error: { message: string } | null },
  table: string
): T {
  if (result.error) throw new Error(`Could not read ${table}: ${result.error.message}`)
  if (result.data === null) throw new Error(`Could not read ${table}: no data returned`)
  return result.data
}

/** Treat a deleted legacy Stripe object as inactive rather than as a transient API failure. */
function isMissingStripeResource(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'resource_missing'
  )
}

/** Load only the historical billing metadata needed to find legacy paid accounts. */
async function loadLegacyRows(): Promise<LegacyRows> {
  const subscriptionsResult = await db
    .from('subscriptions')
    .select('id,user_id,status,price_id')
    .in('status', ['active', 'trialing'])
  const subscriptions = parseRows(
    legacySubscriptionSchema,
    requireRead(subscriptionsResult, 'subscriptions'),
    'subscriptions'
  )
  const priceIds = [...new Set(subscriptions.flatMap(row => (row.price_id ? [row.price_id] : [])))]
  const userIds = [...new Set(subscriptions.map(row => row.user_id))]
  if (priceIds.length === 0 || userIds.length === 0)
    return {
      currentPlans: new Map(),
      prices: new Map(),
      products: new Map(),
      subscriptions
    }

  const [pricesResult, currentResult] = await Promise.all([
    db.from('prices').select('id,product_id').in('id', priceIds),
    db.from('cr_subscriptions').select('owner_id,plan_id').in('owner_id', userIds)
  ])
  const prices = parseRows(legacyPriceSchema, requireRead(pricesResult, 'prices'), 'prices')
  const currentSubscriptions = parseRows(
    currentSubscriptionSchema,
    requireRead(currentResult, 'cr_subscriptions'),
    'cr_subscriptions'
  )
  const productIds = [...new Set(prices.flatMap(row => (row.product_id ? [row.product_id] : [])))]
  const productsResult =
    productIds.length > 0
      ? await db.from('products').select('id,name').in('id', productIds)
      : { data: [], error: null }
  const products = parseRows(
    legacyProductSchema,
    requireRead(productsResult, 'products'),
    'products'
  )

  return {
    currentPlans: new Map(currentSubscriptions.map(row => [row.owner_id, row.plan_id])),
    prices: new Map(prices.flatMap(row => (row.product_id ? [[row.id, row.product_id]] : []))),
    products: new Map(products.flatMap(row => (row.name ? [[row.id, row.name]] : []))),
    subscriptions
  }
}

/** Join historical rows in memory without exposing user billing details in output. */
function buildCandidates(rows: LegacyRows): LegacyPremiumCandidate[] {
  return rows.subscriptions.flatMap(subscription => {
    if (!subscription.price_id) return []
    const productId = rows.prices.get(subscription.price_id)
    const productName = productId ? rows.products.get(productId) : undefined
    if (!(productName && planForLegacyProduct(productName))) return []
    return [
      {
        currentPlan: rows.currentPlans.get(subscription.user_id) ?? 'free',
        ownerId: subscription.user_id,
        productName,
        stripePriceId: subscription.price_id,
        stripeSubscriptionId: subscription.id
      }
    ]
  })
}

/** Ask Stripe for the current state before carrying an old entitlement forward. */
async function inspectCandidate(
  candidate: LegacyPremiumCandidate,
  stripeClient: Stripe
): Promise<Inspection> {
  if (candidate.currentPlan !== 'free') return { kind: 'already-paid' }
  try {
    const subscription = await stripeClient.subscriptions.retrieve(candidate.stripeSubscriptionId)
    const grant = buildLegacyPremiumGrant(candidate, subscription)
    return grant ? { grant, kind: 'eligible' } : { kind: 'no-longer-paid' }
  } catch (error) {
    return { kind: isMissingStripeResource(error) ? 'no-longer-paid' : 'stripe-error' }
  }
}

/** Inspect Stripe in small batches to avoid bursting the billing API. */
async function inspectCandidates(candidates: LegacyPremiumCandidate[]): Promise<Inspection[]> {
  const inspections: Inspection[] = []
  for (let index = 0; index < candidates.length; index += 5) {
    const batch = candidates.slice(index, index + 5)
    inspections.push(
      ...(await Promise.all(batch.map(candidate => inspectCandidate(candidate, stripe))))
    )
  }
  return inspections
}

/** Promote one account only if it is still on Free at the exact write moment. */
async function applyGrant(grant: LegacyPremiumGrant): Promise<'failed' | 'promoted' | 'race'> {
  const { data, error } = await db
    .from('cr_subscriptions')
    .update({
      cancel_at_period_end: grant.cancelAtPeriodEnd,
      current_period_end: grant.currentPeriodEnd,
      grace_period_end: null,
      plan_id: grant.plan,
      status: grant.status,
      stripe_customer_id: grant.stripeCustomerId,
      stripe_price_id: grant.stripePriceId,
      stripe_subscription_id: grant.stripeSubscriptionId,
      updated_at: new Date().toISOString()
    })
    .eq('owner_id', grant.ownerId)
    .eq('plan_id', 'free')
    .select('owner_id')
  if (error) return 'failed'
  return data && data.length > 0 ? 'promoted' : 'race'
}

/** Aggregate a privacy-safe summary and optionally apply every verified grant. */
async function synchronize(inspections: Inspection[]): Promise<SyncSummary> {
  const summary: SyncSummary = {
    alreadyPaid: 0,
    eligible: 0,
    failed: 0,
    noLongerPaid: 0,
    promoted: 0,
    raceSkipped: 0,
    stripeErrors: 0
  }
  for (const inspection of inspections) {
    if (inspection.kind === 'already-paid') summary.alreadyPaid += 1
    if (inspection.kind === 'no-longer-paid') summary.noLongerPaid += 1
    if (inspection.kind === 'stripe-error') summary.stripeErrors += 1
    if (inspection.kind !== 'eligible') continue
    summary.eligible += 1
    if (!applyChanges) continue
    const outcome = await applyGrant(inspection.grant)
    if (outcome === 'promoted') summary.promoted += 1
    if (outcome === 'race') summary.raceSkipped += 1
    if (outcome === 'failed') summary.failed += 1
  }
  return summary
}

/** Run the one-off, idempotent legacy premium reconciliation. */
async function main(): Promise<void> {
  validateArguments()
  const candidates = buildCandidates(await loadLegacyRows())
  const summary = await synchronize(await inspectCandidates(candidates))
  process.stdout.write(
    `${JSON.stringify({ applyChanges, candidates: candidates.length, ...summary }, null, 2)}\n`
  )
  if (summary.failed > 0 || summary.stripeErrors > 0) process.exitCode = 1
}

await main()
