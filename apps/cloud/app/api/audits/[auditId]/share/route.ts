import { createHash, randomBytes } from 'node:crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request, context: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await context.params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const { data: audit } = await supabase
    .from('cr_audits')
    .select('id')
    .eq('id', auditId)
    .eq('owner_id', auth.user.id)
    .maybeSingle()
  if (!audit) return Response.json({ error: 'Audit not found' }, { status: 404 })
  const input = await request.json().catch(() => ({}))
  const expiresInDays =
    input && typeof input === 'object' && 'expiresInDays' in input
      ? Number(input.expiresInDays)
      : undefined
  if (
    expiresInDays !== undefined &&
    (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365)
  )
    return Response.json({ error: 'Expiry must be between 1 and 365 days' }, { status: 422 })
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
    : null
  const { data: link, error } = await supabase
    .from('cr_share_links')
    .insert({
      owner_id: auth.user.id,
      audit_id: auditId,
      token_hash: tokenHash,
      expires_at: expiresAt
    })
    .select('id')
    .single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app'
  return Response.json(
    { id: link.id, url: `${origin}/reports/${token}`, expiresAt },
    { status: 201 }
  )
}
