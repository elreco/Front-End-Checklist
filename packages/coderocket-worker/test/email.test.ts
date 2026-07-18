import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allowsEmailAlert, readEmailAlertKind } from '../src/email-policy'

describe('worker policy', () => {
  it('keeps each actionable alert independently configurable', () => {
    const preferences = {
      checkFailures: false,
      enabled: true,
      newProblems: true
    }
    assert.equal(allowsEmailAlert(preferences, 'new_problems'), true)
    assert.equal(allowsEmailAlert(preferences, 'check_failures'), false)
  })

  it('blocks every alert when site email is disabled', () => {
    const preferences = {
      checkFailures: true,
      enabled: false,
      newProblems: true
    }
    assert.equal(allowsEmailAlert(preferences, 'new_problems'), false)
    assert.equal(allowsEmailAlert(preferences, 'check_failures'), false)
  })

  it('accepts only durable queued alert kinds', () => {
    assert.equal(readEmailAlertKind('new_problems'), 'new_problems')
    assert.equal(readEmailAlertKind('check_failures'), 'check_failures')
    assert.equal(readEmailAlertKind('marketing'), undefined)
  })
})
