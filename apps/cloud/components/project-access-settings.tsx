'use client'

import type { SiteAccessMode } from '@coderocket/core'
import { LockKeyhole, ShieldCheck } from '@repo/design-system/icons'
import { SiteAccessExplanation, SiteAccessPicker } from './site-access-picker'

/** Keep page access choices aligned with onboarding behind progressive disclosure. */
export function ProjectAccessSettings({
  accessMode,
  secureRunnerRequired,
  onAccessModeChange,
  onSecureRunnerRequiredChange
}: {
  accessMode: SiteAccessMode
  secureRunnerRequired: boolean
  onAccessModeChange: (mode: SiteAccessMode) => void
  onSecureRunnerRequiredChange: (required: boolean) => void
}) {
  const configured = accessMode !== 'public' || secureRunnerRequired
  return (
    <details className="border border-border bg-background" open={configured}>
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
        <span className="flex items-center gap-3">
          <LockKeyhole aria-hidden className="h-4 w-4 text-signal" />
          Page access — optional
        </span>
        <span className="font-mono text-[10px] text-muted uppercase tracking-[.08em]">
          {configured ? 'Configured' : 'Automatic'}
        </span>
      </summary>
      <div className="space-y-4 border-border border-t p-4">
        <div>
          <h3 className="font-heading font-semibold text-lg">Which pages require sign-in?</h3>
          <p className="mt-2 text-muted text-sm leading-6">
            The normal public website is recommended. Choose another option only when you already
            know that selected pages require an account.
          </p>
        </div>
        <SiteAccessPicker onChange={onAccessModeChange} value={accessMode} />
        <SiteAccessExplanation mode={accessMode} secureRunnerRequired={secureRunnerRequired} />
        <label className="flex cursor-pointer items-start gap-3 border border-border bg-surface p-4">
          <input
            checked={secureRunnerRequired}
            className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
            onChange={event => onSecureRunnerRequiredChange(event.target.checked)}
            type="checkbox"
          />
          <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-signal" />
          <span>
            <span className="block font-semibold text-sm">
              The whole site also needs private infrastructure access
            </span>
            <span className="mt-1 block text-muted text-xs leading-5">
              Use this only for a VPN, private network, client certificate, CAPTCHA, or browser-only
              login. Hosting passwords and test sessions can use guided cloud access instead.
            </span>
          </span>
        </label>
      </div>
    </details>
  )
}
