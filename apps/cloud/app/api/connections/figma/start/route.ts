import { parseFigmaFileUrl } from '@coderocket/core/figma-source'
import { NextResponse } from 'next/server'
import {
  createFigmaOAuthSession,
  FIGMA_OAUTH_COOKIE,
  figmaAuthorizationUrl,
  figmaOAuthCallbackUrl,
  figmaOAuthEnabled
} from '@/lib/figma-oauth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Start one Figma-hosted OAuth flow and keep the design link in encrypted return state. */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const rawFigmaUrl = requestUrl.searchParams.get('figmaUrl') ?? ''
  const requestedSiteId = requestUrl.searchParams.get('siteId') ?? ''
  const reference = parseFigmaFileUrl(rawFigmaUrl)
  const returnQuery = new URLSearchParams({ source: 'figma' })
  if (reference) returnQuery.set('figmaUrl', reference.url)
  const returnPath = /^[a-f\d-]{36}$/i.test(requestedSiteId)
    ? `/studio/${requestedSiteId}?notice=figma-connected`
    : `/create?${returnQuery.toString()}`
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(returnPath)}`, request.url)
    )
  if (!figmaOAuthEnabled()) {
    returnQuery.set('notice', 'figma-unavailable')
    return NextResponse.redirect(new URL(`/create?${returnQuery.toString()}`, request.url))
  }
  try {
    const callbackUrl = figmaOAuthCallbackUrl(request.url)
    const session = createFigmaOAuthSession(returnPath)
    const response = NextResponse.redirect(figmaAuthorizationUrl(callbackUrl, session))
    response.cookies.set(FIGMA_OAUTH_COOKIE, session.encrypted, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: '/api/connections/figma/return',
      sameSite: 'lax',
      secure: new URL(callbackUrl).protocol === 'https:'
    })
    return response
  } catch {
    returnQuery.set('notice', 'figma-connection-failed')
    return NextResponse.redirect(new URL(`/create?${returnQuery.toString()}`, request.url))
  }
}
