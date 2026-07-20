import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getBuilderAccessRecovery } from '../lib/builder-access-recovery'

describe('builder access recovery', () => {
  it('recognises human security checks without exposing technical language', () => {
    const recovery = getBuilderAccessRecovery(
      'The site returned a Cloudflare challenge instead of the page'
    )

    assert.equal(recovery.obstacle, 'security_check')
    assert.match(recovery.description, /real person/i)
    assert.doesNotMatch(recovery.title, /cloudflare|captcha/i)
  })

  it('guides sign-ins and unavailable pages differently', () => {
    assert.equal(
      getBuilderAccessRecovery('The page redirected to a sign-in screen').obstacle,
      'sign_in'
    )
    assert.equal(getBuilderAccessRecovery('HTTP 404').obstacle, 'page_unavailable')
  })

  it('keeps an understandable fallback for unknown failures', () => {
    const recovery = getBuilderAccessRecovery('Unexpected renderer state')
    assert.equal(recovery.obstacle, 'unknown')
    assert.match(recovery.description, /starting model/i)
  })

  it('offers a fresh session after an expiry', () => {
    const recovery = getBuilderAccessRecovery('The temporary guided browser expired')
    assert.equal(recovery.obstacle, 'session_ended')
    assert.match(recovery.description, /new guided browser/i)
  })
})
