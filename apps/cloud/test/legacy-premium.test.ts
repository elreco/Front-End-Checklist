import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildLegacyPremiumGrant,
  type LegacyPremiumCandidate,
  type LegacyStripeSubscription,
  planForLegacyProduct
} from '../lib/legacy-premium'

const candidate: LegacyPremiumCandidate = {
  currentPlan: 'free',
  ownerId: '6f29df31-81e3-4b69-aa48-c5627eef9ac8',
  productName: 'Pro',
  stripePriceId: 'price_legacy_pro',
  stripeSubscriptionId: 'sub_legacy'
}

/** Build the minimum Stripe subscription fields used by the migration policy. */
function subscription(status: string): LegacyStripeSubscription {
  return {
    cancel_at_period_end: false,
    customer: 'cus_legacy',
    items: {
      data: [{ current_period_end: 1_800_000_000 }]
    },
    status
  }
}

describe('legacy premium reconciliation', () => {
  it('maps only historical CodeRocket paid products', () => {
    assert.equal(planForLegacyProduct('Starter'), 'solo')
    assert.equal(planForLegacyProduct(' pro '), 'solo')
    assert.equal(planForLegacyProduct('Enterprise'), 'agency')
    assert.equal(planForLegacyProduct('Watch Peak Premium'), null)
  })

  it('grants Launch while the historical Stripe subscription is active', () => {
    assert.deepEqual(buildLegacyPremiumGrant(candidate, subscription('active')), {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '2027-01-15T08:00:00.000Z',
      ownerId: candidate.ownerId,
      plan: 'solo',
      status: 'active',
      stripeCustomerId: 'cus_legacy',
      stripePriceId: 'price_legacy_pro',
      stripeSubscriptionId: 'sub_legacy'
    })
  })

  it('does not restore canceled accounts or overwrite an existing paid plan', () => {
    assert.equal(buildLegacyPremiumGrant(candidate, subscription('canceled')), null)
    assert.equal(
      buildLegacyPremiumGrant({ ...candidate, currentPlan: 'agency' }, subscription('active')),
      null
    )
  })
})
