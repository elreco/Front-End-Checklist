'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { hideOnMobile: true, href: '/#how-it-works', label: 'How it works', matches: '/#how-it-works' },
  { hideOnMobile: true, href: '/pricing', label: 'Pricing', matches: '/pricing' },
  { hideOnMobile: true, href: '/docs', label: 'Help', matches: '/docs' }
]

/** Main marketing links with an accessible and visible current-section state. */
export function MarketingNavigationLinks() {
  const pathname = usePathname()

  return links.map(({ hideOnMobile, href, label, matches }) => {
    const current =
      matches === '/docs'
        ? pathname === matches || pathname.startsWith(`${matches}/`)
        : pathname === matches
    return (
      <Link
        aria-current={current ? 'page' : undefined}
        className={`${hideOnMobile ? 'hidden sm:inline-flex' : 'inline-flex'} h-9 items-center border-b-2 px-1 transition-colors ${current ? 'border-signal text-foreground' : 'border-transparent text-muted hover:border-border hover:text-foreground'}`}
        href={href}
        key={href}
      >
        {label}
      </Link>
    )
  })
}
