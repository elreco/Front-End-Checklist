'use client'

import {
  Bot,
  Check,
  Cloud,
  FileKey2,
  HelpCircle,
  KeyRound,
  LockKeyhole,
  MonitorSmartphone,
  Network,
  Router,
  ShieldCheck,
  UserRound
} from '@repo/design-system/icons'
import type { ComponentType } from 'react'
import type { SecureAccessMethod } from '@/lib/secure-access-copy'

interface AccessOption {
  description: string
  icon: ComponentType<{ className?: string }>
  label: string
  value: SecureAccessMethod
}

const options: AccessOption[] = [
  {
    value: 'cloudflare',
    label: 'Identity proxy or WAF',
    description:
      'Cloudflare Access, Google IAP, an SSO gateway, firewall, or edge challenge blocks requests.',
    icon: Cloud
  },
  {
    value: 'account',
    label: 'Application sign-in',
    description: 'Some pages need a dedicated test session, cookie, SSO token, or API token.',
    icon: UserRound
  },
  {
    value: 'basic_auth',
    label: 'Preview password',
    description: 'HTTP Basic Auth or a hosting preview password protects the whole origin.',
    icon: KeyRound
  },
  {
    value: 'custom_headers',
    label: 'Custom access headers',
    description: 'A gateway, preview deployment, or hosting platform expects special headers.',
    icon: Router
  },
  {
    value: 'network',
    label: 'Private network or VPN',
    description: 'The check must run from inside a company network, VPC, tunnel, or VPN.',
    icon: Network
  },
  {
    value: 'ip_allowlist',
    label: 'IP allowlist',
    description: 'A firewall accepts requests only from approved, stable outbound addresses.',
    icon: ShieldCheck
  },
  {
    value: 'client_certificate',
    label: 'Client certificate',
    description: 'The server requires a dedicated mTLS certificate before returning the page.',
    icon: FileKey2
  },
  {
    value: 'bot_challenge',
    label: 'Bot or CAPTCHA challenge',
    description:
      'Browser verification, CAPTCHA, or another interactive challenge blocks automation.',
    icon: Bot
  },
  {
    value: 'browser_session',
    label: 'Browser-only page or login',
    description:
      'The useful content appears only after JavaScript, a multi-step login, or browser state.',
    icon: MonitorSmartphone
  },
  {
    value: 'unknown',
    label: 'I am not sure',
    description: 'Prepare instructions that a developer or hosting provider can diagnose.',
    icon: HelpCircle
  }
]

/** Let an owner describe site protection without requiring infrastructure vocabulary. */
export function SecureAccessMethodPicker({
  onChange,
  value
}: {
  onChange: (methods: SecureAccessMethod[]) => void
  value: readonly SecureAccessMethod[]
}) {
  /** Toggle one layer while keeping the uncertain choice mutually exclusive. */
  function toggleMethod(method: SecureAccessMethod) {
    if (method === 'unknown') {
      onChange(['unknown'])
      return
    }
    const knownMethods = value.filter(candidate => candidate !== 'unknown')
    const nextMethods = knownMethods.includes(method)
      ? knownMethods.filter(candidate => candidate !== method)
      : [...knownMethods, method]
    onChange(nextMethods.length > 0 ? nextMethods : ['unknown'])
  }

  return (
    <fieldset>
      <legend className="font-semibold text-sm">Access details — optional</legend>
      <p className="mt-1 text-muted text-xs leading-5">
        CodeRocket already prepared a safe default. A developer can add details here when the site
        uses several protection layers.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map(option => {
          const Icon = option.icon
          const selected = value.includes(option.value)
          return (
            <label
              className={`cursor-pointer border p-3 transition-colors focus-within:outline-2 focus-within:outline-signal focus-within:outline-offset-2 ${
                selected
                  ? 'border-signal bg-signal/10'
                  : 'border-border bg-background hover:border-accent'
              }`}
              key={option.value}
            >
              <input
                checked={selected}
                className="sr-only"
                name="secureAccessMethod"
                onChange={() => toggleMethod(option.value)}
                type="checkbox"
                value={option.value}
              />
              <span className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface">
                  <Icon aria-hidden className="h-4 w-4 text-signal" />
                </span>
                <span>
                  <span className="block font-semibold text-sm">{option.label}</span>
                  <span className="mt-1 block text-muted text-xs leading-5">
                    {option.description}
                  </span>
                </span>
                {selected ? (
                  <Check aria-hidden className="ml-auto h-4 w-4 shrink-0 text-success" />
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
      <p className="mt-3 flex items-start gap-2 text-muted text-xs leading-5">
        <LockKeyhole aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        GitHub or GitLab does not gain access automatically. Every selected layer needs a dedicated,
        revocable automation path. Interactive CAPTCHA, MFA, and browser verification require a
        scoped service policy instead of being bypassed by CodeRocket. JavaScript-only pages need
        the planned browser runner and are not presented as covered by today’s HTML runner.
      </p>
    </fieldset>
  )
}
