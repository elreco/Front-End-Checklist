import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatLocalizedPrice,
  pricingCurrencyForCountry,
  pricingCurrencyFromHeaders
} from '../lib/pricing'

describe('localized pricing', () => {
  it('maps supported customer countries to their billing currency', () => {
    assert.equal(pricingCurrencyForCountry('US'), 'USD')
    assert.equal(pricingCurrencyForCountry('gb'), 'GBP')
    assert.equal(pricingCurrencyForCountry('CA'), 'CAD')
    assert.equal(pricingCurrencyForCountry('FR'), 'EUR')
  })

  it('prefers the Cloudflare country header', () => {
    const requestHeaders = new Headers({
      'cf-ipcountry': 'AU',
      'x-vercel-ip-country': 'US'
    })
    assert.equal(pricingCurrencyFromHeaders(requestHeaders), 'AUD')
  })

  it('formats stable localized price points', () => {
    assert.equal(formatLocalizedPrice(14, 'USD'), '$14')
    assert.equal(formatLocalizedPrice(11, 'GBP'), '£11')
    assert.match(formatLocalizedPrice(12, 'EUR'), /€12|12\s€/)
  })
})
