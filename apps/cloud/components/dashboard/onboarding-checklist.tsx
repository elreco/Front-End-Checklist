import { Check, Circle, FileText, Globe2, Rocket } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { DashboardData } from '@/lib/dashboard-data'

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
  const steps: SetupStep[] = [
    {
      title: 'Add the site you want to protect',
      description: 'Tell us its public address and the important pages to watch.',
      complete: data.setup.hasProject,
      href: '/onboarding',
      action: 'Add a site',
      icon: Globe2
    },
    {
      title: 'Let the first check finish',
      description: 'This creates your reference point, so later changes can be compared fairly.',
      complete: data.setup.hasSuccessfulCheck,
      href: data.projects[0] ? `/projects/${data.projects[0].id}` : '/onboarding',
      action: 'View first check',
      icon: Rocket
    },
    {
      title: 'Choose how you deliver results',
      description: 'Share a simple client report, or connect GitHub for checks before release.',
      complete: data.setup.hasDeliveryConnection,
      href: data.projects[0] ? `/projects/${data.projects[0].id}` : '/docs/cli',
      action: 'See delivery options',
      icon: FileText
    }
  ]
  const completed = steps.filter(step => step.complete).length

  if (completed === steps.length) return null

  return (
    <section aria-labelledby="setup-title" className="border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-border border-b p-5 sm:p-6">
        <div>
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            Quick start
          </p>
          <h2 className="mt-2 font-heading font-semibold text-xl" id="setup-title">
            Get useful results in three steps
          </h2>
          <p className="mt-2 max-w-2xl text-muted text-sm leading-6">
            No technical setup is needed to monitor a live website. You can connect developer tools
            later if they are useful to your team.
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
                Step {index + 1}
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
