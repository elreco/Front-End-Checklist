import type { GateStatus, PlanId } from '@coderocket/core'
import { CODEROCKET_TAGLINE, CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import { ArrowUpRight, BarChart3, LogOut, Plus } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { signOut } from '@/app/actions'
import { getAppShellContext } from '@/lib/app-shell-data'
import { AppNavigation } from './app-navigation'

/** Distinct authenticated application frame used by every private product screen. */
export async function ProductShell({
  children,
  title,
  eyebrow,
  action
}: {
  children: ReactNode
  title: string
  eyebrow?: string
  action?: ReactNode
}) {
  const context = await getAppShellContext()

  return (
    <main className="min-h-screen bg-background" data-app-shell>
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-border border-r bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-4">
          <Link className="px-2 py-2" href="/dashboard">
            <CodeRocketLogo
              className="h-10 w-10 shrink-0 text-foreground"
              tagline={CODEROCKET_TAGLINE}
              wordmarkClassName="text-xl"
            />
          </Link>
          <p className="mt-7 px-3 font-mono text-[10px] text-muted uppercase tracking-[.18em]">
            Workspace
          </p>
          <div className="mt-2">
            <AppNavigation />
          </div>
          <PlanPrompt
            plan={context.plan}
            projectCount={context.projectCount}
            projectLimit={context.limits.projects}
          />
          <div className="mt-3 border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent font-mono font-semibold text-white text-xs">
                {context.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-sm">{context.displayName}</p>
                <p className="truncate text-muted text-xs">
                  {context.email || 'Signed-in workspace'}
                </p>
              </div>
            </div>
            <form action={signOut} className="mt-3 border-border border-t pt-2">
              <CodeRocketButton
                className="w-full justify-start px-1"
                size="sm"
                type="submit"
                variant="ghost"
              >
                <LogOut aria-hidden className="h-3.5 w-3.5" />
                Sign out
              </CodeRocketButton>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-border border-b bg-background">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 xl:px-10">
              <Link className="lg:hidden" href="/dashboard">
                <CodeRocketLogo
                  className="h-7 w-7 shrink-0 text-foreground"
                  wordmarkClassName="hidden text-base sm:inline"
                />
              </Link>
              <div className="hidden min-w-0 lg:block">
                {eyebrow ? (
                  <p className="font-mono text-[10px] text-muted uppercase tracking-[.18em]">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="truncate font-heading font-semibold text-xl tracking-tight">
                  {title}
                </h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <CodeRocketButton
                  asChild
                  className="hidden sm:inline-flex"
                  size="sm"
                  variant="outline"
                >
                  <Link href="/onboarding">
                    <Plus aria-hidden /> Add a site
                  </Link>
                </CodeRocketButton>
                {action}
                <Link
                  aria-label={`Open account settings for ${context.displayName}`}
                  className="flex h-9 w-9 items-center justify-center bg-surface-raised font-mono font-semibold text-xs hover:bg-accent"
                  href="/settings"
                >
                  {context.initials}
                </Link>
              </div>
            </div>
            <AppNavigation mobile />
          </header>

          <section className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
            <div className="mb-7 lg:hidden">
              {eyebrow ? (
                <p className="font-mono text-[10px] text-muted uppercase tracking-[.18em]">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="mt-1 font-heading font-semibold text-2xl tracking-tight">{title}</h1>
            </div>
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}

function PlanPrompt({
  plan,
  projectCount,
  projectLimit
}: {
  plan: PlanId
  projectCount: number
  projectLimit: number
}) {
  const isAgency = plan === 'agency'
  return (
    <div className="mt-auto border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[.14em]">
          {plan === 'solo' ? 'personal' : plan} plan
        </p>
        <span className="text-muted text-xs">
          {projectCount}/{projectLimit} sites
        </span>
      </div>
      <div
        className="mt-3 h-1 bg-surface-raised"
        role="progressbar"
        aria-label="Sites used"
        aria-valuemax={projectLimit}
        aria-valuemin={0}
        aria-valuenow={projectCount}
      >
        <span
          className="block h-full bg-accent"
          style={{ width: `${Math.min(100, (projectCount / projectLimit) * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-muted text-xs leading-5">
        {isAgency
          ? 'Daily checks and unbranded client reports are active.'
          : plan === 'solo'
            ? 'Need more client sites and unbranded reports?'
            : 'Get daily checks, more sites, and a longer history.'}
      </p>
      {!isAgency ? (
        <Link
          className="mt-3 inline-flex items-center gap-1 font-mono text-accent text-xs hover:text-signal"
          href="/pricing"
        >
          Compare plans <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  )
}

export function GateBadge({ status }: { status: GateStatus }) {
  const className =
    status === 'passed'
      ? 'border-success bg-success/10 text-success'
      : status === 'failed'
        ? 'border-danger bg-danger/10 text-danger'
        : status === 'inconclusive'
          ? 'border-warning bg-warning/10 text-warning'
          : 'border-accent bg-accent/10 text-accent'
  return (
    <span
      className={`inline-flex border px-2.5 py-1 font-mono font-semibold text-[10px] uppercase tracking-[.08em] ${className}`}
    >
      {status === 'inconclusive'
        ? 'Could not check'
        : status === 'needs_baseline'
          ? 'First check needed'
          : status === 'passed'
            ? 'All clear'
            : 'Needs attention'}
    </span>
  )
}

export function EmptyState({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="border border-border border-dashed bg-surface px-6 py-14 text-center">
      <BarChart3 aria-hidden className="mx-auto h-7 w-7 text-signal" />
      <h2 className="mt-4 font-heading font-semibold text-xl">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-muted leading-7">{children}</div>
    </div>
  )
}
