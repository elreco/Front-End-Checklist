'use client'

import { UserRound, WandSparkles } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/** Swap marketing calls to action for a clear connected state when a session exists. */
export function MarketingAccountActions() {
  const pathname = usePathname()
  const [connected, setConnected] = useState(false)
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )

  useEffect(() => {
    if (!configured) return
    const supabase = createSupabaseBrowserClient()
    void supabase.auth.getUser().then(({ data }) => setConnected(Boolean(data.user)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setConnected(Boolean(session?.user))
    )
    return () => data.subscription.unsubscribe()
  }, [configured])

  if (connected)
    return (
      <CodeRocketButton
        asChild
        size="sm"
        variant={pathname === '/dashboard' ? 'secondary' : 'primary'}
      >
        <Link aria-current={pathname === '/dashboard' ? 'page' : undefined} href="/dashboard">
          <UserRound aria-hidden /> Dashboard
        </Link>
      </CodeRocketButton>
    )

  return (
    <span aria-label="Account actions" className="flex items-center gap-2" role="group">
      <CodeRocketButton asChild size="sm" variant={pathname === '/login' ? 'secondary' : 'outline'}>
        <Link aria-current={pathname === '/login' ? 'page' : undefined} href="/login">
          Sign in
        </Link>
      </CodeRocketButton>
      <CodeRocketButton asChild className="hidden sm:inline-flex" size="sm">
        <Link aria-current={pathname === '/create' ? 'page' : undefined} href="/create">
          <WandSparkles aria-hidden /> Clone website
        </Link>
      </CodeRocketButton>
    </span>
  )
}
