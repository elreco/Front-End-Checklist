import { createServiceClient } from '@coderocket/db'
import type Stripe from 'stripe'
import { readConnectionPublicConfig } from '@/lib/builder-connections'
import {
  createStripeClient,
  paidPlanItem,
  planForSubscriptionStatus,
  storedPaidPlan,
  stripeCustomerId,
  stripeSubscriptionPeriodEnd
} from '@/lib/stripe'
import { stripeConnectedAccountName, stripeConnectedAccountStatus } from '@/lib/stripe-connect'

export const runtime = 'nodejs'

/** Convert an optional Stripe epoch timestamp into the database date format. */
function unixDate(value: number | null | undefined): string | null {
  return value ? new Date(value * 1000).toISOString() : null
}

/** Apply both current-price and grandfathered Stripe subscription events. */
async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const db = createServiceClient()
  const { data: stored, error: storedError } = await db
    .from('cr_subscriptions')
    .select('owner_id,plan_id,stripe_price_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()
  if (storedError) throw new Error(storedError.message)

  const planItem = paidPlanItem(subscription.items.data)
  const ownerId = stored?.owner_id ?? subscription.metadata.ownerId
  const paidPlan = planItem?.plan ?? storedPaidPlan(stored?.plan_id)
  if (!(ownerId && paidPlan)) return
  const periodEnd =
    planItem?.currentPeriodEnd ?? stripeSubscriptionPeriodEnd(subscription.items.data)
  const { error } = await db.from('cr_subscriptions').upsert(
    {
      owner_id: ownerId,
      stripe_customer_id: stripeCustomerId(subscription.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: planItem?.priceId ?? stored?.stripe_price_id ?? null,
      plan_id: planForSubscriptionStatus(subscription.status, paidPlan),
      status: subscription.status,
      current_period_end: unixDate(periodEnd),
      grace_period_end:
        subscription.status === 'past_due'
          ? new Date(Date.now() + 7 * 86_400_000).toISOString()
          : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'owner_id' }
  )
  if (error) throw new Error(error.message)
}

/** Keep every project using this connected account aligned with Stripe requirements. */
async function syncConnectedAccount(account: Stripe.Account): Promise<void> {
  const db = createServiceClient()
  const { data: connections, error: readError } = await db
    .from('cr_builder_connections')
    .select('id,public_config')
    .eq('provider', 'stripe')
    .contains('public_config', { accountId: account.id })
  if (readError) throw new Error(readError.message)
  for (const connection of connections ?? []) {
    const publicConfig = readConnectionPublicConfig(connection.public_config)
    const { error } = await db
      .from('cr_builder_connections')
      .update({
        status: stripeConnectedAccountStatus(account),
        display_name: stripeConnectedAccountName(account),
        public_config: {
          ...publicConfig,
          defaultCurrency: account.default_currency ?? 'eur'
        },
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)
    if (error) throw new Error(error.message)
  }
}

/** Verify and apply platform or connected-account events delivered by Stripe. */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  ].filter((value): value is string => Boolean(value))
  if (!(signature && secrets.length > 0))
    return Response.json({ error: 'Webhook configuration is missing' }, { status: 400 })
  const stripe = createStripeClient()
  const payload = await request.text()
  const event = readStripeEvent(stripe, payload, signature, secrets)
  if (!event) return Response.json({ error: 'Invalid webhook signature' }, { status: 400 })
  const db = createServiceClient()
  const { data: seen } = await db
    .from('cr_stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()
  if (seen) return Response.json({ received: true, replay: true })

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await syncSubscription(event.data.object)
  }
  if (event.type === 'account.updated') await syncConnectedAccount(event.data.object)
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (customerId)
      await db
        .from('cr_subscriptions')
        .update({
          status: 'past_due',
          grace_period_end: new Date(Date.now() + 7 * 86_400_000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_customer_id', customerId)
  }
  await db
    .from('cr_stripe_events')
    .insert({ event_id: event.id, event_type: event.type, payload: event })
  return Response.json({ received: true })
}

/** Try each configured destination secret without weakening Stripe signature verification. */
function readStripeEvent(
  stripe: Stripe,
  payload: string,
  signature: string,
  secrets: string[]
): Stripe.Event | undefined {
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret)
    } catch {
      // The signature may belong to the other production Stripe destination.
    }
  }
  return undefined
}
