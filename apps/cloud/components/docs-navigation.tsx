'use client'

import { BookOpen, ListChecks, ShieldCheck, Terminal, Workflow } from '@repo/design-system/icons'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/docs', label: 'Overview', icon: BookOpen },
  { href: '/docs/audits', label: 'How checks work', icon: Workflow },
  { href: '/docs/cli', label: 'CLI & GitHub', icon: Terminal },
  { href: '/docs/rules', label: 'Rules reference', icon: ListChecks },
  { href: '/docs/security', label: 'Security model', icon: ShieldCheck }
]

/** Documentation links with section-aware active states, including rule detail pages. */
export function DocsNavigation() {
  const pathname = usePathname()

  return (
    <nav aria-label="Documentation navigation" className="grid p-2 sm:grid-cols-2 lg:block">
      {links.map(({ href, label, icon: Icon }) => {
        const current =
          href === '/docs'
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            aria-current={current ? 'page' : undefined}
            className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors ${current ? 'border-accent bg-surface-raised text-foreground' : 'border-transparent text-muted hover:border-border hover:bg-surface-raised hover:text-foreground'}`}
            href={href}
            key={href}
          >
            <Icon aria-hidden className={`h-4 w-4 shrink-0 ${current ? 'text-signal' : ''}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
