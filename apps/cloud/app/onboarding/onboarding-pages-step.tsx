'use client'

import type { SiteAccessMode } from '@coderocket/core'
import { Check } from '@repo/design-system/icons'
import { CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import { OnboardingPageDiscovery } from '@/components/onboarding-page-discovery'
import { PageLimitUpsell } from '@/components/plan-limit-upsell'
import type { PlanId } from '@/lib/upgrade'

interface OnboardingPagesStepProps {
  accessMode: SiteAccessMode
  authenticatedPages: string[]
  cloudDiscoveryBlocked: boolean
  extraPages: number
  pageCount: number
  pageLimitAttempted: boolean
  pagesPerProject: number
  pagesValue: string
  plan: PlanId
  planName: string
  secureRunnerRequired: boolean
  siteUrl: string
  visible: boolean
  onPagesChange: (value: string) => void
  onAuthenticatedPagesChange: (pages: string[]) => void
}

/** Collect important pages while keeping over-limit drafts visible and recoverable. */
export function OnboardingPagesStep({
  accessMode,
  authenticatedPages,
  cloudDiscoveryBlocked,
  extraPages,
  onPagesChange,
  onAuthenticatedPagesChange,
  pageCount,
  pageLimitAttempted,
  pagesPerProject,
  pagesValue,
  plan,
  planName,
  secureRunnerRequired,
  siteUrl,
  visible
}: OnboardingPagesStepProps) {
  const enteredPages = pagesValue
    .split('\n')
    .map(page => page.trim())
    .filter(Boolean)
    .map(page => (page.startsWith('/') ? page : `/${page}`))
    .filter((page, index, pages) => pages.indexOf(page) === index)

  /** Toggle whether one monitored page receives the dedicated application session. */
  function toggleAuthenticatedPage(page: string) {
    onAuthenticatedPagesChange(
      authenticatedPages.includes(page)
        ? authenticatedPages.filter(candidate => candidate !== page)
        : [...authenticatedPages, page]
    )
  }

  return (
    <fieldset className="cr-step-enter space-y-5" data-setup-step="2" hidden={!visible}>
      <legend className="sr-only">Pages to watch</legend>
      <h2
        className="font-heading font-semibold text-2xl outline-none"
        id="setup-step-2-title"
        tabIndex={-1}
      >
        Which pages matter most?
      </h2>
      <p className="max-w-2xl text-muted leading-7">
        Start with pages that bring sales, leads, or trust. Find them automatically, import an
        existing route list, or add one path per line. You can change this list later.
      </p>
      <OnboardingPageDiscovery
        cloudDiscoveryBlocked={cloudDiscoveryBlocked}
        onPagesChange={onPagesChange}
        pagesPerProject={pagesPerProject}
        pagesValue={pagesValue}
        siteUrl={siteUrl}
      />
      <label className="block max-w-2xl font-semibold text-sm" htmlFor="monitored-pages">
        Pages to watch
        <CodeRocketTextarea
          aria-describedby="page-capacity-status"
          id="monitored-pages"
          name="pages"
          onChange={event => onPagesChange(event.target.value)}
          required
          value={pagesValue}
        />
      </label>
      {accessMode === 'protected' ? (
        <fieldset className="max-w-2xl border border-border bg-background p-4">
          <legend className="px-1 font-semibold text-sm">Which pages require sign-in?</legend>
          <p className="mt-1 text-muted text-xs leading-5">
            Public pages remain anonymous. Select only pages that should open as the dedicated test
            user.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {enteredPages.map(page => {
              const selected = authenticatedPages.includes(page)
              return (
                <label
                  className={`flex cursor-pointer items-center gap-3 border p-3 text-sm ${
                    selected ? 'border-signal bg-signal/10' : 'border-border bg-surface'
                  }`}
                  key={page}
                >
                  <input
                    checked={selected}
                    className="h-4 w-4 accent-signal"
                    onChange={() => toggleAuthenticatedPage(page)}
                    type="checkbox"
                  />
                  <span className="min-w-0 truncate font-mono text-xs">{page}</span>
                </label>
              )
            })}
          </div>
          {authenticatedPages.length === 0 ? (
            <p className="mt-3 text-danger text-xs" role="status">
              Select at least one signed-in page, or choose “No sign-in is required”.
            </p>
          ) : null}
        </fieldset>
      ) : null}
      <div className="max-w-2xl space-y-3" id="page-capacity-status">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background p-4 text-sm">
          <p className="flex items-start gap-2">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              Your first
              {secureRunnerRequired
                ? ' check will start after you connect secure access.'
                : ' check starts automatically after this step.'}
            </span>
          </p>
          <span
            className={`shrink-0 font-mono text-xs ${
              extraPages > 0
                ? 'text-danger'
                : pageCount >= pagesPerProject
                  ? 'text-accent'
                  : 'text-muted'
            }`}
          >
            {pageCount} / {pagesPerProject} pages
          </span>
        </div>
        {pageCount === pagesPerProject - 1 ? (
          <p className="border border-border bg-background px-4 py-3 text-muted text-xs">
            One page slot remains on your {planName} plan.
          </p>
        ) : null}
        {extraPages > 0 ? (
          <p
            className="border border-danger bg-background p-4 text-danger text-sm"
            role={pageLimitAttempted ? 'alert' : 'status'}
          >
            {plan === 'agency' ? (
              <>
                Remove the {extraPages} extra {extraPages === 1 ? 'page' : 'pages'} to continue.{' '}
                Agency includes up to {pagesPerProject} pages per site.
              </>
            ) : (
              <>
                Keep the {extraPages} extra {extraPages === 1 ? 'page' : 'pages'} here while you
                compare plans, or remove {extraPages === 1 ? 'it' : 'them'} to continue with{' '}
                {planName}.
              </>
            )}
          </p>
        ) : null}
        {pageCount >= pagesPerProject ? (
          <PageLimitUpsell attemptedPages={pageCount} currentPages={pagesPerProject} plan={plan} />
        ) : null}
      </div>
    </fieldset>
  )
}
