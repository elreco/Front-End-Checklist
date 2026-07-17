import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadRules } from '@frontendchecklist/rules'
import { PRODUCTION_HTML_RULE_SLUGS, selectProductionHtmlRules } from '../src/automation-profile'

test('the live website profile is backed by the current Front-End Checklist corpus', () => {
  const selected = selectProductionHtmlRules(loadRules())
  assert.deepEqual(selected.map(rule => rule.slug).sort(), [...PRODUCTION_HTML_RULE_SLUGS].sort())
})

test('source-code and manual-only rules are excluded from live website checks', () => {
  const selected = new Set(selectProductionHtmlRules(loadRules()).map(rule => rule.slug))
  assert.equal(selected.has('const-let'), false)
  assert.equal(selected.has('memory-leaks'), false)
  assert.equal(selected.has('color-contrast'), false)
  assert.equal(selected.has('keyboard-navigation'), false)
  assert.equal(selected.has('critical-css'), false)
  assert.equal(selected.has('https'), false)
  assert.equal(selected.has('http-to-https'), false)
  assert.equal(selected.has('form-https'), false)
})
