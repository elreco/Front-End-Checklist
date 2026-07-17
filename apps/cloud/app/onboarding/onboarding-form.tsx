'use client'

import type { SiteAccessMode } from '@coderocket/core'
import { ArrowLeft, ArrowRight, Check, Globe2, Radar, UserRound } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput, CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import { useEffect, useRef, useState } from 'react'
import { SiteAccessExplanation, SiteAccessPicker } from '@/components/site-access-picker'
import { createProject } from './actions'

const audienceOptions = [
  {
    value: 'site_owner',
    title: 'My own website',
    description: 'A portfolio, shop, newsletter, association, or company website.'
  },
  {
    value: 'freelancer',
    title: 'Client websites',
    description: 'Websites you deliver or maintain for your clients.'
  },
  {
    value: 'agency',
    title: 'An agency portfolio',
    description: 'Several client websites monitored from one place.'
  }
] as const

const steps = [
  { number: 1, label: 'Your use', icon: UserRound },
  { number: 2, label: 'The website', icon: Globe2 },
  { number: 3, label: 'Pages to watch', icon: Radar }
] as const

/** A short, keyboard-friendly setup wizard for the first monitored website. */
export function OnboardingForm({
  pagesPerProject,
  planName
}: {
  pagesPerProject: number
  planName: string
}) {
  const [step, setStep] = useState(1)
  const [accessMode, setAccessMode] = useState<SiteAccessMode>('public')
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    document.getElementById(`setup-step-${step}-title`)?.focus()
  }, [step])

  function goForward() {
    const panel = document.querySelector(`[data-setup-step="${step}"]`)
    if (!(panel instanceof HTMLElement)) return
    const fields = panel.querySelectorAll('input, textarea')
    for (const field of fields) {
      if (
        (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
        !field.checkValidity()
      ) {
        field.reportValidity()
        return
      }
    }
    setStep(current => Math.min(3, current + 1))
  }

  return (
    <form action={createProject}>
      <div className="border-border border-b p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
              {step} of 3
            </p>
            <p className="mt-1 text-muted text-sm">A first check takes only a few minutes.</p>
          </div>
          <span className="font-mono text-muted text-xs">{Math.round((step / 3) * 100)}%</span>
        </div>
        <div
          aria-label="Website setup progress"
          aria-valuemax={3}
          aria-valuemin={1}
          aria-valuenow={step}
          className="mt-4 h-1 overflow-hidden bg-surface-raised"
          role="progressbar"
        >
          <span
            className="block h-full bg-signal transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <ol className="mt-5 grid grid-cols-3 gap-2">
          {steps.map(({ icon: Icon, label, number }) => {
            const complete = number < step
            const current = number === step
            return (
              <li
                aria-current={current ? 'step' : undefined}
                className={`flex min-w-0 items-center gap-2 border px-3 py-2 text-xs ${
                  current
                    ? 'border-signal bg-signal/10 text-foreground'
                    : complete
                      ? 'border-success text-success'
                      : 'border-border text-muted'
                }`}
                key={number}
              >
                {complete ? (
                  <Check aria-hidden className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{label}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="p-5 sm:p-7">
        <fieldset className="cr-step-enter space-y-5" data-setup-step="1" hidden={step !== 1}>
          <legend className="sr-only">How you will use CodeRocket</legend>
          <h2
            className="font-heading font-semibold text-2xl outline-none"
            id="setup-step-1-title"
            tabIndex={-1}
          >
            What are you keeping an eye on?
          </h2>
          <p className="max-w-2xl text-muted leading-7">
            This only adapts the help shown in your dashboard. Every website gets the same checks.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {audienceOptions.map((option, index) => (
              <label
                className="cursor-pointer border border-border bg-background p-4 transition-colors hover:border-accent has-checked:border-accent has-checked:bg-accent/10"
                key={option.value}
              >
                <span className="flex items-center gap-2">
                  <input
                    className="accent-accent"
                    defaultChecked={index === 0}
                    name="audience"
                    required
                    type="radio"
                    value={option.value}
                  />
                  <span className="font-semibold text-sm">{option.title}</span>
                </span>
                <span className="mt-2 block text-muted text-xs leading-5">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="cr-step-enter space-y-5" data-setup-step="2" hidden={step !== 2}>
          <legend className="sr-only">Website address and access</legend>
          <h2
            className="font-heading font-semibold text-2xl outline-none"
            id="setup-step-2-title"
            tabIndex={-1}
          >
            How can CodeRocket reach this website?
          </h2>
          <p className="max-w-2xl text-muted leading-7">
            Pick the closest answer. This prevents a blocked or private page from being presented as
            a healthy result.
          </p>
          <SiteAccessPicker onChange={setAccessMode} value={accessMode} />
          <label className="block max-w-2xl font-semibold text-sm" htmlFor="project-name">
            Website name
            <CodeRocketInput
              id="project-name"
              maxLength={120}
              name="name"
              placeholder="Example: Acme online store"
              required
            />
            <span className="mt-2 block font-normal text-muted text-xs">
              A company, client, or project name that you will recognize.
            </span>
          </label>
          <label className="block max-w-2xl font-semibold text-sm" htmlFor="production-url">
            Website address
            <CodeRocketInput
              autoComplete="url"
              id="production-url"
              name="url"
              placeholder="https://www.example.com"
              required
              type="url"
            />
            <span className="mt-2 block font-normal text-muted text-xs">
              It must start with https://. CodeRocket never follows this address into a private
              network.
            </span>
          </label>
          <SiteAccessExplanation mode={accessMode} />
        </fieldset>

        <fieldset className="cr-step-enter space-y-5" data-setup-step="3" hidden={step !== 3}>
          <legend className="sr-only">Pages to watch</legend>
          <h2
            className="font-heading font-semibold text-2xl outline-none"
            id="setup-step-3-title"
            tabIndex={-1}
          >
            Which pages matter most?
          </h2>
          <p className="max-w-2xl text-muted leading-7">
            Start with pages that bring sales, leads, or trust. Add one path per line. You can
            change this list later.
          </p>
          <label className="block max-w-2xl font-semibold text-sm" htmlFor="monitored-pages">
            Pages to watch
            <CodeRocketTextarea
              defaultValue={'/\n/pricing\n/contact'}
              id="monitored-pages"
              name="pages"
              required
            />
          </label>
          <div className="max-w-2xl border border-border bg-background p-4 text-sm">
            <p className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                Up to <strong>{pagesPerProject} pages</strong> on the {planName} plan. Your first
                {accessMode === 'private'
                  ? ' check will start after you connect a private runner.'
                  : ' check starts automatically after this step.'}
              </span>
            </p>
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-border border-t pt-5">
          {step > 1 ? (
            <CodeRocketButton
              onClick={() => setStep(current => current - 1)}
              type="button"
              variant="ghost"
            >
              <ArrowLeft aria-hidden /> Back
            </CodeRocketButton>
          ) : (
            <span className="text-muted text-xs">No code or payment card required.</span>
          )}
          {step < 3 ? (
            <CodeRocketButton onClick={goForward} type="button">
              Continue <ArrowRight aria-hidden />
            </CodeRocketButton>
          ) : (
            <CodeRocketButton size="lg" type="submit">
              {accessMode === 'private'
                ? 'Add site and connect runner'
                : 'Add site and test access'}{' '}
              <ArrowRight aria-hidden />
            </CodeRocketButton>
          )}
        </div>
      </div>
    </form>
  )
}
