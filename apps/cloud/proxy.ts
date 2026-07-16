import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const protectedPrefixes = ['/dashboard', '/projects', '/audits', '/settings', '/onboarding']

export async function proxy(request: NextRequest) {
  if (request.headers.get('host')?.toLowerCase() === 'www.coderocket.app') {
    const canonical = request.nextUrl.clone()
    canonical.host = 'coderocket.app'
    canonical.protocol = 'https'
    return NextResponse.redirect(canonical, 308)
  }
  if (
    ['/ai-website-builder', '/generate', '/generations', '/credits'].includes(
      request.nextUrl.pathname
    )
  ) {
    return new NextResponse('This legacy CodeRocket route has been permanently removed.', {
      status: 410
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
