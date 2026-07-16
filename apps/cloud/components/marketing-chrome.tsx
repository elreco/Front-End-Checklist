'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const chromeFreePrefixes = [
  '/dashboard',
  '/audits',
  '/projects',
  '/onboarding',
  '/settings',
  '/reports'
]

/** Hide marketing navigation around authenticated product and private report routes. */
export function MarketingChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (chromeFreePrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)))
    return null
  return children
}
