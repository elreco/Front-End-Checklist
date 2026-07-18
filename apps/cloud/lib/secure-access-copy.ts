export type SecureAccessMethod =
  | 'cloudflare'
  | 'account'
  | 'network'
  | 'basic_auth'
  | 'ip_allowlist'
  | 'custom_headers'
  | 'client_certificate'
  | 'bot_challenge'
  | 'browser_session'
  | 'unknown'

interface SecureAccessCopyOptions {
  accessMethods: readonly SecureAccessMethod[]
  authenticatedPages: readonly string[]
  configuration: string
  configurationLocation: string
  pages: string[]
  platformLabel: string
  siteUrl: string
}

export interface SecureAccessCopy {
  developerInstructions: string
  providerRequest: string
}

const accessLabels: Record<SecureAccessMethod, string> = {
  account: 'A user account or authenticated session',
  basic_auth: 'HTTP Basic Auth or a preview password',
  bot_challenge: 'A bot challenge, CAPTCHA, or browser verification',
  browser_session: 'A JavaScript-rendered page or interactive browser login',
  client_certificate: 'A client certificate (mTLS)',
  cloudflare: 'An identity-aware proxy, WAF, or edge challenge',
  custom_headers: 'Custom gateway or preview access headers',
  ip_allowlist: 'An IP allowlist or fixed-egress firewall rule',
  network: 'A private or internal network',
  unknown: 'Access protection that still needs to be identified'
}

/** Build safe, shareable handoff formats without including any access secret. */
export function buildSecureAccessCopy({
  accessMethods,
  authenticatedPages,
  configuration,
  configurationLocation,
  pages,
  platformLabel,
  siteUrl
}: SecureAccessCopyOptions): SecureAccessCopy {
  const pageList = pages.map(page => `- ${page}`).join('\n')
  const authenticatedSet = new Set(authenticatedPages)
  const accessPageList = pages
    .map(page => `- ${page} — ${authenticatedSet.has(page) ? 'signed-in session' : 'anonymous'}`)
    .join('\n')
  const normalizedMethods = normalizeAccessMethods(accessMethods)
  const accessGuidance = getAccessGuidance(normalizedMethods)

  return {
    developerInstructions: [
      '# Connect secure CodeRocket access',
      '',
      '## Goal',
      `Allow CodeRocket to check ${siteUrl} from an environment that can already open its protected pages.`,
      '',
      '## Pages to check',
      accessPageList,
      '',
      '## Current protection layers',
      normalizedMethods.map(method => `- ${accessLabels[method]}`).join('\n'),
      '',
      '## Setup',
      `1. In CodeRocket, create a project key for ${platformLabel}.`,
      '2. Save it as `CODEROCKET_TOKEN` in the protected secret store. Never commit it.',
      `3. Add the generated configuration at \`${configurationLocation}\`.`,
      `4. ${accessGuidance}`,
      '5. Run the job once manually.',
      '',
      '## Success criteria',
      '- The job completes with exit code 0 or 1, not operational exit code 2.',
      '- CodeRocket shows at least one secure check received.',
      '- Every selected page is submitted in the same result and reported as reachable.',
      '- Public pages are checked anonymously; only marked pages receive the test session.',
      '- No password, cookie, service token, or access header is returned to CodeRocket.',
      '',
      '## Generated configuration',
      '```yaml',
      configuration,
      '```',
      '',
      'This handoff intentionally contains no project key or website access secret.'
    ].join('\n'),
    providerRequest: buildProviderRequest({
      accessMethods: normalizedMethods,
      pages: pageList,
      siteUrl
    })
  }
}

/** Explain every secret or runner requirement selected for one protected site. */
export function getAccessGuidance(accessMethods: readonly SecureAccessMethod[]): string {
  const methods = normalizeAccessMethods(accessMethods)
  if (methods.includes('unknown'))
    return 'Identify every layer first: application sign-in, Cloudflare or another identity proxy, preview password, custom headers, IP allowlist, private network, client certificate, bot challenge, or a browser-only page. Several can apply at once.'

  const guidance = methods.map(method => {
    if (method === 'cloudflare')
      return 'create a dedicated, least-privileged service identity for Cloudflare Access, Google IAP, the SSO gateway, or WAF in front of the site, then store its request headers in `CODEROCKET_SITE_HEADERS_JSON`'
    if (method === 'account')
      return 'use a dedicated, least-privileged test account and store its server-side session cookie or authorization header in `CODEROCKET_AUTH_HEADERS_JSON`; it is sent only to pages marked as requiring sign-in, and interactive login, MFA, and CAPTCHA are not automated'
    if (method === 'basic_auth')
      return 'store the restricted HTTP Basic Authorization header in `CODEROCKET_SITE_HEADERS_JSON`; use a dedicated preview credential rather than a personal password'
    if (method === 'custom_headers')
      return 'store the dedicated gateway or preview headers in `CODEROCKET_SITE_HEADERS_JSON`; they are applied to every monitored page on the configured origin'
    if (method === 'network')
      return 'run the job on a trusted self-hosted runner inside the private network or connected through the organization VPN instead of exposing the site publicly'
    if (method === 'ip_allowlist')
      return 'use a runner with stable, approved egress and add only that address to the allowlist; ephemeral hosted-runner addresses are not a reliable security boundary'
    if (method === 'client_certificate')
      return 'run through an organization-managed runner or local proxy that presents the restricted client certificate; CodeRocket does not upload or store the certificate'
    if (method === 'browser_session')
      return 'run the generated real-browser check and provide a dedicated reusable session through the protected CI secrets; JavaScript is executed, but CAPTCHA, MFA, and interactive SSO must be completed outside the check'
    return 'replace the interactive bot challenge with a narrowly scoped service identity or automation bypass for the monitored origin; CodeRocket cannot solve CAPTCHA or browser-verification challenges'
  })
  if (guidance.length === 1) {
    const [onlyGuidance = 'identify the required access layer'] = guidance
    return `${capitalize(onlyGuidance)}.`
  }
  return `Configure every selected layer: ${guidance.map((item, index) => `(${index + 1}) ${item}`).join('; ')}.`
}

/** Build a non-technical request for the person who manages hosting or access. */
function buildProviderRequest({
  accessMethods,
  pages,
  siteUrl
}: {
  accessMethods: readonly SecureAccessMethod[]
  pages: string
  siteUrl: string
}): string {
  const methods = normalizeAccessMethods(accessMethods)
  return [
    'Subject: Secure automated access for CodeRocket website checks',
    '',
    `We use CodeRocket to monitor ${siteUrl}, but its cloud check cannot open the protected pages.`,
    '',
    'Protection detected or expected:',
    methods.map(method => `- ${accessLabels[method]}`).join('\n'),
    '',
    'Please help our developer create the narrowest safe automated access for these pages:',
    pages,
    '',
    providerAction(methods),
    '',
    'The access must use a dedicated test identity or runner, must not disable protection for normal visitors, and must be revocable. CodeRocket receives only the audit result; website credentials and access headers stay in our own automation environment.'
  ].join('\n')
}

/** Tailor the hosting request to every selected protection layer. */
function providerAction(accessMethods: readonly SecureAccessMethod[]): string {
  if (accessMethods.includes('unknown'))
    return 'Please identify every active restriction, including application sign-in, identity proxy, preview password, custom header, IP allowlist, private network, client certificate, bot challenge, or a JavaScript-only page, then recommend a dedicated and revocable automation method.'

  const actions = accessMethods.map(method => {
    if (method === 'cloudflare')
      return 'For the identity proxy or WAF, create a least-privileged service identity or scoped automation policy for the monitored origin instead of disabling protection for normal visitors.'
    if (method === 'account')
      return 'Provide a dedicated test account or server-side test session with only the permissions required to render these pages. It must not require MFA or CAPTCHA during automated checks.'
    if (method === 'basic_auth')
      return 'Provide a dedicated, revocable HTTP Basic Auth or preview credential for this automated check.'
    if (method === 'custom_headers')
      return 'Provide dedicated, revocable gateway or preview headers scoped to the monitored origin.'
    if (method === 'network')
      return 'Provide a self-hosted automation runner inside the private network or connected through the approved VPN with read-only HTTPS access.'
    if (method === 'ip_allowlist')
      return 'Provide a fixed-egress runner and allowlist only its stable outbound address for the monitored origin.'
    if (method === 'client_certificate')
      return 'Provide an organization-managed runner or proxy that presents a dedicated, revocable client certificate without sharing the certificate with CodeRocket.'
    if (method === 'browser_session')
      return 'Prepare a dedicated reusable browser session for the generated secure runner. CodeRocket executes JavaScript, but the automated check must not attempt to solve CAPTCHA, MFA, or an interactive SSO approval.'
    return 'Provide a narrowly scoped non-interactive automation policy. CAPTCHA or browser-verification challenges cannot be solved by the CodeRocket HTML checker.'
  })
  return actions.map((action, index) => `${index + 1}. ${action}`).join('\n')
}

/** Keep the uncertain option exclusive and remove duplicate protection layers. */
function normalizeAccessMethods(
  accessMethods: readonly SecureAccessMethod[]
): SecureAccessMethod[] {
  const uniqueMethods = [...new Set(accessMethods)]
  const knownMethods = uniqueMethods.filter(method => method !== 'unknown')
  return knownMethods.length > 0 ? knownMethods : ['unknown']
}

/** Capitalize one generated instruction without changing its technical content. */
function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}
