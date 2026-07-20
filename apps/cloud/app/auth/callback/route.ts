import { NextResponse } from 'next/server'
import { getAuthRedirectUrl, getSafeAuthDestination } from '@/lib/auth-redirect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = getSafeAuthDestination(url.searchParams.get('next'))
  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(getAuthRedirectUrl(next, request.url))
  }
  return NextResponse.redirect(getAuthRedirectUrl('/login?error=callback', request.url))
}
