import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  estimateBrowserRuntimeCostMicroeur,
  estimateVisualAiCostMicroeur
} from '../src/site-import-job'

describe('responsive website import cost', () => {
  it('keeps a bounded vision request inside both per-import reservations', () => {
    const visualCost = estimateVisualAiCostMicroeur(
      {
        cached_input_microusd_per_million: 250_000,
        input_microusd_per_million: 2_500_000,
        output_microusd_per_million: 15_000_000
      },
      {
        cachedInputTokens: 0,
        inputTokens: 40_000,
        outputTokens: 1_800,
        reasoningTokens: 600,
        totalTokens: 41_800
      }
    )

    assert.equal(visualCost, 158_750)
    assert.ok(visualCost + 10 * 5_000 < 250_000)
    assert.ok(visualCost + 50 * 5_000 < 750_000)
  })

  it('meters slow browser work in conservative whole-minute blocks', () => {
    assert.equal(estimateBrowserRuntimeCostMicroeur(0, 0), 0)
    assert.equal(estimateBrowserRuntimeCostMicroeur(0, 1), 5_000)
    assert.equal(estimateBrowserRuntimeCostMicroeur(0, 60_001), 10_000)
  })
})
