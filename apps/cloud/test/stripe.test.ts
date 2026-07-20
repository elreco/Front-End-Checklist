import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  paidPlanItem,
  planForSubscriptionStatus,
  storedPaidPlan,
  stripeCustomerId,
  stripeSubscriptionPeriodEnd
} from '../lib/stripe'

describe('Stripe subscription plan selection', () => {
  it('finds the licensed plan when a metered AI item is first', () => {
    process.env.STRIPE_SOLO_PRICE_ID = 'price_solo'
    process.env.STRIPE_AGENCY_PRICE_ID = 'price_agency'

    assert.deepEqual(
      paidPlanItem([
        { price: { id: 'price_ai_usage' }, current_period_end: 100 },
        { price: { id: 'price_solo' }, current_period_end: 200 }
      ]),
      { currentPeriodEnd: 200, plan: 'solo', priceId: 'price_solo' }
    )
  })

  it('returns null when a subscription has no CodeRocket base plan', () => {
    process.env.STRIPE_SOLO_PRICE_ID = 'price_solo'
    process.env.STRIPE_AGENCY_PRICE_ID = 'price_agency'

    assert.equal(paidPlanItem([{ price: { id: 'price_ai_usage' }, current_period_end: 100 }]), null)
  })

  it('preserves known paid plans for grandfathered Stripe prices', () => {
    assert.equal(storedPaidPlan('solo'), 'solo')
    assert.equal(storedPaidPlan('agency'), 'agency')
    assert.equal(storedPaidPlan('free'), null)
    assert.equal(storedPaidPlan('legacy'), null)
  })

  it('keeps paid access only for entitled Stripe lifecycle states', () => {
    assert.equal(planForSubscriptionStatus('active', 'solo'), 'solo')
    assert.equal(planForSubscriptionStatus('trialing', 'agency'), 'agency')
    assert.equal(planForSubscriptionStatus('past_due', 'solo'), 'solo')
    assert.equal(planForSubscriptionStatus('unpaid', 'solo'), 'free')
    assert.equal(planForSubscriptionStatus('canceled', 'agency'), 'free')
  })

  it('normalizes expanded customer IDs and multi-item period ends', () => {
    assert.equal(stripeCustomerId('cus_123'), 'cus_123')
    assert.equal(stripeCustomerId({ id: 'cus_456' }), 'cus_456')
    assert.equal(
      stripeSubscriptionPeriodEnd([{ current_period_end: 100 }, { current_period_end: 250 }]),
      250
    )
    assert.equal(stripeSubscriptionPeriodEnd([]), null)
  })
})
