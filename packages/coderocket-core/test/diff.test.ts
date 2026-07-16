import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareFindings, fingerprintFinding } from '../src/index'

const existing = {
  pagePath: '/Pricing/',
  ruleSlug: 'document-title',
  title: 'Document title',
  priority: 'high' as const,
  message: 'First explanation'
}

describe('CodeRocket audit comparison', () => {
  it('uses normalized path, rule slug, and a stable occurrence key as identity', () => {
    assert.equal(
      fingerprintFinding('/pricing', 'document-title'),
      fingerprintFinding('/PRICING/', 'document-title')
    )
    assert.notEqual(
      fingerprintFinding('/pricing', 'document-title', 'first'),
      fingerprintFinding('/pricing', 'document-title', 'second')
    )
  })

  it('does not report identical findings as regressions', () => {
    const result = compareFindings({
      current: [{ ...existing, message: 'Copy changed' }],
      baseline: [existing],
      currentRulesetVersion: 'v1',
      baselineRulesetVersion: 'v1'
    })
    assert.equal(result.gate, 'passed')
    assert.equal(result.counts.persistent, 1)
    assert.equal(result.blockingRegressions, 0)
  })

  it('blocks only new critical and high findings', () => {
    const result = compareFindings({
      current: [existing],
      baseline: [],
      currentRulesetVersion: 'v1',
      baselineRulesetVersion: 'v1'
    })
    assert.equal(result.gate, 'failed')
    assert.equal(result.blockingRegressions, 1)
  })

  it('requires a baseline when the ruleset changes', () => {
    const result = compareFindings({
      current: [existing],
      baseline: [],
      currentRulesetVersion: 'v2',
      baselineRulesetVersion: 'v1'
    })
    assert.equal(result.gate, 'needs_baseline')
  })

  it('does not resolve findings on an unreachable page', () => {
    const result = compareFindings({
      current: [],
      baseline: [existing],
      currentRulesetVersion: 'v1',
      baselineRulesetVersion: 'v1',
      unreachablePagePaths: ['/pricing']
    })
    assert.equal(result.counts.resolved, 0)
    assert.equal(result.gate, 'inconclusive')
  })
})
