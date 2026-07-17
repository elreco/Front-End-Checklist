'use client'

import type { SiteAccessMode } from '@coderocket/core'
import { ArrowLeft, ArrowRight, Check, Globe2, Radar, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import type { FormEvent, MouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { SiteAccessExplanation, SiteAccessPicker } from '@/components/site-access-picker'
import { countEnteredPages, getEnteredPages } from '@/lib/onboarding-pages'
import type { PlanId } from '@/lib/upgrade'
import { createProject } from './actions'
import { OnboardingPagesStep } from './onboarding-pages-step'

const steps = [
  { number: 1, label: 'The website', icon: Globe2 },
  { number: 2, label: 'Pages to watch', icon: Radar }
] as const

const lastStep = steps.length

/** A short, keyboard-friendly setup wizard for the first monitored website. */
export function OnboardingForm({
  pagesPerProject,
  plan,
  planName
}: {
  pagesPerProject: number
  plan: PlanId
  planName: string
}) {
  const [step, setStep] = useState(1)
  const [accessMode, setAccessMode] = useState<SiteAccessMode>('public')
  const [pagesValue, setPagesValue] = useState('/\n/pricing\n/contact')
  const [authenticatedPages, setAuthenticatedPages] = useState<string[]>([])
  const [secureRunnerRequired, setSecureRunnerRequired] = useState(false)
  const [pageLimitAttempted, setPageLimitAttempted] = useState(false)
  const mounted = useRef(false)
  const pageCount = countEnteredPages(pagesValue)
  const extraPages = Math.max(0, pageCount - pagesPerProject)
  const enteredPages = getEnteredPages(pagesValue)
  const submittedAuthenticatedPages =
    accessMode === 'private'
      ? enteredPages
      : accessMode === 'protected'
        ? authenticatedPages.filter(page => enteredPages.includes(page))
        : []
  const effectiveSecureRunnerRequired =
    secureRunnerRequired || submittedAuthenticatedPages.length > 0

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    document.getElementById(`setup-step-${step}-title`)?.focus()
  }, [step])

  /** Validate only the visible setup panel before advancing the wizard. */
  function advanceStep() {
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
    setStep(current => Math.min(lastStep, current + 1))
  }

  /** Prevent the advancing button from becoming a submit button during the same browser click. */
  function handleContinue(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    advanceStep()
  }

  /** Turn implicit submissions into navigation until the final setup step is visible. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step < lastStep) {
      event.preventDefault()
      advanceStep()
      return
    }
    if (extraPages > 0) {
      event.preventDefault()
      setPageLimitAttempted(true)
      return
    }
    if (accessMode === 'protected' && submittedAuthenticatedPages.length === 0) {
      event.preventDefault()
      return
    }
  }

  return (
    <form action={createProject} onSubmit={handleSubmit}>
      <div className="border-border border-b p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
              {step} of {lastStep}
            </p>
            <p className="mt-1 text-muted text-sm">A first check takes only a few minutes.</p>
          </div>
          <span className="font-mono text-muted text-xs">
            {Math.round((step / lastStep) * 100)}%
          </span>
        </div>
        <div
          aria-label="Website setup progress"
          aria-valuemax={lastStep}
          aria-valuemin={1}
          aria-valuenow={step}
          className="mt-4 h-1 overflow-hidden bg-surface-raised"
          role="progressbar"
        >
          <span
            className="block h-full bg-signal transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${(step / lastStep) * 100}%` }}
          />
        </div>
        <ol className="mt-5 grid grid-cols-2 gap-2">
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
          <legend className="sr-only">Website address and access</legend>
          <h2
            className="font-heading font-semibold text-2xl outline-none"
            id="setup-step-1-title"
            tabIndex={-1}
          >
            Which website should CodeRocket watch?
          </h2>
          <p className="max-w-2xl text-muted leading-7">
            Add the name and HTTPS address, then tell us how the selected pages can be reached.
          </p>
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
              It must start with https://. Mark protected infrastructure below when only your own
              runner can reach it.
            </span>
          </label>
          <div className="space-y-4 border-border border-t pt-5">
            <div>
              <h3 className="font-heading font-semibold text-lg">
                Which visitor state should CodeRocket check?
              </h3>
              <p className="mt-2 max-w-2xl text-muted text-sm leading-6">
                Choose whether the application itself requires a signed-in session. Cloudflare,
                preview passwords, firewalls, VPNs, and other infrastructure layers are described
                separately below.
              </p>
            </div>
            <SiteAccessPicker
              onChange={mode => {
                setAccessMode(mode)
                if (mode === 'public') setAuthenticatedPages([])
              }}
              value={accessMode}
            />
            <SiteAccessExplanation mode={accessMode} secureRunnerRequired={secureRunnerRequired} />
            <label className="flex max-w-2xl cursor-pointer items-start gap-3 border border-border bg-background p-4">
              <input
                checked={secureRunnerRequired}
                className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
                name="secureRunnerRequired"
                onChange={event => setSecureRunnerRequired(event.target.checked)}
                type="checkbox"
                value="true"
              />
              <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-signal" />
              <span>
                <span className="block font-semibold text-sm">
                  The cloud cannot open this site directly
                </span>
                <span className="mt-1 block text-muted text-xs leading-5">
                  Select this for Cloudflare Access, a preview password, custom headers, an IP
                  allowlist, client certificate, VPN, private network, or another infrastructure
                  restriction. Several can apply together.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <OnboardingPagesStep
          accessMode={accessMode}
          authenticatedPages={submittedAuthenticatedPages}
          extraPages={extraPages}
          onPagesChange={value => {
            setPagesValue(value)
            const nextPages = getEnteredPages(value)
            setAuthenticatedPages(current => current.filter(page => nextPages.includes(page)))
            if (countEnteredPages(value) <= pagesPerProject) setPageLimitAttempted(false)
          }}
          pageCount={pageCount}
          pageLimitAttempted={pageLimitAttempted}
          pagesPerProject={pagesPerProject}
          pagesValue={pagesValue}
          plan={plan}
          planName={planName}
          secureRunnerRequired={effectiveSecureRunnerRequired}
          visible={step === lastStep}
          onAuthenticatedPagesChange={setAuthenticatedPages}
        />

        {submittedAuthenticatedPages.map(page => (
          <input key={page} name="authenticatedPage" type="hidden" value={page} />
        ))}

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
          {step < lastStep ? (
            <CodeRocketButton key="continue" onClick={handleContinue} type="button">
              Continue <ArrowRight aria-hidden />
            </CodeRocketButton>
          ) : (
            <CodeRocketButton key="submit" size="lg" type="submit">
              {effectiveSecureRunnerRequired
                ? 'Add site and connect secure access'
                : 'Add site and check access'}{' '}
              <ArrowRight aria-hidden />
            </CodeRocketButton>
          )}
        </div>
      </div>
    </form>
  )
}
