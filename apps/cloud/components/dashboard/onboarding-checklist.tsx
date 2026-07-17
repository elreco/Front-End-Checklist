'use client'

import { Check, Circle, FileText, Globe2, Rocket, X } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { DashboardData } from '@/lib/dashboard-data'

const SETUP_DISMISSED_KEY = 'coderocket:setup-complete-dismissed'
const SETUP_DISMISSED_EVENT = 'coderocket:setup-complete-dismissed-change'
let dismissedInMemory = false

function readDismissedState(): boolean {
  try {
    const saved = window.localStorage.getItem(SETUP_DISMISSED_KEY)
    if (saved !== null) dismissedInMemory = saved === 'true'
  } catch {
    // Keep the in-memory state when browser storage is unavailable.
  }
  return dismissedInMemory
}

function subscribeToDismissedState(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SETUP_DISMISSED_KEY || event.key === null) onStoreChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(SETUP_DISMISSED_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(SETUP_DISMISSED_EVENT, onStoreChange)
  }
}

function dismissCompletedSetup(): void {
  dismissedInMemory = true
  try {
    window.localStorage.setItem(SETUP_DISMISSED_KEY, 'true')
  } catch {
    // The message still stays hidden for the current session.
  }
  window.dispatchEvent(new Event(SETUP_DISMISSED_EVENT))
}

interface SetupStep {
  title: string
  description: string
  complete: boolean
  href: string
  action: string
  icon: typeof Globe2
}

/** A plain-language setup path that stays useful for technical and non-technical users. */
export function OnboardingChecklist({ data }: { data: DashboardData }) {
  const [mounted, setMounted] = useState(false)
  const dismissed = useSyncExternalStore(subscribeToDismissedState, readDismissedState, () => false)

  useEffect(() => setMounted(true), [])
  const steps: SetupStep[] = [
    {
      title: 'Add the site you want to protect',
      description: 'Tell us its address, important pages, and whether access is public or private.',
      complete: data.setup.hasProject,
      href: '/onboarding',
      action: 'Add a site',
      icon: Globe2
    },
    {
      title:
        data.setupRequiredCount > 0 ? 'Connect the private runner' : 'Let the first check finish',
      description:
        data.setupRequiredCount > 0
          ? 'Run the check from an environment that is already allowed to open the private pages.'
          : 'This creates your reference point, so later changes can be compared fairly.',
      complete: data.setup.hasSuccessfulCheck,
      href: data.projects[0] ? `/projects/${data.projects[0].id}` : '/onboarding',
      action: 'View first check',
      icon: Rocket
    },
    {
      title: 'Choose what to do with results',
      description: 'Share a simple report, or connect GitHub if you work with a development team.',
      complete: data.setup.hasDeliveryConnection,
      href: data.projects[0] ? `/projects/${data.projects[0].id}` : '/docs/cli',
      action: 'See sharing options',
      icon: FileText
    }
  ]
  const completed = steps.filter(step => step.complete).length

  if (completed === steps.length && (!mounted || dismissed)) return null

  if (completed === steps.length)
    return (
      <section className="relative flex flex-col justify-between gap-4 border border-success bg-success/10 p-5 pr-14 sm:flex-row sm:items-center sm:p-6 sm:pr-16">
        <CodeRocketButton
          aria-label="Hide completed setup message"
          className="absolute top-3 right-3 h-9 w-9 p-0 text-muted hover:text-foreground"
          onClick={dismissCompletedSetup}
          size="icon"
          title="Hide this message"
          type="button"
          variant="ghost"
        >
          <X aria-hidden className="h-4 w-4" />
        </CodeRocketButton>
        <div className="flex items-start gap-3">
          <span className="cr-success-pop flex h-10 w-10 shrink-0 items-center justify-center border border-success text-success">
            <Rocket aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <p className="font-heading font-semibold text-lg">Your monitoring is fully set up</p>
            <p className="mt-1 text-muted text-sm">
              Website added, first check saved, and results ready to share or use in GitHub.
            </p>
          </div>
        </div>
        <span className="shrink-0 font-mono text-success text-xs">3 / 3 complete</span>
      </section>
    )

  return (
    <section aria-labelledby="setup-title" className="border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-border border-b p-5 sm:p-6">
        <div>
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            Quick start
          </p>
          <h2 className="mt-2 font-heading font-semibold text-xl" id="setup-title">
            Finish setup in three small steps
          </h2>
          <p className="mt-2 max-w-2xl text-muted text-sm leading-6">
            Public websites need no technical setup. Private pages use a small runner connection so
            CodeRocket never has to bypass their sign-in screen.
          </p>
        </div>
        <div className="min-w-32">
          <p className="text-right font-mono text-muted text-xs">
            {completed} of {steps.length} complete
          </p>
          <div
            aria-label="Setup progress"
            aria-valuemax={steps.length}
            aria-valuemin={0}
            aria-valuenow={completed}
            className="mt-2 h-1.5 bg-surface-raised"
            role="progressbar"
          >
            <span
              className="block h-full bg-signal transition-[width] duration-500"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <ol className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {steps.map(({ action, complete, description, href, icon: Icon, title }, index) => (
          <li className="relative p-5 sm:p-6" key={title}>
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center border border-border bg-background">
                <Icon
                  aria-hidden
                  className={complete ? 'h-4 w-4 text-success' : 'h-4 w-4 text-signal'}
                />
              </span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.1em] ${complete ? 'text-success' : 'text-muted'}`}
              >
                {complete ? (
                  <Check aria-hidden className="h-3.5 w-3.5" />
                ) : (
                  <Circle aria-hidden className="h-3 w-3" />
                )}
                {complete ? 'Complete' : `Step ${index + 1}`}
              </span>
            </div>
            <h3 className="mt-5 font-semibold">{title}</h3>
            <p className="mt-2 min-h-12 text-muted text-sm leading-6">{description}</p>
            {!complete ? (
              <CodeRocketButton asChild className="relative z-10 mt-4" size="sm" variant="outline">
                <Link href={href}>{action}</Link>
              </CodeRocketButton>
            ) : (
              <p className="mt-4 inline-flex items-center gap-2 text-success text-xs">
                <Check aria-hidden className="h-3.5 w-3.5" /> Done
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
