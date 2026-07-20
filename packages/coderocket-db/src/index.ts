import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export { decryptAccessHeaders, encryptAccessHeaders } from './access-credentials'

/** Build the worker-only client. Never import this function in a client component. */
export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!(url && serviceRoleKey)) throw new Error('Supabase service credentials are missing')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
