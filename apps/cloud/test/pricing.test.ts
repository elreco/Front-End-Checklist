import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  formatLocalizedPrice,
  LOCALIZED_PRICING,
  pricingCurrencyForCountry,
  pricingCurrencyFromHeaders,
  readPricingCurrency,
  stripeCurrency
} from '../lib/pricing'

describe('production localized pricing', () => {
  it('matches the monthly currency options configured in Stripe', () => {
    assert.deepEqual(LOCALIZED_PRICING, {
      AUD: { launch: 49, locale: 'en-AU', studio: 249 },
      CAD: { launch: 45, locale: 'en-CA', studio: 219 },
      CHF: { launch: 27, locale: 'de-CH', studio: 139 },
      EUR: { launch: 29, locale: 'fr-FR', studio: 149 },
      GBP: { launch: 25, locale: 'en-GB', studio: 129 },
      USD: { launch: 32, locale: 'en-US', studio: 169 }
    })
  })

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

  it('accepts only currencies shared by every Checkout line item', () => {
    assert.equal(readPricingCurrency(' usd '), 'USD')
    assert.equal(readPricingCurrency('JPY'), 'EUR')
    assert.equal(readPricingCurrency(null), 'EUR')
    assert.equal(stripeCurrency('CHF'), 'chf')
  })

  it('formats stable localized price points', () => {
    assert.equal(formatLocalizedPrice(32, 'USD'), '$32')
    assert.equal(formatLocalizedPrice(25, 'GBP'), '£25')
    assert.match(formatLocalizedPrice(29, 'EUR'), /29\s?€|€29/)
  })
})
