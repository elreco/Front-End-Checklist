'use client'

import { UserRound } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/** Swap marketing calls to action for a clear connected state when a session exists. */
export function MarketingAccountActions() {
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
      <CodeRocketButton asChild size="sm">
        <Link href="/dashboard">
          <UserRound aria-hidden /> Dashboard
        </Link>
      </CodeRocketButton>
    )

  return (
    <>
      <CodeRocketButton asChild size="sm" variant="outline">
        <Link href="/login">Sign in</Link>
      </CodeRocketButton>
      <CodeRocketButton asChild className="hidden sm:inline-flex" size="sm">
        <Link href="/onboarding">Start free</Link>
      </CodeRocketButton>
    </>
  )
}
