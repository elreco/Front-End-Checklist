import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const protectedPrefixes = ['/dashboard', '/projects', '/audits', '/settings', '/onboarding']
const legacyGonePrefixes = [
  '/ai-website-builder',
  '/components',
  '/credits',
  '/generate',
  '/generations',
  '/magic-link',
  '/open-source',
  '/users'
]

export async function proxy(request: NextRequest) {
  if (request.headers.get('host')?.toLowerCase() === 'www.coderocket.app') {
    const canonical = request.nextUrl.clone()
    canonical.host = 'coderocket.app'
    canonical.protocol = 'https'
    canonical.port = ''
    return NextResponse.redirect(canonical, 308)
  }
  if (
    legacyGonePrefixes.some(
      prefix =>
        request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)
    )
  ) {
    return new NextResponse('This legacy CodeRocket page has been permanently removed.', {
      status: 410,
      headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' }
    })
  }
  let response = NextResponse.next({ request })
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return response
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!(url && key)) return response
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: cookiesToSet => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options)
      }
    }
  })
  const { data } = await supabase.auth.getUser()
  const protectedRoute = protectedPrefixes.some(prefix =>
    request.nextUrl.pathname.startsWith(prefix)
  )
  if (protectedRoute && !data.user) {
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
