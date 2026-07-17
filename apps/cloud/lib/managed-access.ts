export type ManagedAccessKind =
  | 'vercel'
  | 'cloudflare'
  | 'basic_auth'
  | 'bearer_token'
  | 'session_cookie'
  | 'custom_headers'

export type ManagedAccessScope = 'all' | 'authenticated'
export type ManagedAccessStatus = 'configured' | 'verified' | 'failed'

export interface ProjectManagedAccess {
  displayLabel: string
  kind: ManagedAccessKind
  lastError?: string
  lastVerifiedAt?: string
  scope: ManagedAccessScope
  status: ManagedAccessStatus
}

export type AccessBarrierKind =
  | 'vercel'
  | 'cloudflare'
  | 'basic_auth'
  | 'application_sign_in'
  | 'private_network'
  | 'interactive_challenge'
  | 'generic_access'

interface AccessEvidencePage {
  error?: string
  httpStatus?: number
  reachable: boolean
}

/** Identify the simplest honest recovery path from stored page-level network evidence. */
export function diagnoseAccessBarrier(pages: AccessEvidencePage[]): AccessBarrierKind {
  const evidence = pages
    .filter(page => !page.reachable)
    .map(page => `${page.httpStatus ?? ''} ${page.error ?? ''}`)
    .join('\n')
  if (/vercel deployment protection|x-vercel/i.test(evidence)) return 'vercel'
  if (/cloudflare|cf-mitigated|identity proxy|google iap|access gateway/i.test(evidence))
    return 'cloudflare'
  if (/basic authentication|www-authenticate/i.test(evidence)) return 'basic_auth'
  if (
    /private or reserved network|private network|vpn|vpc|tunnel|enotfound.*internal/i.test(evidence)
  )
    return 'private_network'
  if (/captcha|browser verification|interactive challenge|javascript challenge/i.test(evidence))
    return 'interactive_challenge'
  if (/sign[- ]?in|log[- ]?in|authentication required|unauthorized|\b401\b/i.test(evidence))
    return 'application_sign_in'
  return 'generic_access'
}

/** Provide a non-secret label suitable for status UI and audit logs. */
export function getManagedAccessLabel(kind: ManagedAccessKind): string {
  if (kind === 'vercel') return 'Vercel preview access'
  if (kind === 'cloudflare') return 'Cloudflare Access'
  if (kind === 'basic_auth') return 'Preview username and password'
  if (kind === 'bearer_token') return 'Dedicated access token'
  if (kind === 'session_cookie') return 'Dedicated test session'
  return 'Custom access headers'
}
