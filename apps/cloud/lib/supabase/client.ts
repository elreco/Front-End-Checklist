'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Create the browser client for interactive authentication flows. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!(url && publishableKey)) throw new Error('Supabase public credentials are missing')
  return createBrowserClient(url, publishableKey)
}
