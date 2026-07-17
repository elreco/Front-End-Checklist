import {
  assertPublicHttpsUrl,
  deriveSiteAccessMode,
  getPlanEntitlements,
  normalizeAuthenticatedPagePaths,
  normalizeHttpsOrigin,
  type PlanId
} from '@coderocket/core'
import { z } from 'zod'
import {
  normalizeEditablePagePaths,
  projectConfigurationChanged
} from '@/lib/project-configuration'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const configurationSchema = z.object({
  authenticatedPages: z.array(z.string().trim().min(1).max(2048)).max(50).default([]),
  checkNow: z.boolean().optional().default(true),
  pages: z.array(z.string().trim().min(1).max(2048)).min(1).max(50),
  secureRunnerRequired: z.boolean().optional(),
  url: z.string().trim().min(1).max(2048)
})

/** Update owner-scoped monitoring URLs without rewriting historical audit records. */
export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params
  const input = await readConfigurationInput(request)
  if (!input.success)
    return Response.json(
      { error: 'Check the website address and monitored pages.' },
      { status: 422 }
    )

  if (process.env.CODEROCKET_DEMO_MODE === 'true')
    return updateDemoConfiguration(projectId, input.data)

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Authentication required' }, { status: 401 })

  const { data: project, error: projectError } = await supabase
    .from('cr_projects')
    .select('id,production_url,page_paths,authenticated_page_paths,secure_runner_required')
    .eq('id', projectId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (projectError)
    return Response.json({ error: 'The monitored site could not be loaded.' }, { status: 500 })
  if (!project) return Response.json({ error: 'Monitored site not found.' }, { status: 404 })

  const normalized = await normalizeConfiguration(
    input.data.url,
    input.data.pages,
    input.data.authenticatedPages,
    input.data.secureRunnerRequired ?? project.secure_runner_required
  )
  if (!normalized.success) return Response.json({ error: normalized.error }, { status: 422 })

  const [{ data: subscription }, { count: activeChecks }] = await Promise.all([
    supabase.from('cr_subscriptions').select('plan_id').eq('owner_id', auth.user.id).maybeSingle(),
    supabase
      .from('cr_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', auth.user.id)
      .eq('project_id', projectId)
      .eq('kind', 'audit')
      .in('status', ['queued', 'leased'])
  ])
  const plan = resolvePlan(subscription?.plan_id)
  const limits = getPlanEntitlements(plan)
  if (normalized.pages.length > limits.pagesPerProject)
    return Response.json(
      {
        error: `${plan === 'free' ? 'The free plan' : `The ${plan} plan`} allows up to ${limits.pagesPerProject} monitored pages per site.`
      },
      { status: 422 }
    )
  if ((activeChecks ?? 0) > 0)
    return Response.json(
      { error: 'Wait for the current check to finish before changing its URLs.' },
      { status: 409 }
    )

  const changed = projectConfigurationChanged(
    {
      authenticatedPages: project.authenticated_page_paths ?? [],
      pages: project.page_paths,
      secureRunnerRequired: project.secure_runner_required,
      url: project.production_url
    },
    {
      ...normalized,
      secureRunnerRequired: normalized.accessMode !== 'public'
    }
  )
  if (changed) {
    const changedAt = new Date().toISOString()
    const siteUrlChanged = project.production_url !== normalized.url
    const { error } = await supabase
      .from('cr_projects')
      .update({
        access_mode: normalized.accessMode,
        authenticated_page_paths: normalized.authenticatedPages,
        baseline_reset_at: changedAt,
        page_paths: normalized.pages,
        production_url: normalized.url,
        schedule_enabled: normalized.accessMode === 'public',
        secure_runner_required: normalized.accessMode !== 'public',
        ...(siteUrlChanged ? { social_image_url: null } : {}),
        updated_at: changedAt
      })
      .eq('id', projectId)
      .eq('owner_id', auth.user.id)
      .is('archived_at', null)
    if (error)
      return Response.json({ error: 'The monitored URLs could not be saved.' }, { status: 500 })
  }

  const shouldQueue = input.data.checkNow && normalized.accessMode === 'public'
  const queueResult = shouldQueue
    ? await queueConfigurationCheck({
        ownerId: auth.user.id,
        pages: normalized.pages,
        plan,
        projectId,
        supabase
      })
    : { queued: false }

  return Response.json({
    accessMode: normalized.accessMode,
    authenticatedPages: normalized.authenticatedPages,
    changed,
    queued: queueResult.queued,
    checkWarning: queueResult.warning,
    pages: normalized.pages,
    secureRunnerRequired: normalized.accessMode !== 'public',
    url: normalized.url
  })
}

/** Archive one owner-scoped monitored site and stop its automatic schedule. */
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

/** Parse the small configuration payload without trusting request JSON. */
async function readConfigurationInput(request: Request) {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    return configurationSchema.safeParse(null)
  }
  return configurationSchema.safeParse(value)
}

/** Normalize and SSRF-check the website origin plus every monitored page. */
async function normalizeConfiguration(
  rawUrl: string,
  rawPages: string[],
  rawAuthenticatedPages: string[],
  secureRunnerRequired: boolean
): Promise<
  | {
      success: true
      accessMode: 'public' | 'protected' | 'private'
      authenticatedPages: string[]
      pages: string[]
      url: string
    }
  | { success: false; error: string }
> {
  try {
    const effectiveSecureRunnerRequired = secureRunnerRequired || rawAuthenticatedPages.length > 0
    const url = effectiveSecureRunnerRequired
      ? normalizeHttpsOrigin(rawUrl)
      : (await assertPublicHttpsUrl(rawUrl)).origin
    const pages = normalizeEditablePagePaths(rawPages, url)
    const authenticatedPages = normalizeAuthenticatedPagePaths(
      normalizeEditablePagePaths(rawAuthenticatedPages, url),
      pages
    )
    return {
      success: true,
      accessMode: deriveSiteAccessMode(pages, authenticatedPages, effectiveSecureRunnerRequired),
      authenticatedPages,
      pages,
      url
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Use a public HTTPS address and pages from that website.'
    }
  }
}

/** Keep the local demo workflow interactive without resolving its example hostname. */
function updateDemoConfiguration(
  projectId: string,
  input: z.infer<typeof configurationSchema>
): Response {
  if (projectId !== 'demo-acme' && projectId !== 'demo-url-error')
    return Response.json({ error: 'Monitored site not found.' }, { status: 404 })
  try {
    const parsed = new URL(input.url)
    if (parsed.protocol !== 'https:') throw new Error('Use a secure https:// website address.')
    const url = parsed.origin
    const pages = normalizeEditablePagePaths(input.pages, url)
    const authenticatedPages = normalizeAuthenticatedPagePaths(
      normalizeEditablePagePaths(input.authenticatedPages, url),
      pages
    )
    const limits = getPlanEntitlements('free')
    if (pages.length > limits.pagesPerProject)
      throw new Error(
        `The free plan allows up to ${limits.pagesPerProject} monitored pages per site.`
      )
    const accessMode = deriveSiteAccessMode(
      pages,
      authenticatedPages,
      Boolean(input.secureRunnerRequired) || authenticatedPages.length > 0
    )
    return Response.json({
      accessMode,
      authenticatedPages,
      changed: true,
      queued: input.checkNow && accessMode === 'public',
      pages,
      secureRunnerRequired: accessMode !== 'public',
      url
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Check the monitored URLs.' },
      { status: 422 }
    )
  }
}

/** Queue the first check for the new configuration while preserving a successful save. */
async function queueConfigurationCheck({
  ownerId,
  pages,
  plan,
  projectId,
  supabase
}: {
  ownerId: string
  pages: string[]
  plan: PlanId
  projectId: string
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}): Promise<{ queued: boolean; warning?: string }> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const { count: runs } = await supabase
    .from('cr_audits')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .in('trigger', ['manual', 'ci'])
    .gte('created_at', monthStart.toISOString())
  if ((runs ?? 0) >= getPlanEntitlements(plan).onDemandRunsPerMonth)
    return {
      queued: false,
      warning: 'The URLs are saved, but the monthly on-demand check limit has been reached.'
    }

  const { error } = await supabase.from('cr_jobs').insert({
    owner_id: ownerId,
    project_id: projectId,
    kind: 'audit',
    payload: { environment: 'production', trigger: 'manual' },
    progress_stage: 'queued',
    progress_current: 0,
    progress_total: pages.length,
    progress_message: 'Waiting for the website checking service',
    progress_updated_at: new Date().toISOString()
  })
  return error
    ? {
        queued: false,
        warning: 'The URLs are saved, but the fresh check could not start. Please try again.'
      }
    : { queued: true }
}

/** Normalize a stored subscription value to the public plan contract. */
function resolvePlan(value: unknown): PlanId {
  return value === 'solo' || value === 'agency' ? value : 'free'
}
