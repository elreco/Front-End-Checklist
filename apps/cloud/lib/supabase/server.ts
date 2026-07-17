import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseServerConfig } from './config'

/** Create a request-scoped Supabase client using the legacy CodeRocket auth project. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const config = getSupabaseServerConfig()
  if (!config) throw new Error('Supabase public credentials are missing')
  return createServerClient(config.url, config.publishableKey, {
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
