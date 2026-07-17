import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { billingConnectionState, eurosToMicroeuros, summarizeAiUsage } from '../lib/billing'

describe('AI usage and billing controls', () => {
  it('estimates full analyses from unconsumed and unreserved included credits', () => {
    const summary = summarizeAiUsage({
      billedOverageMicroeur: 0,
      consumedCredits: 1_200,
      includedCredits: 3_000,
      overageCapMicroeur: 0,
      overageEnabled: false,
      periodEndsAt: '2026-08-17T00:00:00.000Z',
      reservedCredits: 800
    })
    assert.equal(summary.remainingIncludedCredits, 1_000)
    assert.equal(summary.estimatedAnalysesRemaining, 1)
    assert.equal(summary.includedUsagePercent, 67)
  })

  it('warns at 80% and blocks at 100% of the selected spending budget', () => {
    const warning = summarizeAiUsage({
      billedOverageMicroeur: 8_000_000,
      consumedCredits: 100_000,
      includedCredits: 100_000,
      overageCapMicroeur: 10_000_000,
      overageEnabled: true,
      periodEndsAt: '2026-08-17T00:00:00.000Z',
      reservedCredits: 0
    })
    const blocked = summarizeAiUsage({
      ...warning,
      billedOverageMicroeur: 10_000_000
    })
    assert.equal(warning.alert?.tone, 'warning')
    assert.equal(warning.overageUsagePercent, 80)
    assert.equal(blocked.alert?.tone, 'danger')
    assert.equal(blocked.overageUsagePercent, 100)
  })

  it('distinguishes free, connected, and test subscriptions', () => {
    const disconnected = { hasStripeCustomer: false, hasStripeSubscription: false }
    assert.equal(billingConnectionState('free', disconnected), 'free')
    assert.equal(billingConnectionState('agency', disconnected), 'test')
    assert.equal(
      billingConnectionState('solo', {
        hasStripeCustomer: true,
        hasStripeSubscription: false
      }),
      'connected'
    )
  })

  it('stores whole-euro budgets as integer micro-euros', () => {
    assert.equal(eurosToMicroeuros(20), 20_000_000)
  })
})
