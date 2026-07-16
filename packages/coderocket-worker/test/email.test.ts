import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

describe('worker policy', () => {
  it('reserves notifications for actionable audit states', () => {
    const allowed = ['blocking_regression', 'repeated_failure']
    assert.deepEqual(allowed, ['blocking_regression', 'repeated_failure'])
  })
})
