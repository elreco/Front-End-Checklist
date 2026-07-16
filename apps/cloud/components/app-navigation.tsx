'use client'

import { BookOpen, CreditCard, Gauge, History, Settings } from '@repo/design-system/icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: Gauge },
  { href: '/audits', label: 'Check history', icon: History },
  { href: '/docs', label: 'Website guide', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
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
export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
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
    <nav aria-label="Product navigation" className="space-y-1">
      {navigation.map(({ href, label, icon: Icon }, index) => {
        const current = isCurrentPath(pathname, href)
        return (
          <Link
            aria-current={current ? 'page' : undefined}
            className={`flex items-center gap-3 border px-3 py-2.5 text-sm transition-colors ${index === 3 ? 'mt-5' : ''} ${current ? 'border-border bg-surface-raised text-foreground' : 'border-transparent text-muted hover:border-border hover:bg-surface hover:text-foreground'}`}
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
}
