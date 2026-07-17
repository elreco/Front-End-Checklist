import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { paidPlanItem } from '../lib/stripe'

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
})
