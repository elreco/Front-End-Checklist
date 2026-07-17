import { createHash } from 'node:crypto'
import { buildRuleSnapshot, DEFAULT_AI_MODEL, OpenAiFindingAnalysisProvider } from '@coderocket/ai'
import { createServiceClient } from '@coderocket/db'
import { z } from 'zod'
import type { WorkerJob } from './audit-job'

const taskSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  audience: z.enum(['site_owner', 'freelancer', 'developer']),
  ruleset_version: z.string().min(1),
  rule_slug: z.string().min(1),
  rule_hash: z.string().length(64),
  model: z.string().min(1),
  finding_id: z.string().uuid(),
  occurrence_id: z.string().uuid()
})

const findingSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  normalized_path: z.string(),
  category: z.string().nullable(),
  rule_slug: z.string()
})

const occurrenceSchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  evidence: z
    .object({
      kind: z.string().optional(),
      summary: z.string().optional(),
      observed: z.string().optional(),
      expected: z.string().optional()
    })
    .passthrough()
    .nullable()
})

/** Update the durable status text shown while an explanation is prepared. */
async function updateAiProgress(
  job: WorkerJob,
  stage: 'starting' | 'checking_pages' | 'saving' | 'completed',
  message: string
) {
  const { error } = await createServiceClient()
    .from('cr_jobs')
    .update({
      progress_stage: stage,
      progress_message: message,
      progress_updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
  if (error) throw new Error(error.message)
}

/** Read and validate all deterministic context for one AI explanation. */
async function loadAnalysisContext(job: WorkerJob, taskId: string) {
  const db = createServiceClient()
  const taskResult = await db
    .from('cr_ai_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('owner_id', job.owner_id)
    .single()
  if (taskResult.error) throw new Error(taskResult.error.message)
  const task = taskSchema.parse(taskResult.data)
  if (task.status === 'succeeded') return { task, finding: null, occurrence: null }

  const findingResult = await db
    .from('cr_findings')
    .select('id,title,priority,normalized_path,category,rule_slug')
    .eq('id', task.finding_id)
    .eq('owner_id', job.owner_id)
    .single()
  if (findingResult.error) throw new Error(findingResult.error.message)
  const { data: occurrenceData, error: occurrenceError } = await db
    .from('cr_occurrences')
    .select('id,message,evidence')
    .eq('id', task.occurrence_id)
    .eq('owner_id', job.owner_id)
    .single()
  if (occurrenceError) throw new Error(occurrenceError.message)

  return {
    task,
    finding: findingSchema.parse(findingResult.data),
    occurrence: occurrenceSchema.parse(occurrenceData)
  }
}

/** Atomically enqueue billable usage once included credits are exhausted. */
async function prepareUsageBilling(taskId: string) {
  const { error } = await createServiceClient().rpc('cr_prepare_ai_usage_billing', {
    p_task_id: taskId
  })
  if (error) throw new Error(error.message)
}

/** Generate and settle one idempotent, evidence-grounded finding explanation. */
export async function processAiAnalysisJob(job: WorkerJob): Promise<void> {
  const taskId = typeof job.payload.taskId === 'string' ? job.payload.taskId : ''
  if (!taskId) throw new Error('AI analysis job has no task identifier')
  const context = await loadAnalysisContext(job, taskId)
  if (context.task.status === 'succeeded') {
    await prepareUsageBilling(taskId)
    return
  }
  if (!(context.finding && context.occurrence)) throw new Error('AI analysis context is incomplete')

  const db = createServiceClient()
  const { error: runningError } = await db
    .from('cr_ai_tasks')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .in('status', ['queued', 'running'])
  if (runningError) throw new Error(runningError.message)
  await updateAiProgress(job, 'starting', 'Reading the verified finding and its rule')

  const rule = buildRuleSnapshot(context.task.rule_slug, context.task.ruleset_version)
  if (rule.ruleHash !== context.task.rule_hash)
    throw new Error('The stored rule snapshot does not match the active rule corpus')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  await updateAiProgress(job, 'checking_pages', 'Preparing a clear explanation and fix plan')
  const provider = new OpenAiFindingAnalysisProvider({
    apiKey,
    model: process.env.CODEROCKET_AI_MODEL ?? context.task.model ?? DEFAULT_AI_MODEL
  })
  const evidence = context.occurrence.evidence
  const result = await provider.analyze({
    finding: {
      findingId: context.finding.id,
      title: context.finding.title,
      message: context.occurrence.message,
      priority: context.finding.priority,
      pagePath: context.finding.normalized_path,
      ...(context.finding.category ? { category: context.finding.category } : {}),
      ruleSlug: context.finding.rule_slug,
      ...(evidence?.summary
        ? {
            evidence: {
              kind: evidence.kind ?? 'html',
              summary: evidence.summary,
              ...(evidence.observed ? { observed: evidence.observed } : {}),
              ...(evidence.expected ? { expected: evidence.expected } : {})
            }
          }
        : {})
    },
    rule,
    idempotencyKey: `coderocket-ai-${taskId}`,
    safetyIdentifier: createHash('sha256').update(job.owner_id).digest('hex')
  })

  await updateAiProgress(job, 'saving', 'Saving the explanation with its sources')
  const { error } = await db.rpc('cr_settle_ai_analysis', {
    p_task_id: taskId,
    p_succeeded: true,
    p_result: result.analysis,
    p_provider_response_id: result.providerResponseId,
    p_input_tokens: result.usage.inputTokens,
    p_cached_input_tokens: result.usage.cachedInputTokens,
    p_output_tokens: result.usage.outputTokens,
    p_reasoning_tokens: result.usage.reasoningTokens,
    p_error: null
  })
  if (error) throw new Error(error.message)
  await prepareUsageBilling(taskId)
  await updateAiProgress(job, 'completed', 'Explanation ready')
}

/** Release a reservation after the queue exhausts all retries. */
export async function failAiAnalysisJob(job: WorkerJob, message: string): Promise<void> {
  const taskId = typeof job.payload.taskId === 'string' ? job.payload.taskId : ''
  if (!taskId) return
  const { error } = await createServiceClient().rpc('cr_settle_ai_analysis', {
    p_task_id: taskId,
    p_succeeded: false,
    p_result: null,
    p_provider_response_id: null,
    p_input_tokens: 0,
    p_cached_input_tokens: 0,
    p_output_tokens: 0,
    p_reasoning_tokens: 0,
    p_error: message
  })
  if (error) throw new Error(error.message)
}
