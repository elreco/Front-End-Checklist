import { createServiceClient } from '@coderocket/db'
import Stripe from 'stripe'
import { z } from 'zod'
import type { WorkerJob } from './audit-job'

const billableTaskSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  billable_overage_microeur: z.number().int().positive(),
  stripe_meter_event_identifier: z.string().min(1),
  billing_reported_at: z.string().nullable()
})

/** Report one settled AI overage to Stripe's meter exactly once. */
export async function processAiUsageJob(job: WorkerJob): Promise<void> {
  const taskId = typeof job.payload.taskId === 'string' ? job.payload.taskId : ''
  if (!taskId) throw new Error('AI usage job has no task identifier')

  const db = createServiceClient()
  const { data: taskData, error: taskError } = await db
    .from('cr_ai_tasks')
    .select(
      'id,owner_id,billable_overage_microeur,stripe_meter_event_identifier,billing_reported_at'
    )
    .eq('id', taskId)
    .eq('owner_id', job.owner_id)
    .single()
  if (taskError) throw new Error(taskError.message)
  const task = billableTaskSchema.parse(taskData)
  if (task.billing_reported_at) return

  const { data: subscription, error: subscriptionError } = await db
    .from('cr_subscriptions')
    .select('stripe_customer_id,status,grace_period_end')
    .eq('owner_id', task.owner_id)
    .in('plan_id', ['solo', 'agency'])
    .single()
  if (subscriptionError) throw new Error(subscriptionError.message)
  if (!subscription.stripe_customer_id) throw new Error('Stripe customer is unavailable')

  const secretKey = process.env.STRIPE_SECRET_KEY
  const eventName = process.env.STRIPE_AI_METER_EVENT_NAME
  if (!(secretKey && eventName)) throw new Error('Stripe AI metering is not configured')
  const stripe = new Stripe(secretKey)
  await stripe.billing.meterEvents.create(
    {
      event_name: eventName,
      identifier: task.stripe_meter_event_identifier,
      payload: {
        stripe_customer_id: subscription.stripe_customer_id,
        value: String(task.billable_overage_microeur)
      }
    },
    { idempotencyKey: task.stripe_meter_event_identifier }
  )

  const { error: updateError } = await db
    .from('cr_ai_tasks')
    .update({
      billing_reported_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', task.id)
    .is('billing_reported_at', null)
  if (updateError) throw new Error(updateError.message)
}
