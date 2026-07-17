import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSecureAccessCopy, getAccessGuidance } from '../lib/secure-access-copy'

const base = {
  configuration: 'name: CodeRocket secure website check',
  configurationLocation: '.github/workflows/coderocket.yml',
  pages: ['/', '/account'],
  platformLabel: 'GitHub Actions',
  siteUrl: 'https://example.com'
}

describe('secure access handoff copy', () => {
  it('builds a developer handoff without embedding secrets', () => {
    const copy = buildSecureAccessCopy({ ...base, accessMethod: 'account' })
    assert.match(copy.developerInstructions, /dedicated, least-privileged test account/)
    assert.match(copy.developerInstructions, /CODEROCKET_TOKEN/)
    assert.match(copy.developerInstructions, /CODEROCKET_SITE_HEADERS_JSON/)
    assert.match(copy.developerInstructions, /Success criteria/)
    assert.match(copy.developerInstructions, /https:\/\/example\.com/)
    assert.doesNotMatch(copy.developerInstructions, /session=test-session/)
  })

  it('builds a scoped Cloudflare request for a hosting provider', () => {
    const copy = buildSecureAccessCopy({ ...base, accessMethod: 'cloudflare' })
    assert.match(copy.providerRequest, /Cloudflare Access/)
    assert.match(copy.providerRequest, /must not disable protection/)
    assert.match(copy.providerRequest, /revocable/)
    assert.match(copy.providerRequest, /- \/\n- \/account/)
  })

  it('requires a trusted runner rather than public exposure for private networks', () => {
    assert.match(getAccessGuidance('network'), /self-hosted runner/)
    assert.match(getAccessGuidance('network'), /Do not expose/)
  })
})
