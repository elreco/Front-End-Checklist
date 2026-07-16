import { createHash, randomBytes } from 'node:crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const { data: project } = await supabase
    .from('cr_projects')
    .select('id')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })
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
