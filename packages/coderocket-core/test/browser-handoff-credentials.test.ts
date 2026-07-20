import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  readBrowserHandoffCredential,
  writeBrowserHandoffCredential
} from '../src/browser-handoff-credentials'

describe('browser handoff credentials', () => {
  it('round-trips one bounded remote browser session', () => {
    const credential = {
      browserWsEndpoint: 'wss://production-lon.browserless.io/session/abc',
      costMicroeurPerMinute: 20_000,
      liveUrl: 'https://production-lon.browserless.io/live/index.html?i=abc',
      liveUrlId: 'abc',
      providerExpiresAt: '2026-07-20T12:06:00.000Z',
      providerStartedAt: '2026-07-20T12:00:00.000Z'
    }

    assert.deepEqual(
      readBrowserHandoffCredential(writeBrowserHandoffCredential(credential)),
      credential
    )
  })

  it('rejects insecure endpoints and unbounded provider pricing', () => {
    assert.equal(
      readBrowserHandoffCredential({
        'coderocket-handoff-browser-ws-endpoint': 'ws://browserless.example/session/abc',
        'coderocket-handoff-cost-microeur-per-minute': '25001',
        'coderocket-handoff-live-url': 'http://browserless.example/live/abc',
        'coderocket-handoff-live-url-id': 'abc',
        'coderocket-handoff-provider-expires-at': 'also-not-a-date',
        'coderocket-handoff-provider-started-at': 'not-a-date'
      }),
      undefined
    )
  })
})
