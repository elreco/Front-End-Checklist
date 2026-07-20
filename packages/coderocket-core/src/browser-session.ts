import { existsSync } from 'node:fs'
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Locator,
  type Page,
  type Route
} from 'playwright-core'
import type { BrowserLoginCredential } from './browser-login-credentials'
import {
  dismissOptionalCookieNotice,
  waitForResponsiveLayout,
  warmLazyPageMedia
} from './browser-page-preparation'
import { type BrowserPageSource, readBrowserPage, settlePage } from './browser-page-reader'
import { sendCustomCdpCommand } from './browserless-cdp'
import { assertPublicHttpsUrl } from './safe-fetch'
import { isSignInRedirect } from './safe-fetch-access'
import {
  capturePageBlueprint,
  mergeResponsiveBlueprints,
  SITE_CAPTURE_VIEWPORTS,
  type SiteCaptureStudy,
  type SiteViewportCapture
} from './site-blueprint-capture'
import type { SiteSourceBlueprint } from './site-document'

const NAVIGATION_TIMEOUT_MS = 20_000

export type { BrowserPageSource } from './browser-page-reader'

export interface BrowserAuditSessionOptions {
  authenticatedHeaders?: Record<string, string>
  login?: BrowserLoginCredential
  publicHeaders?: Record<string, string>
  remoteBrowserEndpoint?: string
  siteUrl: string
}

/**
 * Open public and signed-in pages in isolated browser contexts while preventing credentials from
 * being sent outside the monitored origin.
 */
export class BrowserAuditSession {
  private readonly authenticatedHeaders: Record<string, string>
  private readonly login?: BrowserLoginCredential
  private readonly publicHeaders: Record<string, string>
  private readonly remoteBrowserEndpoint?: string
  private readonly siteOrigin: string
  private readonly validatedOrigins = new Map<string, Promise<void>>()
  private browser?: Browser
  private publicContext?: Promise<BrowserContext>
  private authenticatedContext?: Promise<BrowserContext>
  private authentication?: Promise<void>

  constructor(options: BrowserAuditSessionOptions) {
    this.siteOrigin = new URL(options.siteUrl).origin
    this.publicHeaders = options.publicHeaders ?? {}
    this.authenticatedHeaders = {
      ...this.publicHeaders,
      ...(options.authenticatedHeaders ?? {})
    }
    this.login = options.login
    this.remoteBrowserEndpoint = options.remoteBrowserEndpoint
  }

  /** Close the owner-facing stream before automated capture resumes in the same remote browser. */
  async finishInteractiveHandoff(liveUrlId: string): Promise<void> {
    if (!this.remoteBrowserEndpoint) return
    const context = await this.getAuthenticatedContext()
    const page = context.pages()[0] ?? (await context.newPage())
    const cdp = await context.newCDPSession(page)
    await sendCustomCdpCommand(cdp, 'Browserless.closeLiveURL', { liveURLId: liveUrlId }).catch(
      () => undefined
    )
  }

  /** Load one page after executing JavaScript, using a signed-in context only when requested. */
  async loadPage(url: string, authenticated: boolean): Promise<BrowserPageSource> {
    const requestedUrl = await assertPublicHttpsUrl(url)
    if (requestedUrl.origin !== this.siteOrigin)
      throw new Error('The page is outside the monitored website')
    const context = authenticated
      ? await this.getAuthenticatedContext()
      : await this.getPublicContext()
    const page = await context.newPage()
    try {
      return await readBrowserPage(page, requestedUrl)
    } finally {
      await page.close()
    }
  }

  /** Capture a bounded visual and content blueprint without persisting executable source code. */
  async captureSiteBlueprint(url: string, authenticated = false): Promise<SiteSourceBlueprint> {
    return (await this.captureSiteStudy(url, false, undefined, authenticated)).blueprint
  }

  /**
   * Inspect desktop, tablet, and mobile layouts and optionally retain two bounded screenshots only
   * for the transient visual-analysis request. Report each retained screenshot as soon as it is
   * ready so long-running imports can show honest incremental progress.
   */
  async captureSiteStudy(
    url: string,
    includeScreenshots = true,
    onCapture?: (capture: SiteViewportCapture) => Promise<void>,
    authenticated = false
  ): Promise<SiteCaptureStudy> {
    const requestedUrl = await assertPublicHttpsUrl(url)
    if (requestedUrl.origin !== this.siteOrigin)
      throw new Error('The page is outside the source website')
    const context = authenticated
      ? await this.getAuthenticatedContext()
      : await this.getPublicContext()
    const page = await context.newPage()
    try {
      let desktopBlueprint: SiteSourceBlueprint | undefined
      let tabletBlueprint: SiteSourceBlueprint | undefined
      let mobileBlueprint: SiteSourceBlueprint | undefined
      const captures: SiteViewportCapture[] = []
      for (const viewport of SITE_CAPTURE_VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        if (!desktopBlueprint) await readBrowserPage(page, requestedUrl)
        else {
          await page.evaluate(() => window.scrollTo(0, 0))
          await waitForResponsiveLayout(page)
        }
        await dismissOptionalCookieNotice(page)
        if (viewport.name === 'desktop') await warmLazyPageMedia(page)
        const blueprint = await capturePageBlueprint(page)
        if (viewport.name === 'desktop') desktopBlueprint = blueprint
        if (viewport.name === 'tablet') tabletBlueprint = blueprint
        if (viewport.name === 'mobile') mobileBlueprint = blueprint
        if (includeScreenshots && viewport.name !== 'tablet') {
          const screenshot = await page.screenshot({
            animations: 'disabled',
            caret: 'hide',
            quality: 65,
            type: 'jpeg'
          })
          const capture = {
            ...viewport,
            dataUrl: `data:image/jpeg;base64,${screenshot.toString('base64')}`
          }
          captures.push(capture)
          await onCapture?.(capture)
        }
      }
      if (!(desktopBlueprint && tabletBlueprint && mobileBlueprint))
        throw new Error('The responsive website study could not be completed')
      return {
        blueprint: mergeResponsiveBlueprints(desktopBlueprint, tabletBlueprint, mobileBlueprint),
        captures
      }
    } finally {
      await page.close()
    }
  }

  /** Release Chromium and every ephemeral cookie or storage value created during the check. */
  async close(): Promise<void> {
    await this.browser?.close()
    this.browser = undefined
    this.publicContext = undefined
    this.authenticatedContext = undefined
    this.authentication = undefined
  }

  /** Lazily create an anonymous browser context for public visitor pages. */
  private async getPublicContext(): Promise<BrowserContext> {
    this.publicContext ??= this.createContext(this.publicHeaders)
    return this.publicContext
  }

  /** Lazily create and authenticate the separate context used by signed-in pages. */
  private async getAuthenticatedContext(): Promise<BrowserContext> {
    this.authenticatedContext ??= this.createContext(this.authenticatedHeaders)
    const context = await this.authenticatedContext
    if (this.login) {
      this.authentication ??= this.signIn(context, this.login)
      await this.authentication
    }
    return context
  }

  /** Start one hardened browser process per audit rather than one process per page. */
  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser
    if (this.remoteBrowserEndpoint) {
      this.browser = await chromium.connectOverCDP(this.remoteBrowserEndpoint)
      return this.browser
    }
    const configuredPath = process.env.CODEROCKET_CHROMIUM_EXECUTABLE_PATH
    const systemPath = configuredPath ?? '/usr/bin/chromium'
    this.browser = await chromium.launch({
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
      executablePath: existsSync(systemPath) ? systemPath : undefined,
      headless: true
    })
    return this.browser
  }

  /** Create a context whose network requests remain public and whose secrets stay same-origin. */
  private async createContext(headers: Record<string, string>): Promise<BrowserContext> {
    const browser = await this.getBrowser()
    const context = this.remoteBrowserEndpoint
      ? (browser.contexts()[0] ?? (await browser.newContext()))
      : await browser.newContext({
          ignoreHTTPSErrors: false,
          javaScriptEnabled: true,
          serviceWorkers: 'block',
          userAgent: 'CodeRocket Website Check/1.0'
        })
    // The TS runtime preserves nested function names with this helper inside browser evaluations.
    await context.addInitScript({
      content: `
        if (typeof globalThis.__name !== 'function') {
          Object.defineProperty(globalThis, '__name', {
            configurable: true,
            value: (target, value) => {
              Object.defineProperty(target, 'name', { configurable: true, value })
              return target
            }
          })
        }
      `
    })
    const cookie = Object.entries(headers).find(([name]) => name.toLowerCase() === 'cookie')?.[1]
    const requestHeaders = Object.fromEntries(
      Object.entries(headers).filter(([name]) => name.toLowerCase() !== 'cookie')
    )
    if (cookie) {
      const cookies = cookie.split(';').flatMap(part => {
        const separator = part.indexOf('=')
        const name = part.slice(0, separator).trim()
        const value = part.slice(separator + 1).trim()
        return separator > 0 && name && value ? [{ name, url: this.siteOrigin, value }] : []
      })
      if (cookies.length > 0) await context.addCookies(cookies)
    }
    await context.route('**/*', route => this.routeRequest(route, requestHeaders))
    return context
  }

  /** Validate every new network origin and attach access values only to the monitored website. */
  private async routeRequest(route: Route, headers: Record<string, string>): Promise<void> {
    const request = route.request()
    let url: URL
    try {
      url = new URL(request.url())
    } catch {
      await route.abort('blockedbyclient')
      return
    }
    if (url.protocol !== 'https:') {
      await route.abort('blockedbyclient')
      return
    }
    if (
      url.origin !== this.siteOrigin &&
      request.method() !== 'GET' &&
      request.method() !== 'HEAD'
    ) {
      await route.abort('blockedbyclient')
      return
    }
    try {
      await this.validateOrigin(url.origin)
    } catch {
      await route.abort('blockedbyclient')
      return
    }
    await route.continue({
      headers:
        url.origin === this.siteOrigin ? { ...request.headers(), ...headers } : request.headers()
    })
  }

  /** Cache bounded public-network checks so asset-heavy pages do not repeat DNS validation. */
  private async validateOrigin(origin: string): Promise<void> {
    let validation = this.validatedOrigins.get(origin)
    if (!validation) {
      validation = assertPublicHttpsUrl(origin).then(() => undefined)
      this.validatedOrigins.set(origin, validation)
    }
    await validation
  }

  /** Use a dedicated account with common one-step or two-step sign-in forms. */
  private async signIn(context: BrowserContext, credential: BrowserLoginCredential): Promise<void> {
    const loginUrl = await assertPublicHttpsUrl(credential.loginUrl)
    if (loginUrl.origin !== this.siteOrigin)
      throw new Error('The sign-in page must belong to the monitored website')
    const page = await context.newPage()
    try {
      await page.goto(loginUrl.toString(), {
        timeout: NAVIGATION_TIMEOUT_MS,
        waitUntil: 'domcontentloaded'
      })
      const username = await findVisibleField(page, [
        'input[type="email"]',
        'input[autocomplete="username"]',
        'input[name*="email" i]',
        'input[name*="user" i]',
        'input:not([type]):not([disabled])'
      ])
      if (!username) throw new Error('No email or username field was found on the sign-in page')
      await username.fill(credential.username)
      let password = await findVisibleField(page, [
        'input[type="password"]',
        'input[autocomplete="current-password"]'
      ])
      if (!password) {
        await clickPrimarySignInAction(page)
        await page.waitForTimeout(350)
        password = await findVisibleField(page, [
          'input[type="password"]',
          'input[autocomplete="current-password"]'
        ])
      }
      if (!password) throw new Error('No password field was found after entering the test email')
      await password.fill(credential.password)
      await clickPrimarySignInAction(page)
      await settlePage(page)
      const passwordStillVisible = await page
        .locator('input[type="password"]:visible')
        .first()
        .isVisible()
        .catch(() => false)
      if (passwordStillVisible || isSignInRedirect(new URL(this.siteOrigin), new URL(page.url())))
        throw new Error('The test account was not accepted')
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The sign-in could not be completed'
      throw new Error(`The test account could not sign in. ${detail}`)
    } finally {
      await page.close()
    }
  }
}

/** Find the first visible field without requiring non-technical users to provide CSS selectors. */
async function findVisibleField(page: Page, selectors: string[]): Promise<Locator | undefined> {
  for (const selector of selectors) {
    const field = page.locator(selector).first()
    if (await field.isVisible().catch(() => false)) return field
  }
}

/** Activate the primary continuation action used by common one-step and two-step login forms. */
async function clickPrimarySignInAction(page: Page): Promise<void> {
  const namedAction = page
    .getByRole('button', {
      name: /continue|next|log\s*in|sign\s*in|connexion|se connecter|submit/i
    })
    .first()
  if (await namedAction.isVisible().catch(() => false)) {
    await namedAction.click()
    return
  }
  const submit = page.locator('button[type="submit"], input[type="submit"]').first()
  if (await submit.isVisible().catch(() => false)) {
    await submit.click()
    return
  }
  throw new Error('No continue or sign-in button was found')
}
