const HANDOFF_PREFIX = 'coderocket-handoff-'
const MAX_HANDOFF_COST_MICROEUR_PER_MINUTE = 25_000

export interface BrowserHandoffCredential {
  browserWsEndpoint: string
  costMicroeurPerMinute: number
  liveUrl: string
  liveUrlId: string
  providerExpiresAt: string
  providerStartedAt: string
}

/** Read one encrypted, short-lived remote-browser handoff without accepting unknown values. */
export function readBrowserHandoffCredential(
  values: Record<string, string>
): BrowserHandoffCredential | undefined {
  const browserWsEndpoint = values[`${HANDOFF_PREFIX}browser-ws-endpoint`]
  const liveUrl = values[`${HANDOFF_PREFIX}live-url`]
  const liveUrlId = values[`${HANDOFF_PREFIX}live-url-id`]
  const providerExpiresAt = values[`${HANDOFF_PREFIX}provider-expires-at`]
  const providerStartedAt = values[`${HANDOFF_PREFIX}provider-started-at`]
  const rawCost = values[`${HANDOFF_PREFIX}cost-microeur-per-minute`]
  if (
    !(
      browserWsEndpoint &&
      liveUrl &&
      liveUrlId &&
      providerExpiresAt &&
      providerStartedAt &&
      rawCost
    )
  )
    return
  const costMicroeurPerMinute = Number(rawCost)
  if (
    !Number.isInteger(costMicroeurPerMinute) ||
    costMicroeurPerMinute < 1 ||
    costMicroeurPerMinute > MAX_HANDOFF_COST_MICROEUR_PER_MINUTE ||
    !isSecureWebSocket(browserWsEndpoint) ||
    !isSecureWebUrl(liveUrl) ||
    liveUrlId.length > 500 ||
    !Number.isFinite(Date.parse(providerStartedAt)) ||
    !Number.isFinite(Date.parse(providerExpiresAt)) ||
    Date.parse(providerExpiresAt) <= Date.parse(providerStartedAt)
  )
    return
  return {
    browserWsEndpoint,
    costMicroeurPerMinute,
    liveUrl,
    liveUrlId,
    providerExpiresAt,
    providerStartedAt
  }
}

/** Serialize a Browserless session into the existing authenticated encryption envelope. */
export function writeBrowserHandoffCredential(
  credential: BrowserHandoffCredential
): Record<string, string> {
  return {
    [`${HANDOFF_PREFIX}browser-ws-endpoint`]: credential.browserWsEndpoint,
    [`${HANDOFF_PREFIX}cost-microeur-per-minute`]: String(credential.costMicroeurPerMinute),
    [`${HANDOFF_PREFIX}live-url`]: credential.liveUrl,
    [`${HANDOFF_PREFIX}live-url-id`]: credential.liveUrlId,
    [`${HANDOFF_PREFIX}provider-expires-at`]: credential.providerExpiresAt,
    [`${HANDOFF_PREFIX}provider-started-at`]: credential.providerStartedAt
  }
}

/** Accept only a public-facing secure WebSocket address without embedded credentials. */
function isSecureWebSocket(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'wss:' && !url.username && !url.password
  } catch {
    return false
  }
}

/** Accept only a normal secure web address for the owner-visible live view. */
function isSecureWebUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}
