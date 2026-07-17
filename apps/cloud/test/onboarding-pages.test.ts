import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { countEnteredPages, getImportedPages, mergeEnteredPages } from '../lib/onboarding-pages'

describe('onboarding page capacity', () => {
  it('counts distinct non-empty page lines', () => {
    assert.equal(countEnteredPages('/\n/pricing\n/contact\n'), 3)
    assert.equal(countEnteredPages('\n\n'), 0)
  })

  it('does not charge duplicate slash variants twice', () => {
    assert.equal(countEnteredPages('/pricing\n/pricing/\n/pricing//'), 1)
  })

  it('imports same-site sitemap URLs and ignores assets or other hosts', () => {
    assert.deepEqual(
      getImportedPages(
        '<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/docs/start</loc></url><url><loc>https://example.com/app.js</loc></url><url><loc>https://other.example/pricing</loc></url></urlset>',
        'https://example.com'
      ),
      ['/', '/docs/start']
    )
  })

  it('imports JSON and newline route lists before merging them', () => {
    const imported = getImportedPages(
      JSON.stringify({ routes: ['/pricing', '/contact/', 'https://example.com/about'] }),
      'https://example.com'
    )
    assert.equal(mergeEnteredPages('/\n/pricing', imported), '/\n/pricing\n/contact\n/about')
  })

  it('uses only route-bearing JSON fields and the first CSV column', () => {
    assert.deepEqual(
      getImportedPages(
        JSON.stringify({ title: 'Marketing pages', routes: ['/pricing', '/about'] }),
        'https://example.com'
      ),
      ['/pricing', '/about']
    )
    assert.deepEqual(
      getImportedPages(
        'path,title\n/contact,Contact us\n/docs,Documentation',
        'https://example.com'
      ),
      ['/contact', '/docs']
    )
  })
})
