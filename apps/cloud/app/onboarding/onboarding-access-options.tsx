'use client'

import type { SiteAccessMode } from '@coderocket/core'
import { LockKeyhole, ShieldCheck } from '@repo/design-system/icons'
import { SiteAccessExplanation, SiteAccessPicker } from '@/components/site-access-picker'

/** Keep protected-page choices available without putting them in the default onboarding path. */
export function OnboardingAccessOptions({
  accessMode,
  onAccessModeChange,
  onSecureRunnerRequiredChange,
  secureRunnerRequired
}: {
  accessMode: SiteAccessMode
  onAccessModeChange: (mode: SiteAccessMode) => void
  onSecureRunnerRequiredChange: (required: boolean) => void
  secureRunnerRequired: boolean
}) {
  return (
    <details className="max-w-2xl border border-border bg-background">
      <summary className="flex cursor-pointer items-center gap-3 p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
        <LockKeyhole aria-hidden className="h-4 w-4 text-signal" />
        Choose page access manually — optional
      </summary>
      <div className="space-y-4 border-border border-t p-4">
        <div>
          <h3 className="font-heading font-semibold text-lg">Which pages require sign-in?</h3>
          <p className="mt-2 text-muted text-sm leading-6">
            Use this only when you already know the selected pages need an account. Technical access
            details can be connected later.
          </p>
        </div>
        <SiteAccessPicker onChange={onAccessModeChange} value={accessMode} />
        <SiteAccessExplanation mode={accessMode} secureRunnerRequired={secureRunnerRequired} />
        <label className="flex cursor-pointer items-start gap-3 border border-border bg-surface p-4">
          <input
            checked={secureRunnerRequired}
            className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
            name="secureRunnerRequired"
            onChange={event => onSecureRunnerRequiredChange(event.target.checked)}
            type="checkbox"
            value="true"
          />
          <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-signal" />
          <span>
            <span className="block font-semibold text-sm">The whole site is also protected</span>
            <span className="mt-1 block text-muted text-xs leading-5">
              Select this only when the normal website cannot be opened without company, hosting, or
              network access.
            </span>
          </span>
        </label>
      </div>
    </details>
  )
}
