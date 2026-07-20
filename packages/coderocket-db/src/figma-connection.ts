import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptAccessHeaders, encryptAccessHeaders } from './access-credentials'

const ACCESS_TOKEN_KEY = 'coderocket-figma-access-token'
const REFRESH_TOKEN_KEY = 'coderocket-figma-refresh-token'
const REFRESH_WINDOW_MS = 5 * 60 * 1000

export interface SaveFigmaConnectionInput {
  accessToken: string
  expiresAt: string
  figmaUserId?: string
  ownerId: string
  refreshToken: string
}

export interface FigmaConnectionStatus {
  connected: boolean
  expiresAt?: string
}

/** Store OAuth values only inside the existing authenticated encryption envelope. */
export async function saveFigmaConnection(
  db: SupabaseClient,
  input: SaveFigmaConnectionInput
): Promise<void> {
  const encryptedCredentials = encryptAccessHeaders({
    [ACCESS_TOKEN_KEY]: input.accessToken,
    [REFRESH_TOKEN_KEY]: input.refreshToken
  })
  const { error } = await db.from('cr_figma_connections').upsert(
    {
      owner_id: input.ownerId,
      encrypted_credentials: encryptedCredentials,
      expires_at: input.expiresAt,
      figma_user_id: input.figmaUserId ?? null,
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'owner_id' }
  )
  if (error) throw new Error(error.message)
}

/** Return a fresh access token to trusted server code and refresh it before it becomes stale. */
export async function loadFigmaAccessToken(
  db: SupabaseClient,
  ownerId: string,
  fetchImplementation: typeof fetch = fetch
): Promise<string> {
  const { data, error } = await db
    .from('cr_figma_connections')
    .select('encrypted_credentials,status,expires_at')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!(data?.encrypted_credentials && data.status === 'connected'))
    throw new Error('Connect a Figma account before opening this design')
  const credentials = decryptAccessHeaders(data.encrypted_credentials)
  const accessToken = credentials[ACCESS_TOKEN_KEY]
  const refreshToken = credentials[REFRESH_TOKEN_KEY]
  if (!(accessToken && refreshToken)) throw new Error('The Figma connection is incomplete')
  if (new Date(data.expires_at).getTime() > Date.now() + REFRESH_WINDOW_MS) return accessToken
  return refreshFigmaAccessToken(db, ownerId, refreshToken, fetchImplementation)
}

/** Report account-level connection state without returning encrypted provider values. */
export async function getFigmaConnectionStatus(
  db: SupabaseClient,
  ownerId: string
): Promise<FigmaConnectionStatus> {
  const { data, error } = await db
    .from('cr_figma_connections')
    .select('status,expires_at')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.status === 'connected'
    ? { connected: true, expiresAt: data.expires_at }
    : { connected: false }
}

/** Replace the single active Figma OAuth token while retaining the reusable refresh token. */
async function refreshFigmaAccessToken(
  db: SupabaseClient,
  ownerId: string,
  refreshToken: string,
  fetchImplementation: typeof fetch
): Promise<string> {
  const clientId = process.env.FIGMA_CLIENT_ID
  const clientSecret = process.env.FIGMA_CLIENT_SECRET
  if (!(clientId && clientSecret)) throw new Error('Figma OAuth is not configured')
  const response = await fetchImplementation('https://api.figma.com/v1/oauth/refresh', {
    body: new URLSearchParams({ refresh_token: refreshToken }),
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST',
    signal: AbortSignal.timeout(15_000)
  })
  const payload = objectRecord(await response.json().catch(() => undefined))
  const nextAccessToken = stringValue(payload?.access_token)
  const expiresIn = numberValue(payload?.expires_in)
  if (!response.ok || !(nextAccessToken && expiresIn && expiresIn > 0)) {
    await db
      .from('cr_figma_connections')
      .update({
        status: 'expired',
        last_error: 'Reconnect Figma to continue importing designs',
        updated_at: new Date().toISOString()
      })
      .eq('owner_id', ownerId)
    throw new Error('Reconnect Figma to continue importing designs')
  }
  await saveFigmaConnection(db, {
    accessToken: nextAccessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1_000).toISOString(),
    ownerId,
    refreshToken
  })
  return nextAccessToken
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
