export interface SupabaseServerConfig {
  publishableKey: string
  url: string
}

/** Read Supabase values at runtime so server code is not tied to Next.js build-time replacement. */
export function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  return url && publishableKey ? { publishableKey, url } : null
}
