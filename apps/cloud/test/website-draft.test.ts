import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deriveWebsiteName, normalizeWebsiteDraft } from '../lib/website-draft'

describe('CodeRocket landing-page website drafts', () => {
  it('adds HTTPS and keeps only the website origin', () => {
    assert.equal(normalizeWebsiteDraft(' example.com/pricing '), 'https://example.com')
    assert.equal(
      normalizeWebsiteDraft('https://www.example.com/contact?source=hero'),
      'https://www.example.com'
    )
  })

  it('rejects insecure, credentialed, and invalid addresses', () => {
    assert.equal(normalizeWebsiteDraft('http://example.com'), undefined)
    assert.equal(normalizeWebsiteDraft('https://user:secret@example.com'), undefined)
    assert.equal(normalizeWebsiteDraft('not a website'), undefined)
    assert.equal(normalizeWebsiteDraft('https://not%20a%20website'), undefined)
    assert.equal(normalizeWebsiteDraft('https://invalid_host.example'), undefined)
  })

  it('derives an editable website name from the hostname', () => {
    assert.equal(deriveWebsiteName('https://www.front-end-checklist.com'), 'Front end checklist')
  })
})
