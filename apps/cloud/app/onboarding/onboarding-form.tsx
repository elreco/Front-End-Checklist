'use client'

import type { SiteAccessMode } from '@coderocket/core'
import { ArrowLeft, ArrowRight, Check, Globe2, Radar, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import type { FormEvent, MouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { countEnteredPages, getEnteredPages } from '@/lib/onboarding-pages'
import type { PlanId } from '@/lib/upgrade'
import { deriveWebsiteName } from '@/lib/website-draft'
import { createProject } from './actions'
import { OnboardingAccessOptions } from './onboarding-access-options'
import { OnboardingPagesStep } from './onboarding-pages-step'

const steps = [
  { number: 1, label: 'The website', icon: Globe2 },
  { number: 2, label: 'Pages to watch', icon: Radar }
] as const

const lastStep = steps.length

/** A short, keyboard-friendly setup wizard for the first monitored website. */
export function OnboardingForm({
  initialSiteName = '',
  initialSiteUrl = '',
  pagesPerProject,
  plan,
  planName
}: {
  initialSiteName?: string
  initialSiteUrl?: string
  pagesPerProject: number
  plan: PlanId
  planName: string
}) {
  const [step, setStep] = useState(1)
  const [siteUrl, setSiteUrl] = useState(initialSiteUrl)
  const [siteName, setSiteName] = useState(initialSiteName)
  const [accessMode, setAccessMode] = useState<SiteAccessMode>('public')
  const [pagesValue, setPagesValue] = useState('/')
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
            Start with the normal HTTPS address. CodeRocket will test how the selected pages can be
            reached automatically.
          </p>
          <label className="block max-w-2xl font-semibold text-sm" htmlFor="production-url">
            Website address
            <CodeRocketInput
              autoComplete="url"
              id="production-url"
              name="url"
              onChange={event => {
                setSiteUrl(event.target.value)
                setSiteName(deriveWebsiteName(event.target.value))
              }}
              placeholder="https://www.example.com"
              required
              type="url"
              value={siteUrl}
            />
            <span className="mt-2 block font-normal text-muted text-xs">
              It must start with https://. No access configuration is required to continue.
            </span>
          </label>
          <details className="max-w-2xl border border-border bg-background">
            <summary className="cursor-pointer p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
              Change the display name — optional
            </summary>
            <div className="border-border border-t p-4">
              <label className="block font-semibold text-sm" htmlFor="project-name">
                Website name
                <CodeRocketInput
                  id="project-name"
                  maxLength={120}
                  name="name"
                  onChange={event => setSiteName(event.target.value)}
                  placeholder="Example: Acme online store"
                  required
                  value={siteName}
                />
                <span className="mt-2 block font-normal text-muted text-xs">
                  CodeRocket creates this automatically from the address.
                </span>
              </label>
            </div>
          </details>
          <div className="max-w-2xl border border-signal bg-signal/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
              <div>
                <h3 className="font-heading font-semibold text-base">
                  Access is checked automatically
                </h3>
                <p className="mt-1 text-muted text-sm leading-6">
                  CodeRocket first tries the normal public website. If sign-in, Cloudflare, or
                  another protection blocks a page, you will get one guided setup afterwards.
                </p>
              </div>
            </div>
          </div>
          <OnboardingAccessOptions
            accessMode={accessMode}
            onAccessModeChange={mode => {
              setAccessMode(mode)
              if (mode === 'public') setAuthenticatedPages([])
            }}
            onSecureRunnerRequiredChange={setSecureRunnerRequired}
            secureRunnerRequired={secureRunnerRequired}
          />
        </fieldset>

        <OnboardingPagesStep
          accessMode={accessMode}
          authenticatedPages={submittedAuthenticatedPages}
          cloudDiscoveryBlocked={secureRunnerRequired || accessMode === 'private'}
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
          siteUrl={siteUrl}
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
