'use client'

import {
  BookOpen,
  CreditCard,
  ExternalLink,
  Gauge,
  Globe2,
  History,
  Settings
} from '@repo/design-system/icons'
import { TooltipHint, TooltipProvider } from '@repo/design-system/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavigationItem {
  href: string
  icon: typeof Gauge
  label: string
  opensNewTab?: boolean
}

const navigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Overview', icon: Gauge },
  { href: '/sites', label: 'Sites', icon: Globe2 },
  { href: '/audits', label: 'Check history', icon: History },
  { href: '/docs', label: 'Help & rules', icon: BookOpen, opensNewTab: true },
  { href: '/settings', label: 'Account settings', icon: Settings },
  { href: '/settings/billing', label: 'Plan & billing', icon: CreditCard }
]

/** Match nested product routes to their owning navigation destination. */
function isCurrentPath(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href
  if (href === '/sites')
    return (
      pathname === href || pathname.startsWith('/projects/') || pathname.startsWith('/onboarding')
    )
  if (href === '/audits' || href === '/docs')
    return pathname === href || pathname.startsWith(`${href}/`)
  if (href === '/settings') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Product navigation with a visible current-page state. */
export function AppNavigation({
  collapsed = false,
  mobile = false
}: {
  collapsed?: boolean
  mobile?: boolean
}) {
  const pathname = usePathname()

  if (mobile)
    return (
      <nav
        aria-label="Product navigation"
        className="flex gap-1 overflow-x-auto border-border border-b bg-surface px-4 py-2 lg:hidden"
      >
        {navigation.slice(0, 4).map(({ href, label, icon: Icon, opensNewTab }) => {
          const current = isCurrentPath(pathname, href)
          return (
            <Link
              aria-current={current ? 'page' : undefined}
              aria-label={opensNewTab ? `${label} (opens in a new tab)` : undefined}
              className={`inline-flex shrink-0 items-center gap-2 border px-3 py-2 font-mono text-xs transition-colors ${current ? 'border-accent bg-accent text-white' : 'border-transparent text-muted hover:border-border hover:bg-surface-raised hover:text-foreground'}`}
              href={href}
              key={href}
              rel={opensNewTab ? 'noreferrer' : undefined}
              target={opensNewTab ? '_blank' : undefined}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {label}
              {opensNewTab ? <ExternalLink aria-hidden className="h-3.5 w-3.5" /> : null}
            </Link>
          )
        })}
      </nav>
    )

  return (
    <TooltipProvider delayDuration={250}>
      <nav
        aria-label="Product navigation"
        className="space-y-1 font-mono font-normal text-xs"
        id="product-sidebar-navigation"
      >
        {navigation.map(({ href, label, icon: Icon, opensNewTab }) => {
          const current = isCurrentPath(pathname, href)
          const link = (
            <Link
              aria-current={current ? 'page' : undefined}
              aria-label={opensNewTab ? `${label} (opens in a new tab)` : undefined}
              className={`flex items-center border py-2.5 transition-colors ${
                collapsed ? 'relative justify-center px-0' : 'gap-2.5 px-3'
              } ${href === '/settings' ? 'mt-5' : ''} ${
                current
                  ? 'border-border bg-surface-raised text-foreground'
                  : 'border-transparent text-muted hover:border-border hover:bg-surface hover:text-foreground'
              }`}
              href={href}
              rel={opensNewTab ? 'noreferrer' : undefined}
              target={opensNewTab ? '_blank' : undefined}
            >
              <Icon aria-hidden className={current ? 'h-4 w-4 text-signal' : 'h-4 w-4'} />
              {collapsed ? <span className="sr-only">{label}</span> : label}
              {opensNewTab ? (
                <ExternalLink
                  aria-hidden
                  className={
                    collapsed ? 'absolute top-1.5 right-1.5 h-2.5 w-2.5' : 'ml-auto h-3.5 w-3.5'
                  }
                />
              ) : null}
            </Link>
          )

          return (
            <TooltipHint
              content={opensNewTab ? `${label} · opens in a new tab` : label}
              enabled={collapsed}
              key={href}
              side="right"
            >
              {link}
            </TooltipHint>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}
