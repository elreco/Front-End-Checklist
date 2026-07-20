import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { decryptAccessHeaders, encryptAccessHeaders } from '@coderocket/db'
import { getAuthRedirectUrl } from './auth-redirect'

export const FIGMA_OAUTH_COOKIE = 'coderocket-figma-oauth'
const STATE_KEY = 'coderocket-figma-oauth-state'
const VERIFIER_KEY = 'coderocket-figma-oauth-verifier'
const RETURN_PATH_KEY = 'coderocket-figma-oauth-return-path'

export interface FigmaOAuthToken {
  accessToken: string
  expiresAt: string
  refreshToken: string
  userId?: string
}

export interface FigmaOAuthSession {
  codeChallenge: string
  encrypted: string
  state: string
}

/** Report whether this installation can offer the Figma-hosted account authorization flow. */
export function figmaOAuthEnabled(): boolean {
  return Boolean(
    process.env.FIGMA_CLIENT_ID &&
      process.env.FIGMA_CLIENT_SECRET &&
      process.env.CODEROCKET_ACCESS_ENCRYPTION_KEY
  )
}

/** Build the registered callback from trusted deployment configuration rather than proxy headers. */
export function figmaOAuthCallbackUrl(
  requestUrl: string,
  configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
): string {
  return getAuthRedirectUrl(
    '/api/connections/figma/return',
    requestUrl,
    configuredSiteUrl
  ).toString()
}

/** Create a short-lived encrypted OAuth state envelope with PKCE protection. */
export function createFigmaOAuthSession(returnPath: string): FigmaOAuthSession {
  const state = randomBytes(24).toString('base64url')
  const verifier = randomBytes(48).toString('base64url')
  const safeReturnPath = readSafeFigmaReturnPath(returnPath)
  return {
    codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
    encrypted: encryptAccessHeaders({
      [RETURN_PATH_KEY]: safeReturnPath,
      [STATE_KEY]: state,
      [VERIFIER_KEY]: verifier
    }),
    state
  }
}

/** Build the browser authorization address with only the file-content read scope. */
export function figmaAuthorizationUrl(callbackUrl: string, session: FigmaOAuthSession): string {
  const clientId = process.env.FIGMA_CLIENT_ID
  if (!clientId) throw new Error('Figma OAuth is not configured')
  const url = new URL('https://www.figma.com/oauth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('scope', 'file_content:read')
  url.searchParams.set('state', session.state)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('code_challenge', session.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

/** Read and authenticate the state cookie before the short-lived code exchange. */
export function readFigmaOAuthSession(
  encrypted: string,
  returnedState: string
): { codeVerifier: string; returnPath: string } | undefined {
  try {
    const values = decryptAccessHeaders(encrypted)
    const expectedState = values[STATE_KEY]
    const verifier = values[VERIFIER_KEY]
    const returnPath = values[RETURN_PATH_KEY]
    if (!(expectedState && verifier && returnPath && statesMatch(expectedState, returnedState)))
      return
    return { codeVerifier: verifier, returnPath: readSafeFigmaReturnPath(returnPath) }
  } catch {
    return
  }
}

/** Exchange Figma's 30-second authorization code for encrypted-at-rest account credentials. */
export async function exchangeFigmaAuthorizationCode(
  code: string,
  callbackUrl: string,
  codeVerifier: string,
  fetchImplementation: typeof fetch = fetch
): Promise<FigmaOAuthToken> {
  const clientId = process.env.FIGMA_CLIENT_ID
  const clientSecret = process.env.FIGMA_CLIENT_SECRET
  if (!(clientId && clientSecret)) throw new Error('Figma OAuth is not configured')
  const response = await fetchImplementation('https://api.figma.com/v1/oauth/token', {
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl
    }),
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST',
    signal: AbortSignal.timeout(15_000)
  })
  const payload = objectRecord(await response.json().catch(() => undefined))
  const accessToken = stringValue(payload?.access_token)
  const refreshToken = stringValue(payload?.refresh_token)
  const expiresIn = numberValue(payload?.expires_in)
  if (!response.ok || !(accessToken && refreshToken && expiresIn && expiresIn > 0))
    throw new Error('Figma did not complete the account connection')
  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1_000).toISOString(),
    userId: stringValue(payload?.user_id_string)
  }
}

/** Keep OAuth returns inside the Figma creation path and discard arbitrary redirects. */
export function readSafeFigmaReturnPath(value: string): string {
  if (value.length > 2_500) return '/create?source=figma'
  if (value.startsWith('/create?')) return value
  try {
    const url = new URL(value, 'https://coderocket.invalid')
    if (
      url.origin === 'https://coderocket.invalid' &&
      /^\/studio\/[a-f\d-]{36}$/i.test(url.pathname)
    )
      return `${url.pathname}${url.search}`
  } catch {}
  return '/create?source=figma'
}

function statesMatch(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected)
  const receivedBytes = Buffer.from(received)
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  )
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return
  return Object.fromEntries(Object.entries(value))
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
