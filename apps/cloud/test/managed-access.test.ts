import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildManagedAccessPayload,
  getRecommendedManagedAccessKind,
  managedAccessKindIsPageSession
} from '../components/managed-access-connection-helpers'
import { diagnoseAccessBarrier, getManagedAccessLabel } from '../lib/managed-access'

describe('managed access diagnosis', () => {
  it('recognizes hosting and identity protections from saved evidence', () => {
    assert.equal(
      diagnoseAccessBarrier([
        {
          path: '/preview',
          url: 'https://example.com/preview',
          reachable: false,
          error: 'Vercel deployment protection blocked the page'
        }
      ]),
      'vercel'
    )
    assert.equal(
      diagnoseAccessBarrier([
        {
          path: '/admin',
          url: 'https://example.com/admin',
          reachable: false,
          error: 'The site returned a Cloudflare challenge instead of the page'
        }
      ]),
      'cloudflare'
    )
  })

  it('distinguishes sign-in and private-network fallbacks', () => {
    assert.equal(
      diagnoseAccessBarrier([
        {
          path: '/account',
          url: 'https://example.com/account',
          reachable: false,
          error: 'The page redirected to a sign-in screen'
        }
      ]),
      'application_sign_in'
    )
    assert.equal(
      diagnoseAccessBarrier([
        {
          path: '/internal',
          url: 'https://example.com/internal',
          reachable: false,
          error: 'Private or reserved networks are not allowed'
        }
      ]),
      'private_network'
    )
  })

  it('uses labels that do not expose secret material', () => {
    assert.equal(getManagedAccessLabel('browser_login'), 'Dedicated test account')
    assert.equal(getManagedAccessLabel('session_cookie'), 'Dedicated test session')
    assert.equal(getManagedAccessLabel('custom_headers'), 'Custom access headers')
  })

  it('recommends the guided browser login for a normal application sign-in', () => {
    assert.equal(getRecommendedManagedAccessKind('application_sign_in'), 'browser_login')
    assert.equal(managedAccessKindIsPageSession('browser_login'), true)
    assert.equal(managedAccessKindIsPageSession('cloudflare'), false)
  })

  it('keeps a test account scoped to the selected signed-in pages', () => {
    const formData = new FormData()
    formData.set('loginPage', 'https://example.com/login')
    formData.set('username', 'health-check@example.com')
    formData.set('password', 'dedicated-test-secret')

    assert.deepEqual(
      buildManagedAccessPayload('browser_login', 'authenticated', formData, [
        '/dashboard',
        '/account'
      ]),
      {
        kind: 'browser_login',
        loginPage: 'https://example.com/login',
        password: 'dedicated-test-secret',
        paths: ['/dashboard', '/account'],
        scope: 'authenticated',
        username: 'health-check@example.com'
      }
    )
  })
})
