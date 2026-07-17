import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { filterBaselineForSubmittedPages, normalizeSubmittedPages } from '../lib/audit-submission'

const finding = {
  pagePath: '/pricing',
  ruleSlug: 'meta-title',
  title: 'Write a descriptive page title',
  priority: 'high' as const,
  message: 'The title is missing.'
}

describe('CLI audit submission consistency', () => {
  it('normalizes finding paths to the submitted page identity', () => {
    const pages = normalizeSubmittedPages([
      { url: 'https://example.com/Pricing/', reachable: true, findings: [{ ...finding }] }
    ])
    assert.equal(pages[0]?.findings[0]?.pagePath, '/pricing')
  })

  it('rejects duplicate identities and findings attached to another page', () => {
    assert.throws(
      () =>
        normalizeSubmittedPages([
          { url: 'https://example.com/pricing', reachable: true, findings: [] },
          { url: 'https://preview.example.com/PRICING/', reachable: true, findings: [] }
        ]),
      /Duplicate page identity/
    )
    assert.throws(
      () =>
        normalizeSubmittedPages([
          { url: 'https://example.com/contact', reachable: true, findings: [finding] }
        ]),
      /same page path/
    )
  })

  it('rejects credentials and findings claimed for unreachable pages', () => {
    assert.throws(
      () =>
        normalizeSubmittedPages([
          { url: 'https://user:secret@example.com/', reachable: true, findings: [] }
        ]),
      /credentials/
    )
    assert.throws(
      () =>
        normalizeSubmittedPages([
          { url: 'https://example.com/pricing', reachable: false, findings: [finding] }
        ]),
      /cannot contain findings/
    )
  })

  it('never resolves findings from pages omitted by a partial runner check', () => {
    const pages = normalizeSubmittedPages([
      { url: 'https://example.com/pricing', reachable: true, findings: [] }
    ])
    const baseline = filterBaselineForSubmittedPages(
      [
        finding,
        {
          ...finding,
          pagePath: '/account',
          ruleSlug: 'form-labels',
          title: 'Give every field a visible label'
        }
      ],
      pages
    )

    assert.deepEqual(
      baseline.map(item => item.pagePath),
      ['/pricing']
    )
  })
})
