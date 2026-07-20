import { createHash } from 'node:crypto'
import {
  DEFAULT_SITE_EDIT_MODEL,
  OpenAiSiteEditProvider,
  SITE_EDIT_MAX_OUTPUT_TOKENS
} from '@coderocket/ai'
import { applySiteEditPlan, siteDocumentSchema, siteEditSelectionSchema } from '@coderocket/core'
import { createServiceClient } from '@coderocket/db'
import { z } from 'zod'
import type { WorkerJob } from './audit-job'
import { estimateVisualAiCostMicroeur } from './site-import-job'

const SITE_EDIT_MAX_INPUT_TOKENS = 35_000
const FAILED_SITE_EDIT_COST_MICROEUR = 150_000
const pricingSchema = z.object({
  cached_input_microusd_per_million: z.number().nonnegative(),
  input_microusd_per_million: z.number().nonnegative(),
  output_microusd_per_million: z.number().nonnegative()
})

/** Turn one durable plain-language request into a new immutable private website version. */
export async function processSiteEditJob(job: WorkerJob): Promise<void> {
  if (!job.builder_site_id) throw new Error('Website edit job has no website')
  const messageId = String(job.payload.messageId ?? '')
  if (!messageId) throw new Error('Website edit job has no request')
  const db = createServiceClient()
  const [{ data: completed }, { data: message }, { data: revision }] = await Promise.all([
    db
      .from('cr_builder_messages')
      .select('id')
      .eq('job_id', job.id)
      .eq('role', 'assistant')
      .maybeSingle(),
    db
      .from('cr_builder_messages')
      .select('content,selection')
      .eq('id', messageId)
      .eq('site_id', job.builder_site_id)
      .eq('owner_id', job.owner_id)
      .eq('role', 'user')
      .maybeSingle(),
    db
      .from('cr_site_revisions')
      .select('site_document')
      .eq('site_id', job.builder_site_id)
      .eq('owner_id', job.owner_id)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])
  if (completed) return
  if (!message?.content) throw new Error('Website change request is unavailable')
  const selection = siteEditSelectionSchema.safeParse(message.selection)
  const document = siteDocumentSchema.parse(revision?.site_document)
  const estimatedInputTokens = Math.ceil(
    (JSON.stringify(document).length +
      JSON.stringify(selection.success ? selection.data : {}).length +
      message.content.length +
      4_000) /
      3
  )
  if (estimatedInputTokens > SITE_EDIT_MAX_INPUT_TOKENS)
    throw new Error('This website needs a smaller, more focused change')
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('The website editing service is unavailable')
  const model =
    process.env.CODEROCKET_SITE_EDIT_MODEL ??
    process.env.CODEROCKET_AI_MODEL ??
    DEFAULT_SITE_EDIT_MODEL
  const { data: pricing, error: pricingError } = await db
    .from('cr_ai_model_pricing')
    .select(
      'input_microusd_per_million,cached_input_microusd_per_million,output_microusd_per_million'
    )
    .eq('model', model)
    .eq('active', true)
    .maybeSingle()
  if (pricingError) throw new Error(pricingError.message)
  const parsedPricing = pricingSchema.parse(pricing)
  const maximumCost = estimateVisualAiCostMicroeur(parsedPricing, {
    cachedInputTokens: 0,
    inputTokens: SITE_EDIT_MAX_INPUT_TOKENS,
    outputTokens: SITE_EDIT_MAX_OUTPUT_TOKENS,
    reasoningTokens: 0,
    totalTokens: SITE_EDIT_MAX_INPUT_TOKENS + SITE_EDIT_MAX_OUTPUT_TOKENS
  })
  if (maximumCost > FAILED_SITE_EDIT_COST_MICROEUR)
    throw new Error('The selected editing model exceeds the protected credit budget')

  await Promise.all([
    db.from('cr_builder_messages').update({ status: 'working' }).eq('id', messageId),
    db
      .from('cr_jobs')
      .update({
        progress_stage: 'starting',
        progress_message: 'Understanding the change you want',
        progress_updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('owner_id', job.owner_id)
  ])
  const provider = new OpenAiSiteEditProvider({ apiKey, model })
  const result = await provider.edit({
    document,
    instruction: message.content,
    ...(selection.success ? { selection: selection.data } : {}),
    idempotencyKey: `coderocket-site-edit-${job.id}`,
    safetyIdentifier: createHash('sha256').update(job.owner_id).digest('hex')
  })
  const nextDocument = applySiteEditPlan(document, result.plan)
  const actualCost = estimateVisualAiCostMicroeur(parsedPricing, result.usage)
  const { error: settlementError } = await db.rpc('cr_settle_site_edit', {
    p_site_id: job.builder_site_id,
    p_job_id: job.id,
    p_succeeded: true,
    p_site_document: nextDocument,
    p_provider_cost_microeur: actualCost,
    p_reply: result.plan.response,
    p_error: ''
  })
  if (settlementError) throw new Error(settlementError.message)
  await db
    .from('cr_jobs')
    .update({
      progress_stage: 'completed',
      progress_message: 'Your private version is ready to review',
      progress_updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
}

/** Close one terminal edit safely, preserve the previous revision, and return visible credits. */
export async function failSiteEditJob(job: WorkerJob, errorMessage: string): Promise<void> {
  if (!job.builder_site_id) return
  const { error } = await createServiceClient().rpc('cr_settle_site_edit', {
    p_site_id: job.builder_site_id,
    p_job_id: job.id,
    p_succeeded: false,
    p_site_document: {},
    p_provider_cost_microeur: FAILED_SITE_EDIT_COST_MICROEUR,
    p_reply: '',
    p_error: errorMessage
  })
  if (error) throw new Error(error.message)
}
