import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SafeTextResponse } from '../src/safe-fetch'
import { auditSiteInfrastructure } from '../src/site-infrastructure'

function textResponse(url: string, text: string): SafeTextResponse {
  return {
    url,
    text,
    fetchedAt: new Date(0).toISOString(),
    status: 200,
    durationMs: 10,
    headers: { 'content-type': 'text/plain' }
  }
}

describe('site infrastructure checks', () => {
  it('reports a site-wide crawler block with evidence', async () => {
    const findings = await auditSiteInfrastructure('https://example.com', {
      fetchText: async url =>
        url.endsWith('/robots.txt')
          ? textResponse(url, 'User-agent: *\nDisallow: /\nSitemap: https://example.com/map.xml')
          : textResponse(url, '<urlset></urlset>')
    })
    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.ruleSlug, 'robots-txt')
    assert.equal(findings[0]?.evidence?.observed, 'Disallow: /')
  })

  it('reports missing standard crawl resources without inventing page findings', async () => {
    const findings = await auditSiteInfrastructure('https://example.com', {
      fetchText: async () => {
        throw new Error('HTTP 404')
      }
    })
    assert.deepEqual(
      findings.map(finding => finding.ruleSlug),
      ['robots-txt', 'sitemap-4xx']
    )
  })

  it('ignores transient resource failures instead of reporting a false absence', async () => {
    const findings = await auditSiteInfrastructure('https://example.com', {
      fetchText: async () => {
        throw new Error('Website request timed out')
      }
    })
    assert.deepEqual(findings, [])
  })
})
