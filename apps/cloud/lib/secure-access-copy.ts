export type SecureAccessMethod = 'cloudflare' | 'account' | 'network' | 'unknown'

interface SecureAccessCopyOptions {
  accessMethod: SecureAccessMethod
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
  cloudflare: 'Cloudflare Access or a Cloudflare challenge',
  network: 'A private or internal network',
  unknown: 'Access protection that still needs to be identified'
}

/** Build safe, shareable handoff formats without including any access secret. */
export function buildSecureAccessCopy({
  accessMethod,
  configuration,
  configurationLocation,
  pages,
  platformLabel,
  siteUrl
}: SecureAccessCopyOptions): SecureAccessCopy {
  const pageList = pages.map(page => `- ${page}`).join('\n')
  const accessGuidance = getAccessGuidance(accessMethod)

  return {
    developerInstructions: [
      '# Connect secure CodeRocket access',
      '',
      '## Goal',
      `Allow CodeRocket to check ${siteUrl} from an environment that can already open its protected pages.`,
      '',
      '## Pages to check',
      pageList,
      '',
      '## Current protection',
      accessLabels[accessMethod],
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
      '- Every selected page is reported as reachable.',
      '- No password, cookie, service token, or access header is returned to CodeRocket.',
      '',
      '## Generated configuration',
      '```yaml',
      configuration,
      '```',
      '',
      'This handoff intentionally contains no project key or website access secret.'
    ].join('\n'),
    providerRequest: buildProviderRequest({ accessMethod, pages: pageList, siteUrl })
  }
}

/** Explain the secret or runner requirement for one protection method. */
export function getAccessGuidance(accessMethod: SecureAccessMethod): string {
  if (accessMethod === 'cloudflare')
    return 'Create a dedicated, least-privileged Cloudflare Access service token or approved rule, then store the required headers in `CODEROCKET_SITE_HEADERS_JSON`. A normal anti-bot challenge is not bypassed automatically.'
  if (accessMethod === 'account')
    return 'Use a dedicated, least-privileged test account. Store its server-side session cookie or authorization header in `CODEROCKET_SITE_HEADERS_JSON`; interactive sign-in, MFA, and CAPTCHA are not automated.'
  if (accessMethod === 'network')
    return 'Run the job on a trusted self-hosted runner inside the private network. Do not expose the private site publicly.'
  return 'Identify whether access requires Cloudflare headers, a dedicated test session, or a runner inside the private network before adding `CODEROCKET_SITE_HEADERS_JSON`.'
}

/** Build a non-technical request for the person who manages hosting or access. */
function buildProviderRequest({
  accessMethod,
  pages,
  siteUrl
}: {
  accessMethod: SecureAccessMethod
  pages: string
  siteUrl: string
}): string {
  return [
    'Subject: Secure automated access for CodeRocket website checks',
    '',
    `We use CodeRocket to monitor ${siteUrl}, but its cloud check cannot open the protected pages.`,
    '',
    `Protection detected or expected: ${accessLabels[accessMethod]}.`,
    '',
    'Please help our developer create the narrowest safe automated access for these pages:',
    pages,
    '',
    providerAction(accessMethod),
    '',
    'The access must use a dedicated test identity or runner, must not disable protection for normal visitors, and must be revocable. CodeRocket receives only the audit result; website credentials and access headers stay in our own automation environment.'
  ].join('\n')
}

/** Tailor the hosting request to the selected protection method. */
function providerAction(accessMethod: SecureAccessMethod): string {
  if (accessMethod === 'cloudflare')
    return 'For Cloudflare Access, please create a least-privileged service token or scoped policy for the monitored origin. If this is a WAF challenge rather than Cloudflare Access, please define a narrow approved automation rule instead of disabling the firewall.'
  if (accessMethod === 'account')
    return 'Please provide a dedicated test account or server-side test session with only the permissions required to render these pages. It must not require MFA or CAPTCHA during automated checks.'
  if (accessMethod === 'network')
    return 'Please provide a self-hosted automation runner inside the private network with read-only HTTPS access to these pages.'
  return 'Please identify whether the restriction comes from Cloudflare, an application sign-in, or a private network, then recommend a dedicated and revocable automation method.'
}
