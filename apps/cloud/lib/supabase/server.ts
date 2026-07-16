import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Create a request-scoped Supabase client using the legacy CodeRocket auth project. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!(url && publishableKey)) throw new Error('Supabase public credentials are missing')
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: values => {
        try {
          for (const { name, value, options } of values) cookieStore.set(name, value, options)
        } catch {
          // Server components cannot write cookies. The auth callback handles refresh writes.
        }
      }
    }
  })
}
