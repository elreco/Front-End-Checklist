import { buildProjectPageUrl, fetchPublicHtml } from '@coderocket/core'
import { encryptAccessHeaders } from '@coderocket/db'
import { z } from 'zod'
import {
  getManagedAccessLabel,
  type ManagedAccessKind,
  type ManagedAccessScope
} from '@/lib/managed-access'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const scopeSchema = z.enum(['all', 'authenticated'])
const accessInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('vercel'),
    scope: scopeSchema.default('all'),
    secret: z.string().trim().min(1).max(4096)
  }),
  z.object({
    clientId: z.string().trim().min(1).max(4096),
    clientSecret: z.string().trim().min(1).max(4096),
    kind: z.literal('cloudflare'),
    scope: scopeSchema.default('all')
  }),
  z.object({
    kind: z.literal('basic_auth'),
    password: z.string().min(1).max(4096),
    scope: scopeSchema.default('all'),
    username: z.string().max(1024)
  }),
  z.object({
    kind: z.literal('bearer_token'),
    scope: scopeSchema.default('authenticated'),
    token: z.string().trim().min(1).max(4096)
  }),
  z.object({
    cookie: z.string().trim().min(1).max(4096),
    kind: z.literal('session_cookie'),
    scope: scopeSchema.default('authenticated')
  }),
  z.object({
    headers: z
      .record(z.string(), z.string().min(1).max(4096))
      .refine(headers => Object.keys(headers).length > 0 && Object.keys(headers).length <= 20),
    kind: z.literal('custom_headers'),
    scope: scopeSchema
  })
])

/** Verify and store one revocable managed cloud-access connection for a monitored site. */
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params
  const input = await readAccessInput(request)
  if (!input.success)
    return Response.json({ error: 'Check the access details and try again.' }, { status: 422 })
  if (process.env.CODEROCKET_DEMO_MODE === 'true')
    return Response.json({
      displayLabel: getManagedAccessLabel(input.data.kind),
      kind: input.data.kind,
      scope: input.data.scope,
      status: 'verified'
    })

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const { data: project, error: projectError } = await supabase
    .from('cr_projects')
    .select('id,production_url,page_paths,authenticated_page_paths')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (projectError)
    return Response.json({ error: 'The monitored site could not be loaded.' }, { status: 500 })
  if (!project) return Response.json({ error: 'Monitored site not found.' }, { status: 404 })

  const headers = buildAccessHeaders(input.data)
  const paths = selectVerificationPaths(
    input.data.scope,
    project.page_paths,
    project.authenticated_page_paths ?? []
  )
  try {
    for (const path of paths)
      await fetchPublicHtml(buildProjectPageUrl(project.production_url, path), { headers })
  } catch (error) {
    return Response.json(
      {
        error: explainVerificationFailure(error),
        verified: false
      },
      { status: 422 }
    )
  }

  let encryptedHeaders: string
  try {
    encryptedHeaders = encryptAccessHeaders(headers)
  } catch {
    return Response.json(
      { error: 'Secure access storage is not configured on this CodeRocket installation.' },
      { status: 503 }
    )
  }
  const verifiedAt = new Date().toISOString()
  const displayLabel = getManagedAccessLabel(input.data.kind)
  const { error: connectionError } = await supabase
    .from('cr_project_access_connections')
    .upsert(
      {
        display_label: displayLabel,
        encrypted_headers: encryptedHeaders,
        kind: input.data.kind,
        last_error: null,
        last_verified_at: verifiedAt,
        owner_id: auth.user.id,
        project_id: projectId,
        scope: input.data.scope,
        status: 'verified',
        updated_at: verifiedAt
      },
      { onConflict: 'project_id' }
    )
  if (connectionError)
    return Response.json({ error: 'The secure connection could not be saved.' }, { status: 500 })

  const accessMode = resolveAccessMode(project.page_paths, project.authenticated_page_paths ?? [])
  const { error: projectUpdateError } = await supabase
    .from('cr_projects')
    .update({
      access_mode: accessMode,
      schedule_enabled: true,
      secure_runner_required: false,
      updated_at: verifiedAt
    })
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
  if (projectUpdateError)
    return Response.json({ error: 'The secure connection could not be activated.' }, { status: 500 })

  const { count: activeChecks } = await supabase
    .from('cr_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', auth.user.id)
    .eq('project_id', projectId)
    .eq('kind', 'audit')
    .in('status', ['queued', 'leased'])
  let queued = false
  if ((activeChecks ?? 0) === 0) {
    const { error: queueError } = await supabase.from('cr_jobs').insert({
      kind: 'audit',
      owner_id: auth.user.id,
      payload: { environment: 'production', trigger: 'manual' },
      progress_current: 0,
      progress_message: 'Waiting for the website checking service',
      progress_stage: 'queued',
      progress_total: project.page_paths.length,
      progress_updated_at: verifiedAt,
      project_id: projectId
    })
    queued = !queueError
  }

  return Response.json({
    displayLabel,
    kind: input.data.kind,
    lastVerifiedAt: verifiedAt,
    queued,
    scope: input.data.scope,
    status: 'verified'
  })
}

/** Revoke a stored connection without deleting audit history. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return new Response(null, { status: 204 })
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const { data: project } = await supabase
    .from('cr_projects')
    .select('id,access_mode')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (!project) return Response.json({ error: 'Monitored site not found.' }, { status: 404 })
  const { error } = await supabase
    .from('cr_project_access_connections')
    .delete()
    .eq('project_id', projectId)
    .eq('owner_id', auth.user.id)
  if (error) return Response.json({ error: 'The connection could not be revoked.' }, { status: 500 })
  await supabase
    .from('cr_projects')
    .update({
      schedule_enabled: project.access_mode === 'public',
      secure_runner_required: project.access_mode !== 'public',
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
  return new Response(null, { status: 204 })
}

function buildAccessHeaders(input: z.infer<typeof accessInputSchema>): Record<string, string> {
  if (input.kind === 'vercel')
    return {
      'x-vercel-protection-bypass': input.secret,
      'x-vercel-set-bypass-cookie': 'true'
    }
  if (input.kind === 'cloudflare')
    return {
      'cf-access-client-id': input.clientId,
      'cf-access-client-secret': input.clientSecret
    }
  if (input.kind === 'basic_auth')
    return {
      authorization: `Basic ${Buffer.from(`${input.username}:${input.password}`).toString('base64')}`
    }
  if (input.kind === 'bearer_token') return { authorization: `Bearer ${input.token}` }
  if (input.kind === 'session_cookie') return { cookie: input.cookie }
  return input.headers
}

function selectVerificationPaths(
  scope: ManagedAccessScope,
  pages: string[],
  authenticatedPages: string[]
): string[] {
  const candidates = scope === 'authenticated' ? authenticatedPages : pages
  return (candidates.length > 0 ? candidates : pages).slice(0, 3)
}

function resolveAccessMode(
  pages: string[],
  authenticatedPages: string[]
): 'public' | 'protected' | 'private' {
  if (authenticatedPages.length === 0) return 'public'
  return authenticatedPages.length === pages.length ? 'private' : 'protected'
}

function explainVerificationFailure(error: unknown): string {
  const detail = error instanceof Error ? error.message : 'The page still could not be opened.'
  return `CodeRocket tested the connection, but the protected page still could not be opened. ${detail}`
}

async function readAccessInput(request: Request) {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    value = null
  }
  return accessInputSchema.safeParse(value)
}
