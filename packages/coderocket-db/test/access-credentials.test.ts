import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { decryptAccessHeaders, encryptAccessHeaders } from '../src/access-credentials'

const previousKey = process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY

describe('managed access credential encryption', () => {
  before(() => {
    process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY =
      'test-only-managed-access-key-with-at-least-32-characters'
  })

  after(() => {
    if (previousKey === undefined) delete process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY
    else process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY = previousKey
  })

  it('round-trips request headers without exposing plaintext in storage', () => {
    const headers = {
      'cf-access-client-id': 'client-id',
      'cf-access-client-secret': 'secret-value'
    }
    const encrypted = encryptAccessHeaders(headers)

    assert.doesNotMatch(encrypted, /client-id|secret-value/)
    assert.deepEqual(decryptAccessHeaders(encrypted), headers)
  })

  it('rejects modified ciphertext', () => {
    const encrypted = encryptAccessHeaders({ authorization: 'Bearer test-token' })
    const [version, iv, tag, ciphertext] = encrypted.split('.')
    const modifiedTag = `${tag?.startsWith('A') ? 'B' : 'A'}${tag?.slice(1)}`
    assert.throws(() => decryptAccessHeaders(`${version}.${iv}.${modifiedTag}.${ciphertext}`))
  })

  it('requires a dedicated encryption key', () => {
    delete process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY
    assert.throws(
      () => encryptAccessHeaders({ authorization: 'Bearer test-token' }),
      /encryption is not configured/
    )
    process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY =
      'test-only-managed-access-key-with-at-least-32-characters'
  })
})
