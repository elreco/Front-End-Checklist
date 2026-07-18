import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  readBrowserLoginCredential,
  writeBrowserLoginCredential
} from '../src/browser-login-credentials'

describe('browser login credentials', () => {
  it('round-trips through the encrypted string-record envelope', () => {
    const credential = {
      loginUrl: 'https://app.example/login',
      password: 'dedicated-test-password',
      username: 'check@example.com'
    }

    assert.deepEqual(
      readBrowserLoginCredential(writeBrowserLoginCredential(credential)),
      credential
    )
  })

  it('rejects partial saved credentials', () => {
    assert.equal(
      readBrowserLoginCredential({
        'coderocket-login-url': 'https://app.example/login',
        'coderocket-login-username': 'check@example.com'
      }),
      undefined
    )
  })
})
