import { createHash } from 'node:crypto'
import {
  AI_PROMPT_VERSION,
  aiAudienceSchema,
  aiFindingAnalysisSchema,
  buildRuleSnapshot,
  DEFAULT_AI_MODEL
} from '@coderocket/ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const requestSchema = z.object({
  audience: aiAudienceSchema,
  occurrenceId: z.string().uuid(),
  retryId: z.string().uuid().optional()
})

const findingSchema = z.object({
  id: z.string().uuid(),
  rule_slug: z.string().min(1),
  resolved_at: z.string().nullable()
})

const occurrenceSchema = z.object({
  id: z.string().uuid(),
  audit_id: z.string().uuid(),
  status: z.enum(['new', 'persistent', 'resolved'])
})

const auditSchema = z.object({ ruleset_version: z.string().min(1) })

const taskSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  audience: aiAudienceSchema,
  result: aiFindingAnalysisSchema.nullable(),
  error: z.string().nullable(),
  model: z.string(),
  prompt_version: z.string(),
  rule_snapshot: z
    .object({
      sources: z.array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          authority: z.string().optional(),
          role: z.string().optional()
        })
      )
    })
    .passthrough(),
  charged_credits: z.number(),
  job_id: z.string().uuid(),
  created_at: z.string()
})

type RouteContext = {
  params: Promise<{ projectId: string; findingId: string }>
}

/** Return the latest explanation for one exact finding occurrence. */
export async function GET(request: Request, context: RouteContext) {
  const { projectId, findingId } = await context.params
  const occurrenceId = new URL(request.url).searchParams.get('occurrenceId')
  if (!occurrenceId) return errorResponse('Choose a finding occurrence first.', 400)

  const session = await getSession()
  if (!session) return errorResponse('Sign in to use the AI assistant.', 401)
  const ownsFinding = await verifyFindingOwnership(
    session.supabase,
    session.userId,
    projectId,
    findingId,
    occurrenceId
  )
  if (!ownsFinding) return errorResponse('This finding is unavailable.', 404)

  const { data, error } = await session.supabase
    .from('cr_ai_tasks')
    .select(
      'id,status,audience,result,error,model,prompt_version,rule_snapshot,charged_credits,job_id,created_at'
    )
    .eq('owner_id', session.userId)
    .eq('project_id', projectId)
    .eq('finding_id', findingId)
    .eq('occurrence_id', occurrenceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return errorResponse('The saved explanation could not be loaded.', 500)
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    task: data ? await serializeTask(session.supabase, session.userId, data) : null
  })
}

/** Reserve usage and queue a traceable explanation for one finding occurrence. */
export async function POST(request: Request, context: RouteContext) {
  if (!process.env.OPENAI_API_KEY)
    return errorResponse('The AI assistant is not configured on this deployment yet.', 503)
  const parsedBody = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) return errorResponse('Choose who this explanation is for.', 400)

  const { projectId, findingId } = await context.params
  const session = await getSession()
  if (!session) return errorResponse('Sign in to use the AI assistant.', 401)
  const contextData = await loadFindingContext(
    session.supabase,
    session.userId,
    projectId,
    findingId,
    parsedBody.data.occurrenceId
  )
  if (!contextData) return errorResponse('This open finding is unavailable.', 404)

  const rule = buildRuleSnapshot(contextData.ruleSlug, contextData.rulesetVersion)
  const model = process.env.CODEROCKET_AI_MODEL ?? DEFAULT_AI_MODEL
  const requestKey = createHash('sha256')
    .update(
      [
        session.userId,
        projectId,
        findingId,
        parsedBody.data.occurrenceId,
        parsedBody.data.audience,
        rule.ruleHash,
        AI_PROMPT_VERSION,
        model,
        parsedBody.data.retryId ?? 'initial'
      ].join(':')
    )
    .digest('hex')
  const { data: taskId, error } = await session.supabase.rpc('cr_request_ai_analysis', {
    p_project_id: projectId,
    p_finding_id: findingId,
    p_occurrence_id: parsedBody.data.occurrenceId,
    p_request_key: requestKey,
    p_audience: parsedBody.data.audience,
    p_ruleset_version: contextData.rulesetVersion,
    p_rule_slug: contextData.ruleSlug,
    p_rule_hash: rule.ruleHash,
    p_rule_snapshot: rule,
    p_prompt_version: AI_PROMPT_VERSION,
    p_model: model
  })
  if (error) {
    const limited = error.message.includes('AI credit limit reached')
    return errorResponse(
      limited
        ? 'Your included AI usage is reserved or used for this month.'
        : 'The explanation could not be queued.',
      limited ? 429 : 500
    )
  }

  const { data: task, error: taskError } = await session.supabase
    .from('cr_ai_tasks')
    .select(
      'id,status,audience,result,error,model,prompt_version,rule_snapshot,charged_credits,job_id,created_at'
    )
    .eq('id', taskId)
    .eq('owner_id', session.userId)
    .single()
  if (taskError) return errorResponse('The explanation was queued but could not be loaded.', 500)
  return NextResponse.json(
    { configured: true, task: await serializeTask(session.supabase, session.userId, task) },
    { status: 202 }
  )
}

async function getSession() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user ? { supabase, userId: data.user.id } : null
}

async function verifyFindingOwnership(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  projectId: string,
  findingId: string,
  occurrenceId: string
) {
  const { data } = await supabase
    .from('cr_occurrences')
    .select('id,cr_findings!inner(id,project_id,owner_id)')
    .eq('id', occurrenceId)
    .eq('finding_id', findingId)
    .eq('owner_id', userId)
    .eq('cr_findings.project_id', projectId)
    .eq('cr_findings.owner_id', userId)
    .maybeSingle()
  return Boolean(data)
}

async function loadFindingContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  projectId: string,
  findingId: string,
  occurrenceId: string
) {
  const [{ data: rawFinding }, { data: rawOccurrence }] = await Promise.all([
    supabase
      .from('cr_findings')
      .select('id,rule_slug,resolved_at')
      .eq('id', findingId)
      .eq('project_id', projectId)
      .eq('owner_id', userId)
      .maybeSingle(),
    supabase
      .from('cr_occurrences')
      .select('id,audit_id,status')
      .eq('id', occurrenceId)
      .eq('finding_id', findingId)
      .eq('owner_id', userId)
      .maybeSingle()
  ])
  const finding = findingSchema.safeParse(rawFinding)
  const occurrence = occurrenceSchema.safeParse(rawOccurrence)
  if (!(finding.success && occurrence.success)) return null
  if (finding.data.resolved_at || occurrence.data.status === 'resolved') return null

  const { data: rawAudit } = await supabase
    .from('cr_audits')
    .select('ruleset_version')
    .eq('id', occurrence.data.audit_id)
    .eq('project_id', projectId)
    .eq('owner_id', userId)
    .maybeSingle()
  const audit = auditSchema.safeParse(rawAudit)
  return audit.success
    ? { ruleSlug: finding.data.rule_slug, rulesetVersion: audit.data.ruleset_version }
    : null
}

async function serializeTask(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  value: unknown
) {
  const task = taskSchema.parse(value)
  const { data: job } = await supabase
    .from('cr_jobs')
    .select('progress_stage,progress_message')
    .eq('id', task.job_id)
    .eq('owner_id', userId)
    .maybeSingle()
  return {
    id: task.id,
    status: task.status,
    audience: task.audience,
    result: task.result,
    error: task.error,
    model: task.model,
    promptVersion: task.prompt_version,
    sources: task.rule_snapshot.sources,
    chargedCredits: task.charged_credits,
    progressStage: job?.progress_stage ?? 'queued',
    progressMessage: job?.progress_message ?? 'Waiting for the secure worker',
    createdAt: task.created_at
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
