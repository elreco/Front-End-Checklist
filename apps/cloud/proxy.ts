import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSafeAuthDestination } from './lib/auth-redirect'
import { isAuthenticatedProductRoute } from './lib/product-routes'
import { getSupabaseServerConfig } from './lib/supabase/config'

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

/** Apply canonical-host, legacy-route, and authenticated-route behavior at the request boundary. */
export async function proxy(request: NextRequest) {
  const hostname =
    request.headers.get('host')?.toLowerCase().split(':')[0] ??
    request.nextUrl.hostname.toLowerCase()
  if (hostname === 'docs.coderocket.app') {
    const canonical = request.nextUrl.clone()
    canonical.host = 'www.coderocket.app'
    canonical.protocol = 'https'
    canonical.port = ''
    if (!canonical.pathname.startsWith('/docs')) {
      canonical.pathname = canonical.pathname === '/' ? '/docs' : `/docs${canonical.pathname}`
    }
    return NextResponse.redirect(canonical, 308)
  }
  if (hostname === 'coderocket.app') {
    const canonical = request.nextUrl.clone()
    canonical.host = 'www.coderocket.app'
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
  const config = getSupabaseServerConfig()
  if (!config) return response
  const supabase = createServerClient(config.url, config.publishableKey, {
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
  const protectedRoute = isAuthenticatedProductRoute(request.nextUrl.pathname)
  if (protectedRoute && !data.user) {
    const login = request.nextUrl.clone()
    login.pathname = '/login'
    login.search = ''
    login.searchParams.set(
      'next',
      getSafeAuthDestination(`${request.nextUrl.pathname}${request.nextUrl.search}`)
    )
    return NextResponse.redirect(login)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
