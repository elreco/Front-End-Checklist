import { assertPublicHttpsUrl } from '@coderocket/core'
import type { BrowserHandoffCredential } from '@coderocket/core/browser-handoff'
import type { Browser, CDPSession, HTTPRequest, Page } from 'puppeteer-core'

const MIN_HANDOFF_MINUTES = 4
const MAX_HANDOFF_MINUTES = 10
const HANDOFF_PROVIDER_BUDGET_MICROEUR = 100_000
const HANDOFF_RECONNECT_GRACE_MS = 60_000
const MAX_COST_MICROEUR_PER_MINUTE = 25_000

interface BrowserHandoffConfiguration {
  costMicroeurPerMinute: number
  token: string
  wsEndpoint: string
}

interface BrowserlessLiveUrlResult {
  liveURL: string
  liveURLId: string
}

interface BrowserlessReconnectResult {
  browserWSEndpoint: string
}

export interface CreatedBrowserHandoff {
  credential: BrowserHandoffCredential
  expiresAt: string
}

/** Tell the Studio whether its operator configured a bounded interactive-browser provider. */
export function isBrowserHandoffConfigured(): boolean {
  try {
    readBrowserHandoffConfiguration()
    return true
  } catch {
    return false
  }
}

/** Start one isolated Browserless session and detach after creating a short-lived owner link. */
export async function createBrowserHandoff(targetUrl: string): Promise<CreatedBrowserHandoff> {
  const target = await assertPublicHttpsUrl(targetUrl)
  const configuration = readBrowserHandoffConfiguration()
  const visibleDurationMs = calculateBrowserHandoffDurationMs(configuration.costMicroeurPerMinute)
  const providerStartedAt = new Date().toISOString()
  const providerExpiresAt = new Date(
    Date.now() + visibleDurationMs + HANDOFF_RECONNECT_GRACE_MS
  ).toISOString()
  const { connect } = await import('puppeteer-core')
  const browser = await connect({
    browserWSEndpoint: endpointWithToken(configuration.wsEndpoint, configuration.token)
  })
  let detached = false
  try {
    const pages = await browser.pages()
    const page = pages[0] ?? (await browser.newPage())
    await protectRemoteBrowser(browser)
    await page.setViewport({ height: 800, width: 1280 })
    await page
      .goto(target.toString(), { timeout: 20_000, waitUntil: 'domcontentloaded' })
      .catch(error => {
        if (page.url() === 'about:blank') throw error
      })
    const cdp = await page.createCDPSession()
    const live = readLiveUrlResult(
      await sendBrowserlessCommand(cdp, 'Browserless.liveURL', {
        compressed: true,
        interactable: true,
        quality: 55,
        resizable: true,
        showBrowserInterface: true,
        timeout: visibleDurationMs,
        type: 'jpeg'
      })
    )
    const reconnect = readReconnectResult(
      await sendBrowserlessCommand(cdp, 'Browserless.reconnect', {
        timeout: visibleDurationMs + HANDOFF_RECONNECT_GRACE_MS
      })
    )
    browser.disconnect()
    detached = true
    return {
      credential: {
        browserWsEndpoint: removeProviderToken(reconnect.browserWSEndpoint),
        costMicroeurPerMinute: configuration.costMicroeurPerMinute,
        liveUrl: live.liveURL,
        liveUrlId: live.liveURLId,
        providerExpiresAt,
        providerStartedAt
      },
      expiresAt: new Date(Date.now() + visibleDurationMs).toISOString()
    }
  } finally {
    if (!detached) await browser.close().catch(() => undefined)
  }
}

/** Terminate a detached session when the database cannot safely attach it to the owner project. */
export async function closeBrowserHandoff(credential: BrowserHandoffCredential): Promise<void> {
  const configuration = readBrowserHandoffConfiguration()
  const reconnectEndpoint = validateReconnectEndpoint(
    credential.browserWsEndpoint,
    configuration.wsEndpoint
  )
  const { connect } = await import('puppeteer-core')
  const browser = await connect({
    browserWSEndpoint: endpointWithToken(reconnectEndpoint, configuration.token)
  })
  await browser.close()
}

/** Give low-cost providers more sign-in time without exceeding the bounded handoff allowance. */
export function calculateBrowserHandoffDurationMs(costMicroeurPerMinute: number): number {
  const affordableMinutes = Math.floor(
    HANDOFF_PROVIDER_BUDGET_MICROEUR / Math.max(1, costMicroeurPerMinute)
  )
  const minutes = Math.max(MIN_HANDOFF_MINUTES, Math.min(MAX_HANDOFF_MINUTES, affordableMinutes))
  return minutes * 60_000
}

/** Meter a cancelled handoff in conservative whole minutes before releasing its reservation. */
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

/** Refuse private-network and insecure requests across the main page and any sign-in popup. */
async function protectRemoteBrowser(browser: Browser): Promise<void> {
  const validatedOrigins = new Map<string, Promise<void>>()
  const protectedPages = new WeakSet<Page>()
  const protectPage = async (page: Page): Promise<void> => {
    if (protectedPages.has(page)) return
    protectedPages.add(page)
    await page.setRequestInterception(true)
    page.on('request', request => {
      void continueSafeRequest(request, validatedOrigins)
    })
  }
  browser.on('targetcreated', target => {
    void target
      .page()
      .then(page => (page ? protectPage(page) : undefined))
      .catch(() => undefined)
  })
  await Promise.all((await browser.pages()).map(protectPage))
}

/** Continue only requests whose public HTTPS origin passed CodeRocket's network checks. */
async function continueSafeRequest(
  request: HTTPRequest,
  validatedOrigins: Map<string, Promise<void>>
): Promise<void> {
  const value = request.url()
  if (/^(?:about|blob|data):/.test(value)) {
    await request.continue().catch(() => undefined)
    return
  }
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') throw new Error('Only HTTPS is allowed')
    let validation = validatedOrigins.get(url.origin)
    if (!validation) {
      validation = assertPublicHttpsUrl(url.origin).then(() => undefined)
      validatedOrigins.set(url.origin, validation)
    }
    await validation
    await request.continue()
  } catch {
    await request.abort('blockedbyclient').catch(() => undefined)
  }
}

/** Load and validate the operator-owned Browserless endpoint, secret, and real per-minute price. */
function readBrowserHandoffConfiguration(): BrowserHandoffConfiguration {
  const wsEndpoint = process.env.CODEROCKET_BROWSERLESS_WS_ENDPOINT
  const token = process.env.CODEROCKET_BROWSERLESS_TOKEN
  const costMicroeurPerMinute = Number(process.env.CODEROCKET_BROWSERLESS_COST_MICROEUR_PER_MINUTE)
  if (!(wsEndpoint && token && token.length >= 10))
    throw new Error('The secure browser is not configured')
  let endpoint: URL
  try {
    endpoint = new URL(wsEndpoint)
  } catch {
    throw new Error('The secure browser endpoint is invalid')
  }
  if (
    endpoint.protocol !== 'wss:' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    !Number.isInteger(costMicroeurPerMinute) ||
    costMicroeurPerMinute < 1 ||
    costMicroeurPerMinute > MAX_COST_MICROEUR_PER_MINUTE
  )
    throw new Error('The secure browser configuration is outside the protected budget')
  return { costMicroeurPerMinute, token, wsEndpoint: endpoint.toString() }
}

/** Add the provider token only to the server-to-server connection address. */
function endpointWithToken(endpoint: string, token: string): string {
  const url = new URL(endpoint)
  url.searchParams.set('token', token)
  return url.toString()
}

/** Ensure the reconnect value persisted by CodeRocket can never contain its provider token. */
function removeProviderToken(endpoint: string): string {
  const url = new URL(endpoint)
  url.searchParams.delete('token')
  return url.toString()
}

/** Refuse to send the provider token to a reconnect host other than the configured Browserless host. */
function validateReconnectEndpoint(reconnectEndpoint: string, configuredEndpoint: string): string {
  const reconnect = new URL(reconnectEndpoint)
  const configured = new URL(configuredEndpoint)
  if (reconnect.protocol !== 'wss:' || reconnect.host !== configured.host)
    throw new Error('The secure browser resume host is invalid')
  return reconnect.toString()
}

/** Send one Browserless CDP extension method without loosening other browser command types. */
async function sendBrowserlessCommand(
  session: CDPSession,
  method: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  const sender: unknown = Reflect.get(session, 'send')
  if (typeof sender !== 'function') throw new Error('The secure browser control channel is missing')
  return Reflect.apply(sender, session, [method, parameters])
}

/** Validate the short-lived owner URL returned by Browserless. */
function readLiveUrlResult(value: unknown): BrowserlessLiveUrlResult {
  if (!isRecord(value)) throw new Error('The secure browser did not return a live view')
  const liveURL = value.liveURL
  const liveURLId = value.liveURLId
  if (typeof liveURL !== 'string' || typeof liveURLId !== 'string')
    throw new Error('The secure browser returned an invalid live view')
  const parsed = new URL(liveURL)
  if (parsed.protocol !== 'https:') throw new Error('The secure browser live view is not secure')
  return { liveURL, liveURLId }
}

/** Validate the token-free endpoint used by the worker after the user finishes. */
function readReconnectResult(value: unknown): BrowserlessReconnectResult {
  if (!isRecord(value) || typeof value.browserWSEndpoint !== 'string')
    throw new Error('The secure browser cannot be resumed')
  const parsed = new URL(value.browserWSEndpoint)
  if (parsed.protocol !== 'wss:') throw new Error('The secure browser resume link is not secure')
  return { browserWSEndpoint: value.browserWSEndpoint }
}

/** Narrow one provider response to a plain object before property inspection. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
