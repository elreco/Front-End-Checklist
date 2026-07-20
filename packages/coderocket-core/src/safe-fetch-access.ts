import type { SafeHttpResponse } from './safe-fetch-response'

const SIGN_IN_PATH_PATTERN = /(?:^|\/)(?:auth\/)?(?:log-?in|sign-?in|session|sso)(?:\/|$)/i
const FORBIDDEN_REQUEST_HEADERS = new Set([
  'accept',
  'connection',
  'content-length',
  'host',
  'proxy-authorization',
  'te',
  'transfer-encoding',
  'upgrade',
  'user-agent'
])

/** Validate bounded custom headers before any network request is created. */
export function normalizeSafeRequestHeaders(
  input: Record<string, string> = {}
): Record<string, string> {
  const entries = Object.entries(input)
  if (entries.length > 20) throw new Error('Too many custom request headers')
  const headers: Record<string, string> = {}
  for (const [rawName, value] of entries) {
    const name = rawName.trim().toLowerCase()
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(name) || FORBIDDEN_REQUEST_HEADERS.has(name))
      throw new Error(`Request header ${rawName} is not allowed`)
    if (value.length > 4096 || /[\r\n]/.test(value))
      throw new Error(`Request header ${rawName} has an invalid value`)
    headers[name] = value
  }
  return headers
}

/** Recognize routes that intentionally represent a sign-in page. */
function isExplicitSignInPage(url: URL): boolean {
  return SIGN_IN_PATH_PATTERN.test(url.pathname)
}

/** Detect when a protected page was replaced by a same-origin sign-in redirect. */
export function isSignInRedirect(requestedUrl: URL, destination: URL): boolean {
  return (
    requestedUrl.origin === destination.origin &&
    !isExplicitSignInPage(requestedUrl) &&
    isExplicitSignInPage(destination)
  )
}

/** Reject a rendered login form when a different protected page was requested. */
export function assertHtmlIsRequestedPage(requestedUrl: URL, html: string): void {
  if (isExplicitSignInPage(requestedUrl)) return
  const sample = html.slice(0, 250_000)
  const hasPasswordField = /<input\b[^>]*\btype\s*=\s*["']?password\b/i.test(sample)
  const hasSignInLanguage =
    /\b(?:log\s*in|sign\s*in|connexion|se connecter|authenticate|single sign-on|continue with)\b/i.test(
      sample
    )
  if (hasPasswordField && hasSignInLanguage) throw new Error('The page returned a sign-in screen')
}

/** Convert recognizable hosting protection responses into actionable access diagnostics. */
export async function rejectKnownAccessBarrier(
  response: SafeHttpResponse,
  noun: 'page' | 'resource'
): Promise<void> {
  if (response.headers.get('cf-mitigated')?.toLowerCase() === 'challenge') {
    await response.discard()
    throw new Error(`The site returned a Cloudflare challenge instead of the ${noun}`)
  }
  if (
    response.headers.has('x-vercel-challenge-token') ||
    ((response.status === 401 || response.status === 403) &&
      response.headers.get('server')?.toLowerCase().includes('vercel'))
  ) {
    await response.discard()
    throw new Error(`Vercel deployment protection blocked the ${noun}`)
  }
  if (
    response.status === 401 &&
    response.headers.get('www-authenticate')?.trim().toLowerCase().startsWith('basic')
  ) {
    await response.discard()
    throw new Error(`HTTP Basic authentication is required to open the ${noun}`)
  }
}
