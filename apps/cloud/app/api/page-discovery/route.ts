import { discoverPublicPagePaths } from '@coderocket/core'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const discoverySchema = z.object({
  url: z.string().trim().min(1).max(2048)
})

/** Discover public page candidates for the signed-in onboarding user. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user && process.env.CODEROCKET_DEMO_MODE !== 'true')
    return Response.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Enter a valid HTTPS website address.' }, { status: 422 })
  }
  const input = discoverySchema.safeParse(body)
  if (!input.success)
    return Response.json({ error: 'Enter a valid HTTPS website address.' }, { status: 422 })

  try {
    return Response.json(await discoverPublicPagePaths(input.data.url))
  } catch (error) {
    return Response.json({ error: discoveryErrorMessage(error) }, { status: 422 })
  }
}

function discoveryErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('Cloudflare challenge'))
    return 'Cloudflare blocked the public scan. Import a sitemap or route list instead.'
  if (message.includes('Private or reserved networks'))
    return 'This address is on a private network. Import a route list or connect secure access.'
  if (message.includes('Only HTTPS') || message.includes('must use HTTPS'))
    return 'The website address must start with https://.'
  if (message.startsWith('HTTP '))
    return 'The public website could not be opened. Check the address or import a route list.'
  return 'No public pages could be loaded. Import a sitemap or route list instead.'
}
