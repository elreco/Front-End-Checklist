import type { BrowserHandoffCredential } from '@coderocket/core/browser-handoff'

/** Reattach the provider token only after validating the stored endpoint against configuration. */
export function buildBrowserHandoffEndpoint(credential: BrowserHandoffCredential): string {
  const configuredEndpoint = process.env.CODEROCKET_BROWSERLESS_WS_ENDPOINT
  const token = process.env.CODEROCKET_BROWSERLESS_TOKEN
  if (!(configuredEndpoint && token)) throw new Error('The secure browser is not configured')
  const configured = new URL(configuredEndpoint)
  const reconnect = new URL(credential.browserWsEndpoint)
  if (
    configured.protocol !== 'wss:' ||
    reconnect.protocol !== 'wss:' ||
    configured.host !== reconnect.host ||
    reconnect.username ||
    reconnect.password
  )
    throw new Error('The secure browser resume host is invalid')
  reconnect.searchParams.set('token', token)
  return reconnect.toString()
}

/** Meter the provider session in conservative whole minutes from creation through worker pickup. */
export function estimateBrowserHandoffCostMicroeur(
  credential: BrowserHandoffCredential,
  completedAt = Date.now()
): number {
  const startedAt = Date.parse(credential.providerStartedAt)
  const providerExpiresAt = Date.parse(credential.providerExpiresAt)
  if (!(Number.isFinite(startedAt) && Number.isFinite(providerExpiresAt))) return 0
  const elapsed = Math.max(1, Math.min(completedAt, providerExpiresAt) - startedAt)
  return Math.ceil(elapsed / 60_000) * credential.costMicroeurPerMinute
}
