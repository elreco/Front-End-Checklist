import { buildProjectPageUrl, fetchPublicHtml } from '@coderocket/core'
import { decryptAccessHeaders, encryptAccessHeaders } from '@coderocket/db'
import { z } from 'zod'
import { getManagedAccessLabel, type ManagedAccessScope } from '@/lib/managed-access'
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
    paths: z.array(z.string().trim().min(1).max(2048)).max(50).default([]),
    scope: scopeSchema.default('authenticated'),
    token: z.string().trim().min(1).max(4096)
  }),
  z.object({
    cookie: z.string().trim().min(1).max(4096),
    kind: z.literal('session_cookie'),
    paths: z.array(z.string().trim().min(1).max(2048)).max(50).default([]),
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

  const newHeaders = buildAccessHeaders(input.data)
  const { data: storedConnections, error: existingConnectionError } = await supabase
    .from('cr_project_access_connections')
    .select('display_label,encrypted_headers,kind,scope')
    .eq('project_id', projectId)
    .eq('owner_id', auth.user.id)
  if (existingConnectionError)
    return Response.json({ error: 'Existing page access could not be loaded.' }, { status: 500 })
  const existingConnection = storedConnections?.find(
    connection => connection.scope === input.data.scope
  )
  let existingHeaders: Record<string, string> = {}
  let allPageHeaders: Record<string, string> = {}
  let authenticatedPageHeaders: Record<string, string> = {}
  try {
    if (existingConnection)
      existingHeaders = decryptAccessHeaders(existingConnection.encrypted_headers)
    for (const connection of storedConnections ?? [])
      if (connection.scope === 'all')
        allPageHeaders = {
          ...allPageHeaders,
          ...decryptAccessHeaders(connection.encrypted_headers)
        }
      else
        authenticatedPageHeaders = {
          ...authenticatedPageHeaders,
          ...decryptAccessHeaders(connection.encrypted_headers)
        }
  } catch {
    return Response.json({ error: 'Existing page access could not be decrypted.' }, { status: 500 })
  }
  const scopedHeaders = { ...existingHeaders, ...newHeaders }
  const effectiveAuthenticatedPages = resolveAuthenticatedPages(
    input.data,
    project.page_paths,
    project.authenticated_page_paths ?? []
  )
  const paths = selectVerificationPaths(
    input.data.scope,
    project.page_paths,
    effectiveAuthenticatedPages
  )
  try {
    for (const path of paths) {
      const pathIsAuthenticated = effectiveAuthenticatedPages.includes(path)
      const verificationHeaders =
        input.data.scope === 'authenticated'
          ? { ...allPageHeaders, ...scopedHeaders }
          : pathIsAuthenticated
            ? { ...scopedHeaders, ...authenticatedPageHeaders }
            : scopedHeaders
      await fetchPublicHtml(buildProjectPageUrl(project.production_url, path), {
        headers: verificationHeaders
      })
    }
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
    encryptedHeaders = encryptAccessHeaders(scopedHeaders)
  } catch {
    return Response.json(
      { error: 'Secure access storage is not configured on this CodeRocket installation.' },
      { status: 503 }
    )
  }
  const verifiedAt = new Date().toISOString()
  const newLabel = getManagedAccessLabel(input.data.kind)
  const displayLabel =
    existingConnection && !existingConnection.display_label.split(' + ').includes(newLabel)
      ? `${existingConnection.display_label} + ${newLabel}`
      : (existingConnection?.display_label ?? newLabel)
  const storedKind =
    existingConnection && existingConnection.kind !== input.data.kind
      ? 'custom_headers'
      : input.data.kind
  const { error: connectionError } = await supabase.from('cr_project_access_connections').upsert(
    {
      display_label: displayLabel,
      encrypted_headers: encryptedHeaders,
      kind: storedKind,
      last_error: null,
      last_verified_at: verifiedAt,
      owner_id: auth.user.id,
      project_id: projectId,
      scope: input.data.scope,
      status: 'verified',
      updated_at: verifiedAt
    },
    { onConflict: 'project_id,scope' }
  )
  if (connectionError)
    return Response.json({ error: 'The secure connection could not be saved.' }, { status: 500 })

  const accessMode = resolveAccessMode(project.page_paths, effectiveAuthenticatedPages)
  const { error: projectUpdateError } = await supabase
    .from('cr_projects')
    .update({
      access_mode: accessMode,
      authenticated_page_paths: effectiveAuthenticatedPages,
      schedule_enabled: true,
      secure_runner_required: false,
      updated_at: verifiedAt
    })
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
  if (projectUpdateError)
    return Response.json(
      { error: 'The secure connection could not be activated.' },
      { status: 500 }
    )

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
    kind: storedKind,
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
  if (error)
    return Response.json({ error: 'The connection could not be revoked.' }, { status: 500 })
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

/** Convert one validated provider payload into the request headers stored for the worker. */
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

/** Limit connection verification to a small representative set of configured pages. */
function selectVerificationPaths(
  scope: ManagedAccessScope,
  pages: string[],
  authenticatedPages: string[]
): string[] {
  const candidates = scope === 'authenticated' ? authenticatedPages : pages
  return (candidates.length > 0 ? candidates : pages).slice(0, 3)
}

/** Derive the project access summary after authenticated page inference. */
function resolveAccessMode(
  pages: string[],
  authenticatedPages: string[]
): 'public' | 'protected' | 'private' {
  if (authenticatedPages.length === 0) return 'public'
  return authenticatedPages.length === pages.length ? 'private' : 'protected'
}

/** Keep inferred protected paths ordered, owner-configured, and inside the monitored selection. */
function resolveAuthenticatedPages(
  input: z.infer<typeof accessInputSchema>,
  pages: string[],
  storedAuthenticatedPages: string[]
): string[] {
  if (input.scope !== 'authenticated') return storedAuthenticatedPages
  const requestedPaths =
    'paths' in input && input.paths.length > 0
      ? input.paths.filter(path => pages.includes(path))
      : storedAuthenticatedPages
  const paths = requestedPaths.length > 0 ? requestedPaths : pages
  return pages.filter(path => storedAuthenticatedPages.includes(path) || paths.includes(path))
}

/** Translate a safe-fetch failure into a concise guided-connection error. */
function explainVerificationFailure(error: unknown): string {
  const detail = error instanceof Error ? error.message : 'The page still could not be opened.'
  return `CodeRocket tested the connection, but the protected page still could not be opened. ${detail}`
}

/** Parse request JSON without trusting its shape or provider discriminator. */
async function readAccessInput(request: Request) {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    value = null
  }
  return accessInputSchema.safeParse(value)
}
