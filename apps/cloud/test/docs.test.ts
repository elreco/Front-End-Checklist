import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DOCUMENTATION_RULES,
  DOCUMENTATION_RULESET_VERSION,
  getDocumentationRule,
  getRuleDocumentationUrl,
  getRuleDocumentationUrlBySlug
} from '../lib/docs'

describe('CodeRocket documentation reference', () => {
  it('loads the maintained fork rule corpus', () => {
    assert.ok(DOCUMENTATION_RULES.length > 300)
    assert.match(DOCUMENTATION_RULESET_VERSION, /^frontend-checklist-[a-f0-9]{16}$/)
  })

  it('uses canonical CodeRocket rule URLs', () => {
    const rule = getDocumentationRule('accessibility', 'form-labels')
    assert.ok(rule)
    assert.equal(getRuleDocumentationUrl(rule), '/docs/rules/accessibility/form-labels')
    assert.equal(getRuleDocumentationUrlBySlug('form-https'), '/docs/rules/security/form-https')
    assert.equal(getRuleDocumentationUrlBySlug('removed-upstream-rule'), '/docs/rules')
  })

  it('keeps rule identities unique', () => {
    const identities = DOCUMENTATION_RULES.map(rule => `${rule.primaryCategory}/${rule.slug}`)
    assert.equal(new Set(identities).size, identities.length)
  })

  it('resolves every stored upstream slug to an existing canonical document', () => {
    for (const rule of DOCUMENTATION_RULES) {
      assert.equal(
        getRuleDocumentationUrlBySlug(rule.slug),
        `/docs/rules/${rule.primaryCategory}/${rule.slug}`
      )
    }
  })
})
