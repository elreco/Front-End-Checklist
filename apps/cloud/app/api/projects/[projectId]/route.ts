import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const { error } = await supabase
    .from('cr_projects')
    .update({ archived_at: new Date().toISOString(), schedule_enabled: false })
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return new Response(null, { status: 204 })
}
