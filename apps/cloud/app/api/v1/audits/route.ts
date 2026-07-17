import { createHash } from 'node:crypto'
import {
  type AuditFindingInput,
  auditSubmissionSchema,
  compareFindings,
  getPlanEntitlements,
  type PlanId,
  resolveProjectSocialImage
} from '@coderocket/core'
import { createServiceClient, persistAudit } from '@coderocket/db'
import { filterBaselineForSubmittedPages, normalizeSubmittedPages } from '@/lib/audit-submission'

export const runtime = 'nodejs'
const MAX_BODY_BYTES = 5 * 1024 * 1024

/** Return a consistent bearer-token rejection without exposing verification detail. */
function unauthorized(message: string) {
  return Response.json({ error: message }, { status: 401 })
}

/** Validate, compare, and atomically persist one authenticated CI audit submission. */
export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  const idempotencyKey = request.headers.get('idempotency-key')
  if (!authorization?.startsWith('Bearer '))
    return unauthorized('A project bearer token is required')
  if (!idempotencyKey || idempotencyKey.length > 200)
    return Response.json({ error: 'A valid Idempotency-Key is required' }, { status: 400 })
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES)
    return Response.json({ error: 'Payload exceeds 5 MB' }, { status: 413 })
  const body = await request.text()
  if (Buffer.byteLength(body) > MAX_BODY_BYTES)
    return Response.json({ error: 'Payload exceeds 5 MB' }, { status: 413 })
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }
  const parsed = auditSubmissionSchema.safeParse(json)
  if (!parsed.success)
    return Response.json(
      { error: 'Invalid audit payload', issues: parsed.error.issues },
      { status: 422 }
    )

  let normalizedPages: typeof parsed.data.pages
  try {
    normalizedPages = normalizeSubmittedPages(parsed.data.pages)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Inconsistent audit pages' },
      { status: 422 }
    )
  }

  const db = createServiceClient()
  const token = authorization.slice('Bearer '.length)
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data: tokenRow, error: tokenError } = await db
    .from('cr_api_tokens')
    .select('id,owner_id,project_id,revoked_at,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (tokenError) return Response.json({ error: 'Token verification failed' }, { status: 500 })
  if (
    !tokenRow ||
    tokenRow.revoked_at ||
    (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date())
  )
    return unauthorized('Project token is invalid or expired')
  if (parsed.data.projectId && tokenRow.project_id !== parsed.data.projectId)
    return unauthorized('Token does not belong to this project')

  const { data: replay } = await db
    .from('cr_idempotency_keys')
    .select('response')
    .eq('project_id', tokenRow.project_id)
    .eq('key', idempotencyKey)
    .maybeSingle()
  if (replay?.response)
    return Response.json(replay.response, { headers: { 'x-idempotent-replay': 'true' } })

  const { data: subscription, error: subscriptionError } = await db
    .from('cr_subscriptions')
    .select('plan_id,status,grace_period_end,current_period_end')
    .eq('owner_id', tokenRow.owner_id)
    .maybeSingle()
  if (subscriptionError)
    return Response.json({ error: 'Could not verify project entitlements' }, { status: 500 })
  let plan: PlanId =
    subscription?.plan_id === 'solo' || subscription?.plan_id === 'agency'
      ? subscription.plan_id
      : 'free'
  const graceExpired =
    subscription?.status === 'past_due' &&
    subscription.grace_period_end &&
    new Date(subscription.grace_period_end) < new Date()
  const ended =
    subscription?.status === 'canceled' &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) < new Date()
  if (graceExpired || ended) plan = 'free'
  const limits = getPlanEntitlements(plan)
  if (normalizedPages.length > limits.pagesPerProject)
    return Response.json(
      { error: `${plan} allows ${limits.pagesPerProject} pages per audit` },
      { status: 429 }
    )
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  ).toISOString()
  const { count: usedRuns, error: usedRunsError } = await db
    .from('cr_audits')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', tokenRow.owner_id)
    .in('trigger', ['manual', 'ci'])
    .gte('created_at', monthStart)
  if (usedRunsError)
    return Response.json({ error: 'Could not verify the monthly check quota' }, { status: 500 })
  if ((usedRuns ?? 0) >= limits.onDemandRunsPerMonth)
    return Response.json({ error: 'Monthly manual/CI run quota reached' }, { status: 429 })

  const { data: project, error: projectError } = await db
    .from('cr_projects')
    .select('baseline_reset_at')
    .eq('id', tokenRow.project_id)
    .eq('owner_id', tokenRow.owner_id)
    .is('archived_at', null)
    .maybeSingle()
  if (projectError)
    return Response.json({ error: 'Could not load the monitored site' }, { status: 500 })
  if (!project) return Response.json({ error: 'Monitored site not found' }, { status: 404 })

  let baselineQuery = db
    .from('cr_audits')
    .select('id,ruleset_version')
    .eq('project_id', tokenRow.project_id)
    .eq('environment', 'production')
    .eq('status', 'succeeded')
    .neq('gate_status', 'inconclusive')
    .order('created_at', { ascending: false })
    .limit(1)
  if (project.baseline_reset_at)
    baselineQuery = baselineQuery.gte('created_at', project.baseline_reset_at)
  const { data: baselineAudit, error: baselineAuditError } = await baselineQuery.maybeSingle()
  if (baselineAuditError)
    return Response.json({ error: 'Could not load the comparison baseline' }, { status: 500 })
  let baseline: AuditFindingInput[] = []
  if (baselineAudit) {
    const { data: occurrences, error: occurrencesError } = await db
      .from('cr_occurrences')
      .select(
        'status,message,cr_findings(normalized_path,rule_slug,title,priority,category,source,occurrence_key)'
      )
      .eq('audit_id', baselineAudit.id)
      .neq('status', 'resolved')
    if (occurrencesError)
      return Response.json({ error: 'Could not load the baseline findings' }, { status: 500 })
    const storedBaseline = (occurrences ?? []).flatMap(occurrence => {
      const relatedFindings = Array.isArray(occurrence.cr_findings)
        ? occurrence.cr_findings
        : [occurrence.cr_findings]
      return relatedFindings.flatMap(finding =>
        finding
          ? [
              {
                pagePath: finding.normalized_path,
                ruleSlug: finding.rule_slug,
                title: finding.title,
                priority: finding.priority,
                message: occurrence.message,
                category: finding.category,
                source: finding.source,
                occurrenceKey: finding.occurrence_key
              }
            ]
          : []
      )
    })
    baseline = filterBaselineForSubmittedPages(storedBaseline, normalizedPages)
  }
  const current = normalizedPages.flatMap(page => page.findings)
  const comparison = compareFindings({
    current,
    baseline,
    currentRulesetVersion: parsed.data.rulesetVersion,
    baselineRulesetVersion: baselineAudit?.ruleset_version,
    unreachablePagePaths: normalizedPages
      .filter(page => !page.reachable)
      .map(page => new URL(page.url).pathname)
  })

  const { error: reservationError } = await db.from('cr_idempotency_keys').insert({
    owner_id: tokenRow.owner_id,
    project_id: tokenRow.project_id,
    key: idempotencyKey,
    response: null
  })
  if (reservationError) {
    const { data: concurrentReplay } = await db
      .from('cr_idempotency_keys')
      .select('response')
      .eq('project_id', tokenRow.project_id)
      .eq('key', idempotencyKey)
      .maybeSingle()
    if (concurrentReplay?.response)
      return Response.json(concurrentReplay.response, {
        headers: { 'x-idempotent-replay': 'true' }
      })
    return Response.json(
      { error: 'A request with this idempotency key is already being processed' },
      { status: 409, headers: { 'retry-after': '2' } }
    )
  }

  let auditId: string
  try {
    auditId = await persistAudit({
      db,
      ownerId: tokenRow.owner_id,
      projectId: tokenRow.project_id,
      environment: parsed.data.environment,
      trigger: parsed.data.trigger,
      rulesetVersion: parsed.data.rulesetVersion,
      baselineAuditId: baselineAudit?.id,
      commitSha: parsed.data.commitSha,
      branch: parsed.data.branch,
      pullRequest: parsed.data.pullRequest,
      comparison,
      pages: normalizedPages,
      startedAt: new Date().toISOString()
    })
  } catch {
    await db
      .from('cr_idempotency_keys')
      .delete()
      .eq('project_id', tokenRow.project_id)
      .eq('key', idempotencyKey)
    return Response.json({ error: 'Could not persist the complete audit' }, { status: 500 })
  }
  const socialImageUrl = await resolveProjectSocialImage(normalizedPages)
  if (socialImageUrl !== undefined)
    await db
      .from('cr_projects')
      .update({ social_image_url: socialImageUrl })
      .eq('id', tokenRow.project_id)
      .eq('owner_id', tokenRow.owner_id)
  await db
    .from('cr_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app'
  const response = {
    runUrl: `${origin}/projects/${tokenRow.project_id}`,
    auditId,
    diff: comparison.counts,
    blockingRegressions: comparison.blockingRegressions,
    qualityGate: comparison.gate,
    coverage: {
      requested: normalizedPages.length,
      checked: normalizedPages.filter(page => page.reachable).length
    }
  }
  await db
    .from('cr_idempotency_keys')
    .update({ response })
    .eq('project_id', tokenRow.project_id)
    .eq('key', idempotencyKey)
  return Response.json(response, { status: 201 })
}
