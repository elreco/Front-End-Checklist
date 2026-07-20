import { FigmaApiError, listFigmaFileScreens } from '@coderocket/core/figma-api'
import { parseFigmaFileUrl } from '@coderocket/core/figma-source'
import { createServiceClient } from '@coderocket/db'
import { loadFigmaAccessToken } from '@coderocket/db/figma'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const requestSchema = z.object({ url: z.string().trim().min(1).max(2_048) })

/** Return owner-scoped Figma frames and passive thumbnails without returning provider credentials. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Sign in to connect Figma.' }, { status: 401 })
  const payload = requestSchema.safeParse(await request.json().catch(() => undefined))
  const reference = payload.success ? parseFigmaFileUrl(payload.data.url) : undefined
  if (!reference)
    return Response.json(
      { error: 'Paste a Figma design link, including its file name.' },
      { status: 400 }
    )
  try {
    const token = await loadFigmaAccessToken(createServiceClient(), auth.user.id)
    const result = await listFigmaFileScreens(token, reference)
    return Response.json(
      { ...result, sourceUrl: reference.url },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Figma could not inspect this design.'
    const connectionRequired = /connect|reconnect|oauth|configured/i.test(message)
    const status = connectionRequired ? 409 : error instanceof FigmaApiError ? error.status : 502
    return Response.json(
      {
        code: connectionRequired ? 'figma_connection_required' : 'figma_inspection_failed',
        connectUrl: connectionRequired
          ? `/api/connections/figma/start?figmaUrl=${encodeURIComponent(reference.url)}`
          : undefined,
        error: message
      },
      { status }
    )
  }
}
