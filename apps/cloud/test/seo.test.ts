import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { NextRequest } from 'next/server'
import robots from '../app/robots'
import sitemap from '../app/sitemap'
import { proxy } from '../proxy'

describe('CodeRocket search foundations', () => {
  it('publishes only canonical public pages in the sitemap', () => {
    const entries = sitemap()
    assert.ok(entries.every(entry => entry.url.startsWith('https://www.coderocket.app')))
    for (const path of [
      '',
      '/pricing',
      '/integrations',
      '/support',
      '/legal/privacy',
      '/legal/terms'
    ])
      assert.ok(entries.some(entry => entry.url === `https://www.coderocket.app${path}`))
    assert.ok(!entries.some(entry => entry.url.includes('/login')))
    assert.ok(!entries.some(entry => entry.url.includes('/dashboard')))
  })

  it('keeps public pages crawlable while excluding internal endpoints', () => {
    const policy = robots()
    assert.deepEqual(policy.rules, {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/']
    })
    assert.equal(policy.sitemap, 'https://www.coderocket.app/sitemap.xml')
  })

  it('permanently redirects the apex to canonical www while preserving the request', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:3100/pricing?plan=agency', {
        headers: { host: 'coderocket.app:443' }
      })
    )
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), 'https://www.coderocket.app/pricing?plan=agency')
  })
})
