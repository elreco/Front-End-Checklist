import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calculateWebsiteLevel,
  calculateWebsiteStability,
  type WebsiteLevelFinding
} from '../src/website-level'

function finding(
  identity: string,
  priority: WebsiteLevelFinding['priority'],
  status: WebsiteLevelFinding['status'] = 'persistent'
): WebsiteLevelFinding {
  return { identity, priority, status }
}

describe('website health levels', () => {
  it('never verifies an incomplete result', () => {
    const result = calculateWebsiteLevel({
      auditStatus: 'succeeded',
      checkedPages: 2,
      requestedPages: 3,
      gate: 'inconclusive',
      findings: []
    })
    assert.equal(result.level, 'unverified')
    assert.equal(result.eligible, false)
  })

  it('uses the worst unresolved priority as a transparent level boundary', () => {
    const levels = [
      [finding('critical', 'critical'), 'needs_attention'],
      [finding('high', 'high'), 'bronze'],
      [finding('medium', 'medium'), 'silver'],
      [finding('low', 'low'), 'gold'],
      [finding('fixed', 'critical', 'resolved'), 'platinum']
    ] as const

    for (const [findings, expected] of levels) {
      const result = calculateWebsiteLevel({
        auditStatus: 'succeeded',
        checkedPages: 3,
        requestedPages: 3,
        gate: 'passed',
        findings: [findings]
      })
      assert.equal(result.level, expected)
    }
  })

  it('counts one persistent finding once even when it has repeated evidence', () => {
    const result = calculateWebsiteLevel({
      auditStatus: 'succeeded',
      checkedPages: 2,
      requestedPages: 2,
      gate: 'passed',
      findings: [finding('same-rule', 'high'), finding('same-rule', 'high')]
    })
    assert.equal(result.level, 'bronze')
    assert.equal(result.requiredFixCount, 1)
    assert.equal(result.openCount, 1)
  })
})

describe('website stability milestones', () => {
  it('progresses after 3, 10, and 30 comparable checks', () => {
    const audit = {
      status: 'succeeded' as const,
      checkedPages: 5,
      requestedPages: 5,
      blockingCount: 0,
      rulesetVersion: 'current'
    }
    assert.equal(
      calculateWebsiteStability(
        Array.from({ length: 2 }, () => audit),
        'current'
      ).milestone,
      'starting'
    )
    assert.equal(
      calculateWebsiteStability(
        Array.from({ length: 3 }, () => audit),
        'current'
      ).milestone,
      'steady'
    )
    assert.equal(
      calculateWebsiteStability(
        Array.from({ length: 10 }, () => audit),
        'current'
      ).milestone,
      'trusted'
    )
    assert.equal(
      calculateWebsiteStability(
        Array.from({ length: 30 }, () => audit),
        'current'
      ).milestone,
      'proven'
    )
  })

  it('stops the current streak at an incomplete, blocking, or old-ruleset check', () => {
    const audits = [
      {
        status: 'succeeded' as const,
        checkedPages: 5,
        requestedPages: 5,
        blockingCount: 0,
        rulesetVersion: 'current'
      },
      {
        status: 'succeeded' as const,
        checkedPages: 5,
        requestedPages: 5,
        blockingCount: 1,
        rulesetVersion: 'current'
      },
      {
        status: 'succeeded' as const,
        checkedPages: 5,
        requestedPages: 5,
        blockingCount: 0,
        rulesetVersion: 'current'
      }
    ]
    assert.equal(calculateWebsiteStability(audits, 'current').checks, 1)
  })
})
