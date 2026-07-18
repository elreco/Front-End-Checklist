import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSecureAccessCopy, getAccessGuidance } from '../lib/secure-access-copy'

const base = {
  authenticatedPages: ['/account'],
  configuration: 'name: CodeRocket secure website check',
  configurationLocation: '.github/workflows/coderocket.yml',
  pages: ['/', '/account'],
  platformLabel: 'GitHub Actions',
  siteUrl: 'https://example.com'
}

describe('secure access handoff copy', () => {
  it('builds a developer handoff without embedding secrets', () => {
    const copy = buildSecureAccessCopy({ ...base, accessMethods: ['account'] })
    assert.match(copy.developerInstructions, /dedicated, least-privileged test account/)
    assert.match(copy.developerInstructions, /CODEROCKET_TOKEN/)
    assert.match(copy.developerInstructions, /CODEROCKET_AUTH_HEADERS_JSON/)
    assert.match(copy.developerInstructions, /\/ — anonymous/)
    assert.match(copy.developerInstructions, /\/account — signed-in session/)
    assert.match(copy.developerInstructions, /Success criteria/)
    assert.match(copy.developerInstructions, /https:\/\/example\.com/)
    assert.doesNotMatch(copy.developerInstructions, /session=test-session/)
  })

  it('builds a scoped identity-proxy request for a hosting provider', () => {
    const copy = buildSecureAccessCopy({ ...base, accessMethods: ['cloudflare'] })
    assert.match(copy.providerRequest, /identity-aware proxy/)
    assert.match(copy.providerRequest, /must not disable protection/)
    assert.match(copy.providerRequest, /revocable/)
    assert.match(copy.providerRequest, /- \/\n- \/account/)
  })

  it('requires a trusted runner rather than public exposure for private networks', () => {
    assert.match(getAccessGuidance(['network']), /self-hosted runner/)
    assert.match(getAccessGuidance(['network']), /instead of exposing/)
  })

  it('combines Cloudflare, account, and network requirements', () => {
    const copy = buildSecureAccessCopy({
      ...base,
      accessMethods: ['cloudflare', 'account', 'network']
    })
    assert.match(copy.developerInstructions, /Cloudflare Access/)
    assert.match(copy.developerInstructions, /test account/)
    assert.match(copy.developerInstructions, /self-hosted runner/)
    assert.match(copy.providerRequest, /1\. For the identity proxy or WAF/)
    assert.match(copy.providerRequest, /2\. Provide a dedicated test account/)
    assert.match(copy.providerRequest, /3\. Provide a self-hosted automation runner/)
  })

  it('covers common infrastructure restrictions without pretending to solve challenges', () => {
    const guidance = getAccessGuidance([
      'basic_auth',
      'custom_headers',
      'ip_allowlist',
      'client_certificate',
      'bot_challenge'
    ])
    assert.match(guidance, /Basic Authorization/)
    assert.match(guidance, /stable, approved egress/)
    assert.match(guidance, /client certificate/)
    assert.match(guidance, /cannot solve CAPTCHA/)
  })

  it('explains what the browser runner can and cannot automate', () => {
    const copy = buildSecureAccessCopy({ ...base, accessMethods: ['browser_session'] })
    assert.match(copy.developerInstructions, /JavaScript is executed/)
    assert.match(copy.developerInstructions, /CAPTCHA, MFA, and interactive SSO/)
    assert.match(copy.providerRequest, /dedicated reusable browser session/)
  })
})
