import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import {
  createFigmaOAuthSession,
  exchangeFigmaAuthorizationCode,
  figmaAuthorizationUrl,
  readFigmaOAuthSession,
  readSafeFigmaReturnPath
} from '../lib/figma-oauth'

const previousClientId = process.env.FIGMA_CLIENT_ID
const previousClientSecret = process.env.FIGMA_CLIENT_SECRET
const previousEncryptionKey = process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY

describe('Figma OAuth', () => {
  before(() => {
    process.env.FIGMA_CLIENT_ID = 'figma-client-id'
    process.env.FIGMA_CLIENT_SECRET = 'figma-client-secret'
    process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY =
      'a-dedicated-test-encryption-key-that-is-long-enough'
  })

  after(() => {
    restoreEnvironment('FIGMA_CLIENT_ID', previousClientId)
    restoreEnvironment('FIGMA_CLIENT_SECRET', previousClientSecret)
    restoreEnvironment('CODEROCKET_ACCESS_ENCRYPTION_KEY', previousEncryptionKey)
  })

  it('uses PKCE, minimal file scope, and authenticated encrypted return state', () => {
    const session = createFigmaOAuthSession(
      '/create?source=figma&figmaUrl=https%3A%2F%2Fwww.figma.com%2Fdesign%2FAbCdEf123%2FShop'
    )
    const authorization = new URL(
      figmaAuthorizationUrl('https://coderocket.example/api/connections/figma/return', session)
    )
    assert.equal(authorization.origin, 'https://www.figma.com')
    assert.equal(authorization.searchParams.get('scope'), 'file_content:read')
    assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256')
    assert.ok(authorization.searchParams.get('code_challenge'))
    const restored = readFigmaOAuthSession(session.encrypted, session.state)
    assert.ok(restored)
    assert.match(restored.returnPath, /^\/create\?source=figma/)
    assert.equal(readFigmaOAuthSession(session.encrypted, 'different-state'), undefined)
    assert.doesNotMatch(session.encrypted, /figmaUrl|AbCdEf123/)
  })

  it('exchanges the short-lived code with Basic auth and keeps provider tokens server-side', async () => {
    let receivedAuthorization = ''
    let receivedBody = ''
    const fetchImplementation: typeof fetch = async (_input, init) => {
      receivedAuthorization = new Headers(init?.headers).get('authorization') ?? ''
      receivedBody = String(init?.body)
      return Response.json({
        access_token: 'access-value',
        expires_in: 7_776_000,
        refresh_token: 'refresh-value',
        token_type: 'bearer',
        user_id_string: '12345678901234567890'
      })
    }
    const token = await exchangeFigmaAuthorizationCode(
      'short-lived-code',
      'https://coderocket.example/api/connections/figma/return',
      'pkce-verifier',
      fetchImplementation
    )
    assert.match(receivedAuthorization, /^Basic /)
    assert.match(receivedBody, /grant_type=authorization_code/)
    assert.match(receivedBody, /code_verifier=pkce-verifier/)
    assert.equal(token.accessToken, 'access-value')
    assert.equal(token.refreshToken, 'refresh-value')
    assert.equal(token.userId, '12345678901234567890')
  })

  it('allows only creation and exact Studio return paths', () => {
    assert.equal(
      readSafeFigmaReturnPath(
        '/studio/123e4567-e89b-12d3-a456-426614174000?notice=figma-connected'
      ),
      '/studio/123e4567-e89b-12d3-a456-426614174000?notice=figma-connected'
    )
    assert.equal(readSafeFigmaReturnPath('https://attacker.example/'), '/create?source=figma')
  })
})

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
