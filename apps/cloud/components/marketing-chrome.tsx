'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isChromeFreeRoute } from '@/lib/product-routes'

/** Hide marketing navigation around authenticated product and private report routes. */
export function MarketingChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (isChromeFreeRoute(pathname)) return null
  return children
}
