'use client'

import { BookOpen, CreditCard, Gauge, History, Settings } from '@repo/design-system/icons'
import { TooltipHint, TooltipProvider } from '@repo/design-system/ui/tooltip'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: Gauge },
  { href: '/audits', label: 'Check history', icon: History },
  { href: '/docs', label: 'Help & rules', icon: BookOpen },
  { href: '/settings', label: 'Account settings', icon: Settings },
  { href: '/settings/billing', label: 'Plan & billing', icon: CreditCard }
]

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === '/dashboard')
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
        {navigation.slice(0, 3).map(({ href, label, icon: Icon }) => {
          const current = isCurrentPath(pathname, href)
          return (
            <Link
              aria-current={current ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 border px-3 py-2 font-mono text-xs transition-colors ${current ? 'border-accent bg-accent text-white' : 'border-transparent text-muted hover:border-border hover:bg-surface-raised hover:text-foreground'}`}
              href={href}
              key={href}
            >
              <Icon aria-hidden className="h-4 w-4" />
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
        className="space-y-1 font-mono font-normal text-xs"
        id="product-sidebar-navigation"
      >
        {navigation.map(({ href, label, icon: Icon }, index) => {
          const current = isCurrentPath(pathname, href)
          const link = (
            <Link
              aria-current={current ? 'page' : undefined}
              className={`flex items-center border py-2.5 transition-colors ${
                collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
              } ${index === 3 ? 'mt-5' : ''} ${
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
            <TooltipHint content={label} enabled={collapsed} key={href} side="right">
              {link}
            </TooltipHint>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}
