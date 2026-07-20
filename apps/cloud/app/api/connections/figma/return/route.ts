import { createServiceClient } from '@coderocket/db'
import { saveFigmaConnection } from '@coderocket/db/figma'
import { NextResponse } from 'next/server'
import {
  exchangeFigmaAuthorizationCode,
  FIGMA_OAUTH_COOKIE,
  figmaOAuthCallbackUrl,
  readFigmaOAuthSession
} from '@/lib/figma-oauth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Verify Figma OAuth state, encrypt the tokens, and return to the original creation form. */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const fallback = new URL('/create?source=figma&notice=figma-connection-failed', request.url)
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user)
    return clearSessionCookie(
      NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent('/create?source=figma')}`, request.url)
      )
    )
  const encrypted = readCookie(request, FIGMA_OAUTH_COOKIE)
  const code = requestUrl.searchParams.get('code') ?? ''
  const returnedState = requestUrl.searchParams.get('state') ?? ''
  const session = encrypted ? readFigmaOAuthSession(encrypted, returnedState) : undefined
  if (!(code && session)) return clearSessionCookie(NextResponse.redirect(fallback))
  try {
    const token = await exchangeFigmaAuthorizationCode(
      code,
      figmaOAuthCallbackUrl(request.url),
      session.codeVerifier
    )
    await saveFigmaConnection(createServiceClient(), {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      figmaUserId: token.userId,
      ownerId: auth.user.id,
      refreshToken: token.refreshToken
    })
    const destination = new URL(session.returnPath, request.url)
    destination.searchParams.set('notice', 'figma-connected')
    return clearSessionCookie(NextResponse.redirect(destination))
  } catch {
    return clearSessionCookie(NextResponse.redirect(fallback))
  }
}

/** Read one named cookie without exposing or enumerating unrelated browser state. */
function readCookie(request: Request, name: string): string | undefined {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(FIGMA_OAUTH_COOKIE, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/api/connections/figma/return',
    sameSite: 'lax'
  })
  return response
}
