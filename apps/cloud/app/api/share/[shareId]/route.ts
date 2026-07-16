import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function DELETE(_request: Request, context: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const { error } = await supabase
    .from('cr_share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
    .eq('owner_id', auth.user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return new Response(null, { status: 204 })
}
