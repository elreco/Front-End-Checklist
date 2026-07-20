import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getAuthRedirectUrl, getSafeAuthDestination } from '../lib/auth-redirect'

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

  it('uses the configured public origin behind a reverse proxy', () => {
    assert.equal(
      getAuthRedirectUrl(
        '/dashboard',
        'https://0.0.0.0:3000/auth/callback?code=oauth-code',
        'https://www.coderocket.app'
      ).toString(),
      'https://www.coderocket.app/dashboard'
    )
  })

  it('keeps the request origin when no valid public origin is configured', () => {
    assert.equal(
      getAuthRedirectUrl(
        '/dashboard',
        'http://localhost:3100/auth/callback?code=oauth-code',
        ''
      ).toString(),
      'http://localhost:3100/dashboard'
    )
    assert.equal(
      getAuthRedirectUrl(
        '/login?error=callback',
        'http://localhost:3100/auth/callback',
        'not a URL'
      ).toString(),
      'http://localhost:3100/login?error=callback'
    )
  })
})
