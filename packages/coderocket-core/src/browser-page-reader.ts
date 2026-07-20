import type { Page } from 'playwright-core'
import type { SafeHtmlResponse } from './safe-fetch'
import { assertHtmlIsRequestedPage, isSignInRedirect } from './safe-fetch-access'

const MAX_BROWSER_HTML_BYTES = 2 * 1024 * 1024
const NAVIGATION_TIMEOUT_MS = 20_000
const SETTLE_TIMEOUT_MS = 2_000

export interface BrowserPageSource extends SafeHtmlResponse {
  renderedHtml: string
}

/** Capture both the received response and the DOM after the page application has rendered. */
export async function readBrowserPage(page: Page, requestedUrl: URL): Promise<BrowserPageSource> {
  const startedAt = performance.now()
  const response = await page.goto(requestedUrl.toString(), {
    timeout: NAVIGATION_TIMEOUT_MS,
    waitUntil: 'commit'
  })
  if (!response) throw new Error('The website did not return a document')
  await waitForReadableDocument(page)
  await settlePage(page)
  const finalUrl = new URL(page.url())
  if (isSignInRedirect(requestedUrl, finalUrl))
    throw new Error(`The page redirected to a sign-in screen at ${finalUrl.pathname}`)
  const renderedHtml = await page.content()
  assertHtmlIsRequestedPage(requestedUrl, renderedHtml)
  const status = response.status()
  const headers = await response.allHeaders()
  if (headers['cf-mitigated']?.toLowerCase() === 'challenge')
    throw new Error('The site returned a Cloudflare challenge instead of the page')
  if (
    headers['x-vercel-challenge-token'] ||
    ((status === 401 || status === 403) && headers.server?.toLowerCase().includes('vercel'))
  )
    throw new Error('Vercel deployment protection blocked the page')
  if (status < 200 || status >= 300) throw new Error(`HTTP ${status}`)
  const contentType = headers['content-type']?.toLowerCase() ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml'))
    throw new Error('Response is not HTML')
  if (
    /(?:just a moment|checking your browser|performing security verification)/i.test(
      renderedHtml.slice(0, 50_000)
    )
  )
    throw new Error('An interactive browser verification blocked the page')
  const responseBody = await response.body()
  if (responseBody.byteLength > MAX_BROWSER_HTML_BYTES)
    throw new Error('HTML response exceeds the 2 MB audit limit')
  const html = responseBody.toString('utf8') || renderedHtml
  if (new TextEncoder().encode(renderedHtml).byteLength > MAX_BROWSER_HTML_BYTES)
    throw new Error('Rendered page exceeds the 2 MB audit limit')
  return {
    durationMs: Math.round(performance.now() - startedAt),
    fetchedAt: new Date().toISOString(),
    headers,
    html,
    renderedHtml,
    status,
    url: finalUrl.toString()
  }
}

/**
 * Continue as soon as a meaningful document is visible, even when a heavy third-party script keeps
 * the browser's DOMContentLoaded event waiting past the navigation budget.
 */
export async function waitForReadableDocument(page: Page): Promise<void> {
  await Promise.race([
    page
      .waitForLoadState('domcontentloaded', { timeout: NAVIGATION_TIMEOUT_MS })
      .catch(() => undefined),
    page
      .waitForFunction(
        `document.body !== null && (
          (document.body.textContent ?? '').trim().length >= 40
          || document.body.querySelector('main,header,img,svg,video') !== null
        )`,
        undefined,
        { timeout: NAVIGATION_TIMEOUT_MS }
      )
      .catch(() => undefined)
  ])
}

/** Let client-side redirects and hydration finish without waiting indefinitely on live connections. */
export async function settlePage(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => undefined)
  await page.waitForTimeout(250)
}
