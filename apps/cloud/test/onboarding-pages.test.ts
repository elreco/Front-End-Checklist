import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countEnteredPages } from '../lib/onboarding-pages'

describe('onboarding page capacity', () => {
  it('counts distinct non-empty page lines', () => {
    assert.equal(countEnteredPages('/\n/pricing\n/contact\n'), 3)
    assert.equal(countEnteredPages('\n\n'), 0)
  })

  it('does not charge duplicate slash variants twice', () => {
    assert.equal(countEnteredPages('/pricing\n/pricing/\n/pricing//'), 1)
  })
})
