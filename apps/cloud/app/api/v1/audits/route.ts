import { createHash } from 'node:crypto'
import {
  type AuditFindingInput,
  auditSubmissionSchema,
  compareFindings,
  getPlanEntitlements,
  type PlanId
} from '@coderocket/core'
import { createServiceClient } from '@coderocket/db'

export const runtime = 'nodejs'
const MAX_BODY_BYTES = 5 * 1024 * 1024

function unauthorized(message: string) {
  return Response.json({ error: message }, { status: 401 })
}

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

  const db = createServiceClient()
  const token = authorization.slice('Bearer '.length)
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data: tokenRow } = await db
    .from('cr_api_tokens')
    .select('id,owner_id,project_id,revoked_at,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
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

  const { data: subscription } = await db
    .from('cr_subscriptions')
    .select('plan_id,status,grace_period_end,current_period_end')
    .eq('owner_id', tokenRow.owner_id)
    .maybeSingle()
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
  if (parsed.data.pages.length > limits.pagesPerProject)
    return Response.json(
      { error: `${plan} allows ${limits.pagesPerProject} pages per audit` },
      { status: 429 }
    )
  const monthStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  ).toISOString()
  const { count: usedRuns } = await db
    .from('cr_audits')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', tokenRow.owner_id)
    .in('trigger', ['manual', 'ci'])
    .gte('created_at', monthStart)
  if ((usedRuns ?? 0) >= limits.onDemandRunsPerMonth)
    return Response.json({ error: 'Monthly manual/CI run quota reached' }, { status: 429 })

  const { data: baselineAudit } = await db
    .from('cr_audits')
    .select('id,ruleset_version')
    .eq('project_id', tokenRow.project_id)
    .eq('environment', 'production')
    .eq('status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  let baseline: AuditFindingInput[] = []
  if (baselineAudit) {
    const { data: occurrences } = await db
      .from('cr_occurrences')
      .select('status,message,cr_findings(normalized_path,rule_slug,title,priority)')
      .eq('audit_id', baselineAudit.id)
      .neq('status', 'resolved')
    baseline = (occurrences ?? []).flatMap(occurrence =>
      occurrence.cr_findings.map(finding => ({
        pagePath: finding.normalized_path,
        ruleSlug: finding.rule_slug,
        title: finding.title,
        priority: finding.priority,
        message: occurrence.message
      }))
    )
  }
  const current = parsed.data.pages.flatMap(page => page.findings)
  const comparison = compareFindings({
    current,
    baseline,
    currentRulesetVersion: parsed.data.rulesetVersion,
    baselineRulesetVersion: baselineAudit?.ruleset_version,
    unreachablePagePaths: parsed.data.pages
      .filter(page => !page.reachable)
      .map(page => new URL(page.url).pathname)
  })
  const { data: audit, error: auditError } = await db
    .from('cr_audits')
    .insert({
      owner_id: tokenRow.owner_id,
      project_id: tokenRow.project_id,
      environment: parsed.data.environment,
      trigger: parsed.data.trigger,
      status: 'succeeded',
      gate_status: comparison.gate,
      ruleset_version: parsed.data.rulesetVersion,
      baseline_audit_id: baselineAudit?.id,
      commit_sha: parsed.data.commitSha,
      branch: parsed.data.branch,
      pull_request: parsed.data.pullRequest,
      new_count: comparison.counts.new,
      persistent_count: comparison.counts.persistent,
      resolved_count: comparison.counts.resolved,
      blocking_count: comparison.blockingRegressions,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single()
  if (auditError) return Response.json({ error: 'Could not persist the audit' }, { status: 500 })
  await db.from('cr_audit_pages').insert(
    parsed.data.pages.map(page => ({
      owner_id: tokenRow.owner_id,
      audit_id: audit.id,
      url: page.url,
      normalized_path: new URL(page.url).pathname,
      reachable: page.reachable,
      error: page.error
    }))
  )
  for (const finding of comparison.findings) {
    const { data: existing } = await db
      .from('cr_findings')
      .select('id')
      .eq('project_id', tokenRow.project_id)
      .eq('fingerprint', finding.fingerprint)
      .maybeSingle()
    const findingValues = {
      normalized_path: finding.pagePath,
      rule_slug: finding.ruleSlug,
      title: finding.title,
      priority: finding.priority,
      last_seen_audit_id: audit.id,
      resolved_at: finding.status === 'resolved' ? new Date().toISOString() : null
    }
    const { data: stored } = existing
      ? await db
          .from('cr_findings')
          .update(findingValues)
          .eq('id', existing.id)
          .select('id')
          .single()
      : await db
          .from('cr_findings')
          .insert({
            owner_id: tokenRow.owner_id,
            project_id: tokenRow.project_id,
            fingerprint: finding.fingerprint,
            first_seen_audit_id: audit.id,
            ...findingValues
          })
          .select('id')
          .single()
    if (stored)
      await db.from('cr_occurrences').insert({
        owner_id: tokenRow.owner_id,
        audit_id: audit.id,
        finding_id: stored.id,
        status: finding.status,
        message: finding.message
      })
  }
  await db
    .from('cr_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coderocket.app'
  const response = {
    runUrl: `${origin}/audits/${audit.id}`,
    auditId: audit.id,
    diff: comparison.counts,
    blockingRegressions: comparison.blockingRegressions,
    qualityGate: comparison.gate
  }
  await db.from('cr_idempotency_keys').insert({
    owner_id: tokenRow.owner_id,
    project_id: tokenRow.project_id,
    key: idempotencyKey,
    response
  })
  return Response.json(response, { status: 201 })
}
