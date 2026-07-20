import {
  type BrowserHandoffCredential,
  readBrowserHandoffCredential
} from '@coderocket/core/browser-handoff'
import {
  type BrowserLoginCredential,
  readBrowserLoginCredential
} from '@coderocket/core/browser-login'
import { type createServiceClient, decryptAccessHeaders } from '@coderocket/db'
import { estimateBrowserHandoffCostMicroeur } from './browser-handoff'

type WorkerDatabase = ReturnType<typeof createServiceClient>

export interface BuilderImportAccess {
  authenticated: boolean
  handoff?: BrowserHandoffCredential
  login?: BrowserLoginCredential
}

export class BrowserHandoffExpiredError extends Error {
  constructor() {
    super('The temporary guided browser expired before CodeRocket continued')
    this.name = 'BrowserHandoffExpiredError'
  }
}

/** Load one unexpired test account without exposing its encrypted envelope outside the worker. */
export async function loadBuilderImportAccess(
  db: WorkerDatabase,
  siteId: string,
  ownerId: string
): Promise<BuilderImportAccess> {
  const [{ data, error }, { data: handoff, error: handoffError }] = await Promise.all([
    db
      .from('cr_builder_access_connections')
      .select('encrypted_credentials,status,expires_at')
      .eq('site_id', siteId)
      .eq('owner_id', ownerId)
      .maybeSingle(),
    db
      .from('cr_builder_browser_handoffs')
      .select('encrypted_session,status,expires_at')
      .eq('site_id', siteId)
      .eq('owner_id', ownerId)
      .maybeSingle()
  ])
  if (error) throw new Error(error.message)
  if (handoffError) throw new Error(handoffError.message)
  if (
    handoff?.encrypted_session &&
    ['ready', 'confirmed', 'consuming'].includes(handoff.status) &&
    new Date(handoff.expires_at).getTime() <= Date.now()
  )
    throw new BrowserHandoffExpiredError()
  if (
    handoff?.encrypted_session &&
    (handoff.status === 'confirmed' || handoff.status === 'consuming')
  ) {
    const credential = readBrowserHandoffCredential(decryptAccessHeaders(handoff.encrypted_session))
    if (!credential) throw new Error('The temporary secure browser connection is incomplete')
    const { error: consumeError } = await db
      .from('cr_builder_browser_handoffs')
      .update({ status: 'consuming', updated_at: new Date().toISOString() })
      .eq('site_id', siteId)
      .eq('owner_id', ownerId)
      .in('status', ['confirmed', 'consuming'])
    if (consumeError) throw new Error(consumeError.message)
    return { authenticated: true, handoff: credential }
  }
  if (!(data?.encrypted_credentials && ['configured', 'verified'].includes(data.status)))
    return { authenticated: false }
  if (new Date(data.expires_at).getTime() <= Date.now())
    throw new Error('The temporary test-account connection expired')
  const login = readBrowserLoginCredential(decryptAccessHeaders(data.encrypted_credentials))
  if (!login) throw new Error('The temporary test-account connection is incomplete')
  return { authenticated: true, login }
}

/** Record that the isolated browser accepted the test account while keeping it retryable. */
export async function markBuilderAccessVerified(
  db: WorkerDatabase,
  siteId: string,
  ownerId: string
): Promise<void> {
  const verifiedAt = new Date().toISOString()
  const { error } = await db
    .from('cr_builder_access_connections')
    .update({
      status: 'verified',
      last_error: null,
      last_verified_at: verifiedAt,
      updated_at: verifiedAt
    })
    .eq('site_id', siteId)
    .eq('owner_id', ownerId)
    .not('encrypted_credentials', 'is', null)
  if (error) throw new Error(error.message)
  const { error: handoffError } = await db
    .from('cr_builder_browser_handoffs')
    .update({
      last_error: null,
      last_verified_at: verifiedAt,
      updated_at: verifiedAt
    })
    .eq('site_id', siteId)
    .eq('owner_id', ownerId)
    .eq('status', 'consuming')
  if (handoffError) throw new Error(handoffError.message)
}

/** Remove the browser password after the terminal attempt while retaining a minimal audit status. */
export async function clearBuilderImportAccess(
  db: WorkerDatabase,
  siteId: string,
  ownerId: string,
  succeeded: boolean,
  failure?: string
): Promise<void> {
  const { error } = await db
    .from('cr_builder_access_connections')
    .update({
      encrypted_credentials: null,
      status: succeeded ? 'removed' : 'failed',
      last_error: succeeded ? null : plainAccessFailure(failure),
      updated_at: new Date().toISOString()
    })
    .eq('site_id', siteId)
    .eq('owner_id', ownerId)
  if (error) throw new Error(error.message)
  const { error: handoffError } = await db
    .from('cr_builder_browser_handoffs')
    .update({
      encrypted_session: null,
      status: succeeded ? 'completed' : 'failed',
      last_error: succeeded ? null : plainAccessFailure(failure),
      updated_at: new Date().toISOString()
    })
    .eq('site_id', siteId)
    .eq('owner_id', ownerId)
    .in('status', ['ready', 'confirmed', 'consuming'])
  if (handoffError) throw new Error(handoffError.message)
}

/** Read the metered handoff cost before terminal cleanup removes the encrypted provider values. */
export async function loadBuilderHandoffCostMicroeur(
  db: WorkerDatabase,
  siteId: string,
  ownerId: string
): Promise<number> {
  const { data, error } = await db
    .from('cr_builder_browser_handoffs')
    .select('encrypted_session')
    .eq('site_id', siteId)
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.encrypted_session) return 0
  const credential = readBrowserHandoffCredential(decryptAccessHeaders(data.encrypted_session))
  return credential ? estimateBrowserHandoffCostMicroeur(credential) : 0
}

/** Remove credentials from abandoned requests once their short access window closes. */
export async function cleanupExpiredBuilderAccess(db: WorkerDatabase): Promise<void> {
  const { error } = await db
    .from('cr_builder_access_connections')
    .update({
      encrypted_credentials: null,
      status: 'failed',
      last_error: 'The temporary test-account connection expired before it was used',
      updated_at: new Date().toISOString()
    })
    .not('encrypted_credentials', 'is', null)
    .lt('expires_at', new Date().toISOString())
  if (error) throw new Error(error.message)
}

/** Keep internal browser errors short and free of accidental credential-shaped values. */
function plainAccessFailure(value?: string): string {
  return (value ?? 'The private app could not be opened with this test account')
    .replace(/\b(?:bearer|token|secret|password)\s+[^\s]+/gi, '[credential]')
    .slice(0, 500)
}
