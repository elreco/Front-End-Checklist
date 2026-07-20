import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildBrowserHandoffEndpoint,
  estimateBrowserHandoffCostMicroeur
} from '../src/browser-handoff'
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

  it('meters the human handoff and reconnects only to the configured provider host', () => {
    const credential = {
      browserWsEndpoint: 'wss://production-lon.browserless.io/session/abc',
      costMicroeurPerMinute: 20_000,
      liveUrl: 'https://production-lon.browserless.io/live/index.html?i=abc',
      liveUrlId: 'abc',
      providerExpiresAt: '1970-01-01T00:05:00.000Z',
      providerStartedAt: '1970-01-01T00:00:00.000Z'
    }
    assert.equal(estimateBrowserHandoffCostMicroeur(credential, 1), 20_000)
    assert.equal(estimateBrowserHandoffCostMicroeur(credential, 60_001), 40_000)
    assert.equal(estimateBrowserHandoffCostMicroeur(credential, 3_600_000), 100_000)

    const previousEndpoint = process.env.CODEROCKET_BROWSERLESS_WS_ENDPOINT
    const previousToken = process.env.CODEROCKET_BROWSERLESS_TOKEN
    process.env.CODEROCKET_BROWSERLESS_WS_ENDPOINT =
      'wss://production-lon.browserless.io/chromium/stealth'
    process.env.CODEROCKET_BROWSERLESS_TOKEN = 'provider-secret'
    try {
      const endpoint = new URL(buildBrowserHandoffEndpoint(credential))
      assert.equal(endpoint.host, 'production-lon.browserless.io')
      assert.equal(endpoint.searchParams.get('token'), 'provider-secret')
      assert.throws(() =>
        buildBrowserHandoffEndpoint({
          ...credential,
          browserWsEndpoint: 'wss://attacker.example/session/abc'
        })
      )
    } finally {
      if (previousEndpoint === undefined) delete process.env.CODEROCKET_BROWSERLESS_WS_ENDPOINT
      else process.env.CODEROCKET_BROWSERLESS_WS_ENDPOINT = previousEndpoint
      if (previousToken === undefined) delete process.env.CODEROCKET_BROWSERLESS_TOKEN
      else process.env.CODEROCKET_BROWSERLESS_TOKEN = previousToken
    }
  })
})
