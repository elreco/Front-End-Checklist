import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calculateBrowserHandoffDurationMs } from '../lib/browser-handoff'

describe('guided browser duration', () => {
  it('keeps an affordable session between four and ten minutes', () => {
    assert.equal(calculateBrowserHandoffDurationMs(25_000), 4 * 60_000)
    assert.equal(calculateBrowserHandoffDurationMs(20_000), 5 * 60_000)
    assert.equal(calculateBrowserHandoffDurationMs(10_000), 10 * 60_000)
    assert.equal(calculateBrowserHandoffDurationMs(1), 10 * 60_000)
  })
})
