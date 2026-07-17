import {
  Cloud,
  KeyRound,
  type LucideIcon,
  Router,
  ShieldCheck,
  UserRound
} from '@repo/design-system/icons'
import type { AccessBarrierKind, ManagedAccessKind } from '@/lib/managed-access'

export interface ManagedAccessMethodOption {
  icon: LucideIcon
  kind: ManagedAccessKind
  label: string
  summary: string
}

export const managedAccessMethodOptions: ManagedAccessMethodOption[] = [
  {
    icon: Cloud,
    kind: 'vercel',
    label: 'Vercel preview',
    summary: 'A Vercel deployment-protection screen blocks the page.'
  },
  {
    icon: ShieldCheck,
    kind: 'cloudflare',
    label: 'Cloudflare Access',
    summary: 'Cloudflare, an identity proxy, or a WAF protects the site.'
  },
  {
    icon: KeyRound,
    kind: 'basic_auth',
    label: 'Preview password',
    summary: 'The browser asks for a username and password before opening the site.'
  },
  {
    icon: UserRound,
    kind: 'session_cookie',
    label: 'Application sign-in',
    summary: 'Selected pages require a dedicated test session or access token.'
  },
  {
    icon: Router,
    kind: 'custom_headers',
    label: 'Another access header',
    summary: 'A gateway or hosting provider gave you one or more dedicated request headers.'
  }
]

/** Map detected evidence to the smallest supported guided connection. */
export function getRecommendedManagedAccessKind(
  barrier: AccessBarrierKind
): ManagedAccessKind | null {
  if (barrier === 'vercel') return 'vercel'
  if (barrier === 'cloudflare') return 'cloudflare'
  if (barrier === 'basic_auth') return 'basic_auth'
  if (barrier === 'application_sign_in') return 'session_cookie'
  return null
}

/** Distinguish page-scoped application sessions from origin-wide infrastructure access. */
export function managedAccessKindIsPageSession(kind: ManagedAccessKind | null): boolean {
  return kind === 'session_cookie' || kind === 'bearer_token'
}

/** Return the plain-language label used above the selected access form. */
export function getManagedAccessMethodTitle(kind: ManagedAccessKind): string {
  return managedAccessMethodOptions.find(option => option.kind === kind)?.label ?? 'Custom access'
}

/** Convert a browser form into the small discriminated payload accepted by the secure API. */
export function buildManagedAccessPayload(
  kind: ManagedAccessKind,
  scope: 'all' | 'authenticated',
  formData: FormData,
  authenticatedPaths: string[]
): Record<string, unknown> {
  /** Read one expected form value as a string without trusting browser form data. */
  function value(name: string): string {
    return String(formData.get(name) ?? '')
  }
  if (kind === 'vercel') return { kind, scope, secret: value('secret') }
  if (kind === 'cloudflare')
    return {
      clientId: value('clientId'),
      clientSecret: value('clientSecret'),
      kind,
      scope
    }
  if (kind === 'basic_auth')
    return { kind, password: value('password'), scope, username: value('username') }
  if (kind === 'bearer_token')
    return { kind, paths: authenticatedPaths, scope, token: value('token') }
  if (kind === 'session_cookie')
    return { cookie: value('cookie'), kind, paths: authenticatedPaths, scope }
  const headers = Object.fromEntries(
    value('headers')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const separator = line.indexOf(':')
        return separator > 0
          ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
          : []
      })
      .filter(entry => entry.length === 2)
  )
  return { headers, kind, scope }
}
