import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  deriveWebsiteName,
  normalizeInitialSiteInstruction,
  normalizeWebsiteDraft
} from '../lib/website-draft'

describe('CodeRocket landing-page website drafts', () => {
  it('adds HTTPS and preserves the useful starting page without query secrets', () => {
    assert.equal(normalizeWebsiteDraft(' example.com/pricing '), 'https://example.com/pricing')
    assert.equal(
      normalizeWebsiteDraft('https://www.example.com/contact?source=hero'),
      'https://www.example.com/contact'
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

  it('keeps a bounded optional request without preserving accidental whitespace', () => {
    assert.equal(
      normalizeInitialSiteInstruction('  Turn this website into a simple online shop.  '),
      'Turn this website into a simple online shop.'
    )
    assert.equal(normalizeInitialSiteInstruction(''), undefined)
    assert.equal(normalizeInitialSiteInstruction('x'), undefined)
    assert.equal(normalizeInitialSiteInstruction('x'.repeat(2001)), undefined)
  })
})
