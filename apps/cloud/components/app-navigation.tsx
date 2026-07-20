'use client'

import {
  CreditCard,
  Gauge,
  Globe2,
  Settings,
  WandSparkles
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { TooltipHint, TooltipProvider } from '@repo/design-system/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavigationItem {
  href: string
  icon: typeof Gauge
  label: string
}

const builderNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Overview', icon: Gauge },
  { href: '/websites', label: 'My websites', icon: Globe2 }
]

const accountNavigation: NavigationItem[] = [
  { href: '/settings', label: 'Account settings', icon: Settings },
  { href: '/settings/billing', label: 'Plan & billing', icon: CreditCard }
]

const navigationGroups = [
  { label: 'Website builder', items: builderNavigation },
  { label: 'Account', items: accountNavigation }
]

/** Match nested product routes to their owning navigation destination. */
function isCurrentPath(pathname: string, href: string): boolean {
  if (href === '/dashboard' || href === '/create') return pathname === href
  if (href === '/websites') return pathname === href || pathname.startsWith('/studio/')
  if (href === '/settings') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Product navigation for cloning, editing, publishing, and account management. */
export function AppNavigation({
  collapsed = false,
  mobile = false
}: {
  collapsed?: boolean
  mobile?: boolean
}) {
  const pathname = usePathname()
  const creating = isCurrentPath(pathname, '/create')

  if (mobile)
    return (
      <nav
        aria-label="Product navigation"
        className="flex max-w-full touch-pan-x snap-x gap-1 overflow-x-auto overscroll-x-contain border-border border-b bg-surface px-4 py-2 [scrollbar-width:thin] lg:hidden"
      >
        <CodeRocketButton asChild className="shrink-0 snap-start" size="sm">
          <Link aria-current={creating ? 'page' : undefined} href="/create">
            <WandSparkles aria-hidden /> Clone a website
          </Link>
        </CodeRocketButton>
        {builderNavigation.map(({ href, label, icon: Icon }) => {
          const current = isCurrentPath(pathname, href)
          return (
            <Link
              aria-current={current ? 'page' : undefined}
              className={`inline-flex shrink-0 snap-start items-center gap-2 border px-3 py-2 font-mono text-xs transition-colors ${current ? 'border-border bg-surface-raised text-foreground' : 'border-transparent text-muted hover:border-border hover:bg-surface-raised hover:text-foreground'}`}
              href={href}
              key={href}
            >
              <Icon aria-hidden className={current ? 'h-4 w-4 text-signal' : 'h-4 w-4'} />
              {label}
            </Link>
          )
        })}
      </nav>
    )

  return (
    <TooltipProvider delayDuration={250}>
      <nav
        aria-label="Product navigation"
        className="font-mono font-normal text-xs"
        id="product-sidebar-navigation"
      >
        <TooltipHint content="Clone a website" enabled={collapsed} side="right">
          <CodeRocketButton
            asChild
            className={collapsed ? 'h-9 w-full px-0' : 'h-10 w-full justify-start px-3'}
            fullWidth
            size="sm"
          >
            <Link aria-current={creating ? 'page' : undefined} href="/create">
              <WandSparkles aria-hidden />
              {collapsed ? <span className="sr-only">Clone a website</span> : 'Clone a website'}
            </Link>
          </CodeRocketButton>
        </TooltipHint>

        {navigationGroups.map((group, groupIndex) => (
          <div
            className={`${groupIndex === 0 ? 'mt-3' : 'mt-4 border-border border-t pt-3'} space-y-0.5`}
            key={group.label}
          >
            {collapsed ? null : (
              <p className="mb-1.5 px-2.5 font-mono text-[10px] text-muted uppercase tracking-[.16em]">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const current = isCurrentPath(pathname, href)
              const link = (
                <Link
                  aria-current={current ? 'page' : undefined}
                  className={`flex min-h-9 items-center border py-2 transition-colors ${
                    collapsed ? 'relative justify-center px-0' : 'gap-2.5 px-2.5'
                  } ${
                    current
                      ? 'border-border bg-surface-raised text-foreground'
                      : 'border-transparent text-muted hover:border-border hover:bg-surface hover:text-foreground'
                  }`}
                  href={href}
                >
                  <Icon aria-hidden className={current ? 'h-4 w-4 text-signal' : 'h-4 w-4'} />
                  {collapsed ? <span className="sr-only">{label}</span> : label}
                </Link>
              )

              return (
                <TooltipHint
                  content={label}
                  enabled={collapsed}
                  key={href}
                  side="right"
                >
                  {link}
                </TooltipHint>
              )
            })}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  )
}
