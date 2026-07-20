import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAuthenticatedProductRoute, isChromeFreeRoute } from '../lib/product-routes'

describe('dashboard route chrome', () => {
  it('treats the sites directory exactly like the other dashboard pages', () => {
    assert.equal(isAuthenticatedProductRoute('/sites'), true)
    assert.equal(isAuthenticatedProductRoute('/sites/client-portfolio'), true)
    assert.equal(isChromeFreeRoute('/sites'), true)
    assert.equal(isAuthenticatedProductRoute('/create'), true)
    assert.equal(isAuthenticatedProductRoute('/studio/site-id'), true)
    assert.equal(isAuthenticatedProductRoute('/websites'), true)
    assert.equal(isChromeFreeRoute('/s/published-site'), true)
    assert.equal(isAuthenticatedProductRoute('/s/published-site'), false)
  })

  it('keeps marketing chrome on public pages and hides it on shared reports', () => {
    assert.equal(isChromeFreeRoute('/'), false)
    assert.equal(isChromeFreeRoute('/pricing'), false)
    assert.equal(isChromeFreeRoute('/reports/client-token'), true)
    assert.equal(isAuthenticatedProductRoute('/reports/client-token'), false)
  })
})
