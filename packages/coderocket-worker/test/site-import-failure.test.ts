import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sanitizeSiteImportFailure } from '../src/site-import-failure'

describe('website import failure safety', () => {
  it('removes provider endpoints and common credential query values', () => {
    const safe = sanitizeSiteImportFailure(
      'connect wss://browser.example/reconnect/abc?token=provider-secret failed at https://example.com/?access_token=user-secret'
    )

    assert.doesNotMatch(safe, /provider-secret|user-secret|reconnect\/abc/)
    assert.match(safe, /secure browser endpoint/)
    assert.match(safe, /access_token=\[credential\]/)
  })

  it('bounds unexpected provider messages', () => {
    assert.equal(sanitizeSiteImportFailure('x'.repeat(3_000)).length, 2_000)
  })
})
