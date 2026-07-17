import { createHash, randomBytes } from 'node:crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Create a revocable project token and switch the project to secure-runner monitoring. */
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const { data: project } = await supabase
    .from('cr_projects')
    .select('id,page_paths,authenticated_page_paths')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })
  const authenticatedPages = project.authenticated_page_paths ?? []
  const accessMode =
    authenticatedPages.length > 0 && authenticatedPages.length === project.page_paths.length
      ? 'private'
      : 'protected'
  const { error: projectUpdateError } = await supabase
    .from('cr_projects')
    .update({
      access_mode: accessMode,
      schedule_enabled: false,
      secure_runner_required: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
  if (projectUpdateError)
    return Response.json(
      { error: 'Secure monitoring could not be activated for this project.' },
      { status: 500 }
    )
  const secret = randomBytes(32).toString('base64url')
  const token = `crtk_${secret}`
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const body = await request.json().catch(() => ({}))
  const name =
    body && typeof body === 'object' && 'name' in body
      ? String(body.name).slice(0, 100)
      : 'CI token'
  const { error } = await supabase.from('cr_api_tokens').insert({
    owner_id: auth.user.id,
    project_id: projectId,
    name,
    prefix: token.slice(0, 12),
    token_hash: tokenHash
  })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(
    {
      token,
      prefix: token.slice(0, 12),
      message: 'Copy this token now. It will not be shown again.'
    },
    { status: 201 }
  )
}
