import { CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import { WandSparkles } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getAppShellContext } from '@/lib/app-shell-data'
import { AppNavigation } from './app-navigation'
import { AppShellLayout } from './app-shell-layout'

export { EmptyState, GateBadge } from './product-ui'

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
  const cookieStore = await cookies()
  const initialSidebarCollapsed = cookieStore.get('coderocket-sidebar-collapsed')?.value === 'true'

  return (
    <main className="min-h-screen bg-background" data-app-shell>
      <AppShellLayout
        displayName={context.displayName}
        email={context.email}
        initials={context.initials}
        initialCollapsed={initialSidebarCollapsed}
        plan={context.plan}
        creditLimit={context.builderLimits.creationCreditsPerMonth}
        creditsRemaining={context.builderCreditsRemaining}
        projectCount={context.builderSiteCount}
        projectLimit={context.builderLimits.sites}
      >
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
                <CodeRocketButton asChild className="hidden sm:inline-flex" size="sm">
                  <Link href="/create">
                    <WandSparkles aria-hidden /> Clone a website
                  </Link>
                </CodeRocketButton>
                {action}
                <Link
                  aria-label={`Open account settings for ${context.displayName}`}
                  className="flex h-9 w-9 items-center justify-center bg-surface-raised font-mono font-semibold text-xs hover:bg-accent hover:text-accent-foreground"
                  href="/settings"
                >
                  {context.initials}
                </Link>
              </div>
            </div>
            <AppNavigation mobile />
          </header>

          <section className="cr-page-enter mx-auto max-w-[1480px] px-4 py-7 sm:px-6 sm:py-9 xl:px-10">
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
      </AppShellLayout>
    </main>
  )
}
