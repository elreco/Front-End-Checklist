import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  stripeConnectedAccountName,
  stripeConnectedAccountStatus,
  stripeConnectReturnUrl
} from '../lib/stripe-connect'

describe('Stripe project connection', () => {
  it('returns to the exact project on the configured public origin', () => {
    assert.equal(
      stripeConnectReturnUrl(
        'http://0.0.0.0:3100/api/studio/site-123/connections/stripe/start',
        'site-123',
        ''
      ),
      'http://0.0.0.0:3100/api/connections/stripe/return?siteId=site-123'
    )
  })

  it('shows only safe business-facing account state', () => {
    const account = {
      business_profile: { name: 'Northstar Shop' },
      charges_enabled: true
    }

    assert.equal(stripeConnectedAccountStatus(account), 'connected')
    assert.equal(stripeConnectedAccountName(account), 'Northstar Shop')
    assert.equal(stripeConnectedAccountStatus({ ...account, charges_enabled: false }), 'attention')
  })
})
