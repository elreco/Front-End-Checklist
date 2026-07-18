'use client'

import { BellRing, Mail } from '@repo/design-system/icons'
import { useId } from 'react'
import type { ProjectEmailAlerts } from '@/lib/project-data-types'

/** Edit one site's narrow, actionable email alert preferences. */
export function ProjectEmailAlertSettings({
  alertEmail,
  settings,
  onChange
}: {
  alertEmail?: string
  settings: ProjectEmailAlerts
  onChange: (settings: ProjectEmailAlerts) => void
}) {
  const titleId = useId()
  const emailAvailable = Boolean(alertEmail)

  /** Preserve event choices while turning the whole channel on or off. */
  function setEnabled(enabled: boolean) {
    onChange({
      ...settings,
      enabled,
      ...(enabled && !settings.newProblems && !settings.checkFailures
        ? { checkFailures: true, newProblems: true }
        : {})
    })
  }

  return (
    <section aria-labelledby={titleId} className="border border-border bg-background p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-signal text-signal">
          <BellRing aria-hidden className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-heading font-semibold text-lg" id={titleId}>
            Email alerts
          </h3>
          <p className="mt-1 text-muted text-xs leading-5">
            Receive a short email only when this site needs your attention.
          </p>
        </div>
      </div>

      <div className="mt-4 border border-border bg-surface p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            checked={settings.enabled && emailAvailable}
            className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
            disabled={!emailAvailable}
            onChange={event => setEnabled(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block font-semibold text-sm">Send email alerts for this site</span>
            <span className="mt-1 block text-muted text-xs leading-5">
              Turn this off without changing the checks, history, or saved problems.
            </span>
          </span>
        </label>

        <div className="mt-4 grid gap-2 border-border border-t pt-4 sm:grid-cols-2">
          <EmailAlertChoice
            checked={settings.newProblems}
            description="When a check discovers a new urgent or important problem."
            disabled={!settings.enabled || !emailAvailable}
            label="New important problems"
            onChange={checked => onChange({ ...settings, newProblems: checked })}
          />
          <EmailAlertChoice
            checked={settings.checkFailures}
            description="After repeated incomplete checks or three failed attempts."
            disabled={!settings.enabled || !emailAvailable}
            label="Repeated check failures"
            onChange={checked => onChange({ ...settings, checkFailures: checked })}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-muted text-xs">
        <Mail aria-hidden className="h-4 w-4 shrink-0 text-signal" />
        {alertEmail ? (
          <span>
            Alerts go to <span className="font-medium text-foreground">{alertEmail}</span>
          </span>
        ) : (
          <span>A sign-in email is required before alerts can be sent.</span>
        )}
      </div>
    </section>
  )
}

/** Render one independently configurable actionable email event. */
function EmailAlertChoice({
  checked,
  description,
  disabled,
  label,
  onChange
}: {
  checked: boolean
  description: string
  disabled: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-3 border border-border p-3 ${
        disabled ? 'cursor-not-allowed text-muted' : 'cursor-pointer'
      }`}
    >
      <input
        checked={checked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block font-semibold text-sm">{label}</span>
        <span className="mt-1 block text-muted text-xs leading-5">{description}</span>
      </span>
    </label>
  )
}
