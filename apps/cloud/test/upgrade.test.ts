import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPricingHref,
  getNextPlan,
  getPageLimitUpgrade,
  parsePricingUpgradeContext,
  parseUpgradeSource
} from '../lib/upgrade'

describe('contextual upgrades', () => {
  it('moves through only the self-serve plans', () => {
    assert.equal(getNextPlan('free'), 'solo')
    assert.equal(getNextPlan('solo'), 'agency')
    assert.equal(getNextPlan('agency'), undefined)
  })

  it('describes the extra page capacity unlocked by the next plan', () => {
    assert.deepEqual(getPageLimitUpgrade('free'), {
      additionalPages: 20,
      targetLimit: 25,
      targetPlan: 'solo'
    })
    assert.deepEqual(getPageLimitUpgrade('solo'), {
      additionalPages: 25,
      targetLimit: 50,
      targetPlan: 'agency'
    })
    assert.equal(getPageLimitUpgrade('agency'), undefined)
  })

  it('builds and parses a non-identifying pricing attribution', () => {
    const href = buildPricingHref({
      currentPlan: 'free',
      recommendedPlan: 'solo',
      source: 'page_limit'
    })
    assert.equal(href, '/pricing?current=free&recommended=solo&source=page_limit')
    assert.deepEqual(
      parsePricingUpgradeContext({
        current: 'free',
        recommended: 'solo',
        source: 'page_limit'
      }),
      {
        currentPlan: 'free',
        recommendedPlan: 'solo',
        source: 'page_limit'
      }
    )
  })

  it('rejects arbitrary attribution values', () => {
    assert.equal(parseUpgradeSource('campaign-from-user-input'), undefined)
    assert.deepEqual(
      parsePricingUpgradeContext({
        current: ['free', 'agency'],
        recommended: 'free',
        source: 'unknown'
      }),
      {
        currentPlan: undefined,
        recommendedPlan: undefined,
        source: undefined
      }
    )
  })
})
