import type { Page } from 'playwright-core'
import { settlePage, waitForReadableDocument } from './browser-page-reader'

const SETTLE_TIMEOUT_MS = 2_000

/**
 * Give responsive applications time to replace their layout after a viewport change. This keeps
 * mobile previews from recording a temporary blank frame without waiting indefinitely.
 */
export async function waitForResponsiveLayout(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'))
    window.scrollTo(0, 0)
  })
  await page
    .waitForFunction(
      `(() => {
        const main = document.querySelector('main, [role="main"]')
        if (!main) return document.body?.children.length > 1
        const text = (main.textContent ?? '').trim()
        return text.length >= 20 || main.querySelector('img, picture, video, svg') !== null
      })()`,
      undefined,
      { timeout: SETTLE_TIMEOUT_MS }
    )
    .catch(() => undefined)
  await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS }).catch(() => undefined)
  await page.waitForTimeout(350)
}

/** Briefly reveal a bounded page depth so native lazy images are available to the clone. */
export async function warmLazyPageMedia(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const maximum = Math.min(document.documentElement.scrollHeight, 12_000)
    const step = Math.max(600, Math.floor(window.innerHeight * 0.8))
    for (let offset = 0; offset <= maximum; offset += step) {
      window.scrollTo(0, offset)
      await new Promise(resolve => window.setTimeout(resolve, 40))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(150)
}

/**
 * Dismiss only an explicit privacy-preserving cookie choice in the isolated browser. Never accept
 * optional tracking or guess at an unnamed control merely to reveal the page.
 */
export async function dismissOptionalCookieNotice(page: Page): Promise<void> {
  const reject = page
    .getByRole('button', {
      name: /^(tout refuser|refuser tout|reject all|decline all|reject optional|necessary only)$/i
    })
    .first()
  if (!(await reject.isVisible().catch(() => false))) return
  const navigation = page
    .waitForEvent('framenavigated', {
      predicate: frame => frame === page.mainFrame(),
      timeout: 1_500
    })
    .catch(() => undefined)
  await reject.click({ timeout: 1_500 }).catch(() => undefined)
  await navigation
  await waitForReadableDocument(page)
  await settlePage(page)
}
