'use client'

import {
  Check,
  Cloud,
  HelpCircle,
  LockKeyhole,
  Network,
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
    label: 'Cloudflare',
    description: 'Cloudflare Access, a firewall, or a challenge blocks the page.',
    icon: Cloud
  },
  {
    value: 'account',
    label: 'A user account',
    description: 'The page needs a dedicated test session, cookie, or authorization header.',
    icon: UserRound
  },
  {
    value: 'network',
    label: 'A private network',
    description: 'The check must run from inside a company or internal network.',
    icon: Network
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
  onChange: (method: SecureAccessMethod) => void
  value: SecureAccessMethod
}) {
  return (
    <fieldset>
      <legend className="font-semibold text-sm">
        What prevents the cloud check from opening it?
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map(option => {
          const Icon = option.icon
          const selected = option.value === value
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
                onChange={() => onChange(option.value)}
                type="radio"
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
        CodeRocket never needs your normal password. Use a dedicated test identity or a restricted
        runner that you can revoke.
      </p>
    </fieldset>
  )
}
