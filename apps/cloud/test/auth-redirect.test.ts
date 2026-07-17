import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSafeAuthDestination } from '../lib/auth-redirect'

describe('CodeRocket authentication redirects', () => {
  it('preserves an onboarding URL and its encoded website draft', () => {
    assert.equal(
      getSafeAuthDestination('/onboarding?url=https%3A%2F%2Fwww.example.com'),
      '/onboarding?url=https%3A%2F%2Fwww.example.com'
    )
  })

  it('rejects external, protocol-relative, and malformed destinations', () => {
    for (const destination of [
      'https://example.com',
      '//example.com',
      '/\\example.com',
      'javascript:alert(1)',
      undefined
    ])
      assert.equal(getSafeAuthDestination(destination), '/dashboard')
  })
})
