'use client'

import type { PlanId } from '@coderocket/core'
import {
  CODEROCKET_TAGLINE,
  CodeRocketLogo,
  CodeRocketMark
} from '@repo/design-system/coderocket-logo'
import { LogOut, PanelLeftClose, PanelLeftOpen } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { TooltipHint, TooltipProvider } from '@repo/design-system/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react'
import { signOut } from '@/app/actions'
import { isStudioWorkspaceRoute, resolveSidebarCollapsed } from '@/lib/sidebar-layout'
import { AppNavigation } from './app-navigation'
import { AppPlanPrompt } from './app-plan-prompt'

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
  creditLimit: number
  creditsRemaining: number
  displayName: string
  email: string
  initials: string
  initialCollapsed: boolean
  plan: PlanId
  projectCount: number
  projectLimit: number
}

/** Owns the responsive desktop sidebar state around private product screens. */
export function AppShellLayout({
  children,
  creditLimit,
  creditsRemaining,
  displayName,
  email,
  initials,
  initialCollapsed,
  plan,
  projectCount,
  projectLimit
}: AppShellLayoutProps) {
  const pathname = usePathname()
  const [expandedStudioPath, setExpandedStudioPath] = useState<string>()
  const preferredCollapsed = useSyncExternalStore(
    subscribeToSidebarState,
    () => readSidebarState(initialCollapsed),
    () => initialCollapsed
  )
  const collapsed = resolveSidebarCollapsed({
    expandedStudioPath,
    pathname,
    preferredCollapsed
  })

  useEffect(() => {
    void writeSidebarCookie(readSidebarState(initialCollapsed))
  }, [initialCollapsed])

  /** Toggle the desktop sidebar without affecting navigation or account state. */
  const toggleSidebar = () => {
    if (isStudioWorkspaceRoute(pathname)) {
      setExpandedStudioPath(collapsed ? pathname : undefined)
      return
    }
    writeSidebarState(!preferredCollapsed)
  }

  return (
    <div
      className={`grid min-h-screen transition-[grid-template-columns] duration-200 motion-reduce:transition-none ${
        collapsed ? 'lg:grid-cols-[68px_minmax(0,1fr)]' : 'lg:grid-cols-[248px_minmax(0,1fr)]'
      }`}
    >
      <aside
        className={`hidden border-border border-r bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${
          collapsed ? 'lg:px-2 lg:pb-2' : 'lg:px-3 lg:pb-3'
        }`}
      >
        <TooltipProvider delayDuration={250}>
          <div className="flex h-[60px] shrink-0 items-center">
            <Link
              aria-label="CodeRocket overview"
              className={`flex min-w-0 items-center ${collapsed ? 'mx-auto justify-center' : 'px-1.5'}`}
              href="/dashboard"
            >
              {collapsed ? (
                <CodeRocketMark className="h-9 w-9 shrink-0 text-foreground" />
              ) : (
                <CodeRocketLogo
                  className="h-9 w-9 shrink-0 text-foreground"
                  lockupClassName="gap-1"
                  tagline={CODEROCKET_TAGLINE}
                  taglineClassName="text-[7px]"
                  wordmarkClassName="text-lg"
                />
              )}
            </Link>
          </div>

          <div
            className={`mb-1 flex h-8 shrink-0 items-center ${collapsed ? 'justify-center' : 'justify-between px-2'}`}
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
                className="relative h-7 w-7 shrink-0 border-transparent bg-transparent p-0 text-muted before:absolute before:-inset-1.5 before:content-[''] hover:border-border hover:bg-surface-raised hover:text-foreground"
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

          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain [scrollbar-color:var(--border)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] ${
              collapsed ? '' : 'pr-1'
            }`}
          >
            <AppNavigation collapsed={collapsed} />
            {collapsed ? null : (
              <AppPlanPrompt
                creditLimit={creditLimit}
                creditsRemaining={creditsRemaining}
                plan={plan}
                projectCount={projectCount}
                projectLimit={projectLimit}
              />
            )}
          </div>

          <div
            className={`shrink-0 border border-border bg-background ${
              collapsed ? 'mt-2 p-2' : 'mt-2 p-2.5'
            }`}
          >
            <div
              className={`flex items-center ${collapsed ? 'flex-col justify-center gap-2' : 'gap-2.5'}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-accent font-mono font-semibold text-accent-foreground text-xs">
                {initials}
              </span>
              {collapsed ? null : (
                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">{displayName}</p>
                  <p className="truncate text-muted text-xs">{email || 'Signed-in workspace'}</p>
                </div>
              )}
              <form action={signOut} className={collapsed ? 'w-full' : 'ml-auto shrink-0'}>
                <TooltipHint content="Sign out" side="right">
                  <CodeRocketButton
                    aria-label="Sign out"
                    className={collapsed ? 'h-8 w-full px-0' : 'h-8 w-8 px-0'}
                    size="icon"
                    type="submit"
                    variant="ghost"
                  >
                    <LogOut aria-hidden className="h-3.5 w-3.5" />
                  </CodeRocketButton>
                </TooltipHint>
              </form>
            </div>
          </div>
        </TooltipProvider>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  )
}
