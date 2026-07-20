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
  action,
  workspace = false
}: {
  children: ReactNode
  title: string
  eyebrow?: string
  action?: ReactNode
  workspace?: boolean
}) {
  const context = await getAppShellContext()
  const cookieStore = await cookies()
  const initialSidebarCollapsed = cookieStore.get('coderocket-sidebar-collapsed')?.value === 'true'

  return (
    <main
      className={workspace ? 'h-dvh overflow-hidden bg-background' : 'min-h-screen bg-background'}
      data-app-shell
    >
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
        <div className={workspace ? 'flex h-dvh min-w-0 flex-col overflow-hidden' : 'min-w-0'}>
          <header
            className={`${workspace ? 'shrink-0' : 'sticky top-0'} z-40 border-border border-b bg-background`}
          >
            <div
              className={`flex items-center justify-between gap-4 px-4 sm:px-6 ${
                workspace ? 'min-h-14' : 'min-h-16 xl:px-10'
              }`}
            >
              <Link className="lg:hidden" href="/dashboard">
                <CodeRocketLogo
                  className="h-7 w-7 shrink-0 text-foreground"
                  wordmarkClassName="hidden text-base sm:inline"
                />
              </Link>
              <div className={`min-w-0 ${workspace ? 'block' : 'hidden lg:block'}`}>
                {eyebrow ? (
                  <p
                    className={`font-mono text-[10px] text-muted uppercase tracking-[.18em] ${
                      workspace ? 'hidden sm:block' : ''
                    }`}
                  >
                    {eyebrow}
                  </p>
                ) : null}
                <h1
                  className={`truncate font-heading font-semibold tracking-tight ${
                    workspace ? 'text-sm sm:text-base' : 'text-xl'
                  }`}
                >
                  {title}
                </h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {workspace ? null : (
                  <CodeRocketButton asChild className="hidden sm:inline-flex" size="sm">
                    <Link href="/create">
                      <WandSparkles aria-hidden /> Clone a website
                    </Link>
                  </CodeRocketButton>
                )}
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
            {workspace ? null : <AppNavigation mobile />}
          </header>

          <section
            className={
              workspace
                ? 'min-h-0 flex-1 overflow-hidden'
                : 'cr-page-enter mx-auto max-w-[1480px] px-4 py-7 sm:px-6 sm:py-9 xl:px-10'
            }
          >
            <div className={`mb-7 lg:hidden ${workspace ? 'hidden' : ''}`}>
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
