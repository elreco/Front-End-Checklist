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
    assert.ok(entries.every(entry => entry.url.startsWith('https://www.coderocket.app')))
    assert.ok(entries.some(entry => entry.url === 'https://www.coderocket.app/support'))
    assert.ok(entries.some(entry => entry.url === 'https://www.coderocket.app/legal/privacy'))
    assert.ok(
      entries.some(
        entry => entry.url === 'https://www.coderocket.app/guides/tailwind-ai-components'
      )
    )
    assert.ok(
      entries.some(entry => entry.url === 'https://www.coderocket.app/components/7igf4HoGRDc')
    )
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

  it('permanently redirects the documentation host into the canonical docs section', async () => {
    const homepageResponse = await proxy(
      new NextRequest('https://docs.coderocket.app/?source=shortcut')
    )
    assert.equal(homepageResponse.status, 308)
    assert.equal(
      homepageResponse.headers.get('location'),
      'https://www.coderocket.app/docs?source=shortcut'
    )

    const ruleResponse = await proxy(
      new NextRequest('https://docs.coderocket.app/rules/accessibility/semantic-lists')
    )
    assert.equal(ruleResponse.status, 308)
    assert.equal(
      ruleResponse.headers.get('location'),
      'https://www.coderocket.app/docs/rules/accessibility/semantic-lists'
    )

    const canonicalDocsResponse = await proxy(
      new NextRequest('https://docs.coderocket.app/docs/security')
    )
    assert.equal(
      canonicalDocsResponse.headers.get('location'),
      'https://www.coderocket.app/docs/security'
    )
  })

  it('returns 410 for indexed pages from the former product', async () => {
    for (const path of ['/open-source', '/users/legacy-profile', '/components/legacy-demo']) {
      const response = await proxy(new NextRequest(`https://www.coderocket.app${path}`))
      assert.equal(response.status, 410)
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
    }
  })

  it('keeps the documented high-value component archive indexable', async () => {
    const response = await proxy(
      new NextRequest('https://www.coderocket.app/components/7igf4HoGRDc')
    )
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('x-robots-tag'), null)
  })
})
