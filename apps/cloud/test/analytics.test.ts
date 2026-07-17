import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ANALYTICS_CONSENT_DENIED,
  ANALYTICS_CONSENT_GRANTED,
  GOOGLE_ANALYTICS_ID,
  parseAnalyticsConsent
} from '../lib/analytics'

test('uses the configured CodeRocket GA4 measurement ID', () => {
  assert.equal(GOOGLE_ANALYTICS_ID, 'G-0HBMKNN8MQ')
})

test('accepts only current versioned analytics consent values', () => {
  assert.equal(parseAnalyticsConsent(ANALYTICS_CONSENT_GRANTED), 'granted')
  assert.equal(parseAnalyticsConsent(ANALYTICS_CONSENT_DENIED), 'denied')
  assert.equal(parseAnalyticsConsent('granted'), null)
  assert.equal(parseAnalyticsConsent('v0:granted'), null)
  assert.equal(parseAnalyticsConsent(null), null)
})
