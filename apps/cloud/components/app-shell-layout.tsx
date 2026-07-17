'use client'

import type { PlanId } from '@coderocket/core'
import {
  CODEROCKET_TAGLINE,
  CodeRocketLogo,
  CodeRocketMark
} from '@repo/design-system/coderocket-logo'
import { ArrowUpRight, LogOut, PanelLeftClose, PanelLeftOpen } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { TooltipHint, TooltipProvider } from '@repo/design-system/ui/tooltip'
import Link from 'next/link'
import { type ReactNode, useEffect, useSyncExternalStore } from 'react'
import { signOut } from '@/app/actions'
import { getPlanLabel } from '@/lib/product-language'
import { getNextPlan } from '@/lib/upgrade'
import { AppNavigation } from './app-navigation'
import { UpgradeLink } from './plan-limit-upsell'

const SIDEBAR_STORAGE_KEY = 'coderocket:sidebar-collapsed'
const SIDEBAR_COOKIE_KEY = 'coderocket-sidebar-collapsed'
const SIDEBAR_CHANGE_EVENT = 'coderocket:sidebar-change'
let sidebarMemoryState = false

/** Read the persisted sidebar preference while keeping a safe in-memory fallback. */
function readSidebarState(fallback = false): boolean {
  try {
    const storedState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (storedState !== null) sidebarMemoryState = storedState === 'true'
    else sidebarMemoryState = fallback
  } catch {
    sidebarMemoryState = fallback
  }
  return sidebarMemoryState
}

/** Notify React when another browser context changes the sidebar preference. */
function subscribeToSidebarState(onStoreChange: () => void): () => void {
  /** Relay relevant browser storage changes to the external-store subscriber. */
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY || event.key === null) onStoreChange()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(SIDEBAR_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, onStoreChange)
  }
}

/** Persist one sidebar state and notify every mounted product shell. */
function writeSidebarState(collapsed: boolean): void {
  sidebarMemoryState = collapsed
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  } catch {
    // The in-memory state still keeps the control usable for this session.
  }
  void writeSidebarCookie(collapsed)
  window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT))
}

/** Keep the server-rendered shell aligned with the latest browser preference. */
async function writeSidebarCookie(collapsed: boolean): Promise<void> {
  try {
    await window.cookieStore.set({
      expires: Date.now() + 31_536_000_000,
      name: SIDEBAR_COOKIE_KEY,
      path: '/',
      value: String(collapsed)
    })
  } catch {
    // Local storage remains the client-side source if the Cookie Store API is unavailable.
  }
}

interface AppShellLayoutProps {
  children: ReactNode
  displayName: string
  email: string
  initials: string
  initialCollapsed: boolean
  plan: PlanId
  projectCount: number
  projectLimit: number
}

/** Owns the persistent desktop sidebar state around private product screens. */
export function AppShellLayout({
  children,
  displayName,
  email,
  initials,
  initialCollapsed,
  plan,
  projectCount,
  projectLimit
}: AppShellLayoutProps) {
  const collapsed = useSyncExternalStore(
    subscribeToSidebarState,
    () => readSidebarState(initialCollapsed),
    () => initialCollapsed
  )

  useEffect(() => {
    void writeSidebarCookie(readSidebarState(initialCollapsed))
  }, [initialCollapsed])

  /** Toggle the desktop sidebar without affecting navigation or account state. */
  const toggleSidebar = () => {
    writeSidebarState(!collapsed)
  }

  return (
    <div
      className={`grid min-h-screen transition-[grid-template-columns] duration-200 motion-reduce:transition-none ${
        collapsed ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-[260px_minmax(0,1fr)]'
      }`}
    >
      <aside
        className={`hidden border-border border-r bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${
          collapsed ? 'lg:p-3' : 'lg:p-4'
        }`}
      >
        <TooltipProvider delayDuration={250}>
          <div className="flex h-16 items-center">
            <Link
              aria-label="CodeRocket overview"
              className={`flex min-w-0 items-center ${collapsed ? 'mx-auto justify-center' : 'px-1'}`}
              href="/dashboard"
            >
              {collapsed ? (
                <CodeRocketMark className="h-11 w-11 shrink-0 text-foreground" />
              ) : (
                <CodeRocketLogo
                  className="h-11 w-11 shrink-0 text-foreground"
                  lockupClassName="gap-1.5"
                  tagline={CODEROCKET_TAGLINE}
                  taglineClassName="text-[8px]"
                  wordmarkClassName="text-xl"
                />
              )}
            </Link>
          </div>

          <div
            className={`mb-2 flex h-9 items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}
          >
            {collapsed ? null : (
              <p className="font-mono text-[10px] text-muted uppercase tracking-[.18em]">
                Workspace
              </p>
            )}
            <TooltipHint content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
              <CodeRocketButton
                aria-controls="product-sidebar-navigation"
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="relative h-8 w-8 shrink-0 border-transparent bg-transparent p-0 text-muted before:absolute before:-inset-1.5 before:content-[''] hover:border-border hover:bg-surface-raised hover:text-foreground"
                onClick={toggleSidebar}
                size="icon"
                type="button"
                variant="ghost"
              >
                {collapsed ? (
                  <PanelLeftOpen aria-hidden className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftClose aria-hidden className="h-3.5 w-3.5" />
                )}
              </CodeRocketButton>
            </TooltipHint>
          </div>

          <div>
            <AppNavigation collapsed={collapsed} />
          </div>

          {collapsed ? null : (
            <PlanPrompt plan={plan} projectCount={projectCount} projectLimit={projectLimit} />
          )}

          <div
            className={`border border-border bg-background ${
              collapsed ? 'mt-auto p-2' : 'mt-3 p-3'
            }`}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-accent font-mono font-semibold text-white text-xs">
                {initials}
              </span>
              {collapsed ? null : (
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">{displayName}</p>
                  <p className="truncate text-muted text-xs">{email || 'Signed-in workspace'}</p>
                </div>
              )}
            </div>
            <form
              action={signOut}
              className={`border-border border-t pt-2 ${collapsed ? 'mt-2' : 'mt-3'}`}
            >
              <TooltipHint content="Sign out" enabled={collapsed} side="right">
                <CodeRocketButton
                  aria-label={collapsed ? 'Sign out' : undefined}
                  className={collapsed ? 'h-9 w-full px-0' : 'w-full justify-start px-1'}
                  size="sm"
                  type="submit"
                  variant="ghost"
                >
                  <LogOut aria-hidden className="h-3.5 w-3.5" />
                  {collapsed ? <span className="sr-only">Sign out</span> : 'Sign out'}
                </CodeRocketButton>
              </TooltipHint>
            </form>
          </div>
        </TooltipProvider>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Summarize plan usage and expose one contextual next-plan action. */
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
  const nextPlan = getNextPlan(plan)
  return (
    <div className="mt-auto border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[.14em]">
          {getPlanLabel(plan)} plan
        </p>
        <span className="text-muted text-xs">
          {projectCount}/{projectLimit} sites
        </span>
      </div>
      <div
        aria-label="Sites used"
        aria-valuemax={projectLimit}
        aria-valuemin={0}
        aria-valuenow={projectCount}
        className="mt-3 h-1 bg-surface-raised"
        role="progressbar"
      >
        <span
          className="block h-full bg-accent"
          style={{ width: `${Math.min(100, (projectCount / projectLimit) * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-muted text-xs leading-5">
        {isAgency
          ? 'Daily checks and reports without CodeRocket branding are active.'
          : plan === 'solo'
            ? 'Need more client websites and reports without CodeRocket branding?'
            : 'Get daily checks, more sites, and a longer history.'}
      </p>
      {nextPlan ? (
        <UpgradeLink
          className="mt-3 inline-flex items-center gap-1 font-mono text-accent text-xs hover:text-signal"
          currentPlan={plan}
          source="sidebar_plan"
          targetPlan={nextPlan}
        >
          {plan === 'free' ? 'Unlock more sites' : 'Grow to Agency'}{' '}
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </UpgradeLink>
      ) : null}
    </div>
  )
}
