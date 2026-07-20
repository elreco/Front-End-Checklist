import { createServiceClient } from '@coderocket/db'
import type Stripe from 'stripe'
import {
  createStripeClient,
  paidPlanItem,
  planForSubscriptionStatus,
  storedPaidPlan,
  stripeCustomerId,
  stripeSubscriptionPeriodEnd
} from '@/lib/stripe'

export const runtime = 'nodejs'

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

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!(signature && secret))
    return Response.json({ error: 'Webhook configuration is missing' }, { status: 400 })
  const stripe = createStripeClient()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }
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
