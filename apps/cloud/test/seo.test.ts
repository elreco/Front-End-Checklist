import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { NextRequest } from 'next/server'
import robots from '../app/robots'
import sitemap from '../app/sitemap'
import { DOCUMENTATION_RULES } from '../lib/docs'
import { proxy } from '../proxy'

describe('CodeRocket search foundations', () => {
  it('publishes only canonical public pages in the sitemap', () => {
    const entries = sitemap()
    assert.ok(entries.every(entry => entry.url.startsWith('https://coderocket.app')))
    assert.ok(entries.some(entry => entry.url === 'https://coderocket.app/support'))
    assert.ok(entries.some(entry => entry.url === 'https://coderocket.app/legal/privacy'))
    assert.ok(!entries.some(entry => entry.url.includes('/login')))
    assert.ok(!entries.some(entry => entry.url.includes('/dashboard')))
    assert.equal(
      entries.filter(entry => entry.url.includes('/docs/rules/')).length,
      DOCUMENTATION_RULES.length
    )
  })

  it('keeps noindex pages crawlable while excluding internal endpoints', () => {
    const policy = robots()
    assert.deepEqual(policy.rules, {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/']
    })
    assert.equal(policy.sitemap, 'https://coderocket.app/sitemap.xml')
  })

  it('permanently redirects www to the canonical apex without leaking a port', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:3100/pricing', {
        headers: { host: 'www.coderocket.app' }
      })
    )
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), 'https://coderocket.app/pricing')
  })

  it('returns 410 for indexed pages from the former product', async () => {
    for (const path of ['/open-source', '/users/legacy-profile', '/components/legacy-demo']) {
      const response = await proxy(new NextRequest(`https://coderocket.app${path}`))
      assert.equal(response.status, 410)
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
    }
  })
})
