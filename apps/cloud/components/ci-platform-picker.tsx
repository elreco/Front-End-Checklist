'use client'

import {
  BitbucketBrandIcon,
  GitHubBrandIcon,
  GitLabBrandIcon
} from '@repo/design-system/brand-icons'
import { Check, Terminal } from '@repo/design-system/icons'
import type { ComponentType } from 'react'
import type { CiPlatform } from '@/lib/ci-config'

interface PlatformOption {
  description: string
  icon: ComponentType<{ className?: string }>
  label: string
  value: CiPlatform
}

const platforms: PlatformOption[] = [
  {
    value: 'github',
    label: 'GitHub',
    description: 'GitHub Actions workflow',
    icon: GitHubBrandIcon
  },
  {
    value: 'gitlab',
    label: 'GitLab',
    description: 'GitLab CI/CD job',
    icon: GitLabBrandIcon
  },
  {
    value: 'bitbucket',
    label: 'Bitbucket',
    description: 'Bitbucket Pipeline',
    icon: BitbucketBrandIcon
  },
  {
    value: 'other',
    label: 'Another platform',
    description: 'Any CI with Node.js 20+',
    icon: Terminal
  }
]

/** Let an owner choose familiar CI language before any configuration is shown. */
export function CiPlatformPicker({
  onChange,
  value
}: {
  onChange: (platform: CiPlatform) => void
  value: CiPlatform
}) {
  return (
    <fieldset>
      <legend className="font-semibold text-sm">Where should CodeRocket run?</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {platforms.map(platform => {
          const Icon = platform.icon
          const selected = platform.value === value
          return (
            <label
              className={`cursor-pointer border p-3 transition-colors focus-within:outline-2 focus-within:outline-signal focus-within:outline-offset-2 ${
                selected
                  ? 'border-signal bg-signal/10'
                  : 'border-border bg-background hover:border-accent'
              }`}
              key={platform.value}
            >
              <input
                checked={selected}
                className="sr-only"
                name="ciPlatform"
                onChange={() => onChange(platform.value)}
                type="radio"
                value={platform.value}
              />
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-surface">
                  <Icon className="h-4 w-4 text-signal" />
                </span>
                <span>
                  <span className="block font-semibold text-sm">{platform.label}</span>
                  <span className="mt-0.5 block text-muted text-xs">{platform.description}</span>
                </span>
                {selected ? (
                  <Check aria-hidden className="ml-auto h-4 w-4 shrink-0 text-success" />
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
