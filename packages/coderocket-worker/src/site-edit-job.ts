import { createHash } from 'node:crypto'
import {
  DEFAULT_SITE_EDIT_MODEL,
  OpenAiSiteEditProvider,
  SITE_EDIT_MAX_OUTPUT_TOKENS
} from '@coderocket/ai'
import {
  applySiteEditPlan,
  type SiteConnectionContext,
  type SiteEditPlan,
  siteDocumentSchema,
  siteEditSelectionSchema
} from '@coderocket/core'
import { createServiceClient } from '@coderocket/db'
import { z } from 'zod'
import type { WorkerJob } from './audit-job'
import { assertJobActive } from './job-cancellation'
import { loadSiteEditAttachments, resolveSiteEditAttachmentImages } from './site-edit-attachments'
import { estimateVisualAiCostMicroeur } from './site-import-cost'

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
  const [{ data: completed }, { data: message }, { data: revision }, { data: connectionRows }] =
    await Promise.all([
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
        .maybeSingle(),
      db
        .from('cr_builder_connections')
        .select('provider,status,display_name,public_config')
        .eq('site_id', job.builder_site_id)
        .eq('owner_id', job.owner_id)
    ])
  if (completed) return
  if (!message?.content) throw new Error('Website change request is unavailable')
  const selection = siteEditSelectionSchema.safeParse(message.selection)
  const document = siteDocumentSchema.parse(revision?.site_document)
  const connections = readConnectionContexts(connectionRows ?? [])
  const attachments = await loadSiteEditAttachments(
    db,
    job.owner_id,
    job.builder_site_id,
    messageId
  )
  const estimatedInputTokens = Math.ceil(
    (JSON.stringify(document).length +
      JSON.stringify(selection.success ? selection.data : {}).length +
      message.content.length +
      attachments.reduce((total, attachment) => total + attachment.bytes.byteLength / 8, 0) +
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

  await assertJobActive(job)
  await db.from('cr_builder_messages').update({ status: 'working' }).eq('id', messageId)
  await db
    .from('cr_jobs')
    .update({
      progress_stage: 'starting',
      progress_message: 'Understanding the change you want',
      progress_updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
  const provider = new OpenAiSiteEditProvider({ apiKey, model })
  const result = await provider.edit({
    connections,
    document,
    instruction: message.content,
    attachments: attachments.map(attachment => attachment.input),
    ...(selection.success ? { selection: selection.data } : {}),
    idempotencyKey: `coderocket-site-edit-${job.id}`,
    safetyIdentifier: createHash('sha256').update(job.owner_id).digest('hex')
  })
  await assertJobActive(job)
  const resolvedPlan = await resolveSiteEditAttachmentImages(
    db,
    result.plan,
    attachments,
    job.owner_id,
    job.builder_site_id
  )
  await assertJobActive(job)
  const nextDocument = applySiteEditPlan(document, resolvedPlan)
  await persistConnectionRequests(db, job, connectionRows ?? [], resolvedPlan)
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

/** Convert owner-safe connector rows into the small capability receipt the AI may use. */
function readConnectionContexts(
  rows: Array<{
    provider: string
    public_config: unknown
    status: string
  }>
): SiteConnectionContext[] {
  return rows.flatMap(row => {
    const config = readPublicConfig(row.public_config)
    const provider = readProvider(row.provider)
    if (!provider) return []
    const capability = readCapability(config.capability, provider)
    const status =
      row.status === 'setup' || row.status === 'connected' || row.status === 'attention'
        ? row.status
        : 'available'
    const mode =
      config.mode === 'account' || config.mode === 'managed' || config.mode === 'link'
        ? config.mode
        : provider === 'coderocket_data'
          ? 'managed'
          : 'link'
    return [
      {
        capability,
        mode,
        provider,
        status,
        ...(typeof config.url === 'string' && config.url.startsWith('https://')
          ? { publicUrl: config.url }
          : {}),
        ...(typeof config.accountId === 'string' ? { accountId: config.accountId } : {}),
        ...(typeof config.defaultCurrency === 'string'
          ? { defaultCurrency: config.defaultCurrency }
          : {})
      }
    ]
  })
}

/** Persist only setup requests; an existing working account is never downgraded by a prompt. */
async function persistConnectionRequests(
  db: ReturnType<typeof createServiceClient>,
  job: WorkerJob,
  rows: Array<{ provider: string; public_config: unknown; status: string }>,
  plan: SiteEditPlan
) {
  const requests = plan.operations.filter(operation => operation.type === 'request_connection')
  for (const request of requests) {
    const existing = rows.find(row => row.provider === request.provider)
    if (existing?.status === 'connected') continue
    const publicConfig = readPublicConfig(existing?.public_config)
    const { error } = await db.from('cr_builder_connections').upsert(
      {
        owner_id: job.owner_id,
        site_id: job.builder_site_id,
        provider: request.provider,
        status: request.provider === 'coderocket_data' ? 'connected' : 'setup',
        display_name: connectionDisplayName(request.provider),
        public_config: {
          ...publicConfig,
          capability: request.capability,
          mode: request.provider === 'coderocket_data' ? 'managed' : 'link',
          requestedBy: 'prompt',
          placement: {
            ...(request.pagePath ? { pagePath: request.pagePath } : {}),
            ...(request.sectionId ? { sectionId: request.sectionId } : {}),
            ...(request.itemId ? { itemId: request.itemId } : {})
          }
        },
        updated_at: new Date().toISOString()
      },
      { onConflict: 'site_id,provider' }
    )
    if (error) throw new Error(error.message)
  }
}

/** Preserve only object-shaped public connector metadata read from the database. */
function readPublicConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}
}

/** Narrow stored provider values to integrations understood by the editor. */
function readProvider(value: string): SiteConnectionContext['provider'] | undefined {
  if (
    value === 'coderocket_data' ||
    value === 'stripe' ||
    value === 'calendly' ||
    value === 'shopify' ||
    value === 'supabase'
  )
    return value
  return undefined
}

/** Resolve a safe default capability when an older connector row has no explicit value. */
function readCapability(
  value: unknown,
  provider: SiteConnectionContext['provider']
): SiteConnectionContext['capability'] {
  if (
    value === 'data' ||
    value === 'payments' ||
    value === 'bookings' ||
    value === 'commerce' ||
    value === 'accounts'
  )
    return value
  if (provider === 'stripe') return 'payments'
  if (provider === 'calendly') return 'bookings'
  if (provider === 'shopify') return 'commerce'
  return 'data'
}

/** Keep provider names readable in the novice-facing connection panel. */
function connectionDisplayName(provider: SiteConnectionContext['provider']): string {
  if (provider === 'stripe') return 'Stripe'
  if (provider === 'calendly') return 'Bookings'
  if (provider === 'coderocket_data') return 'CodeRocket Data'
  if (provider === 'shopify') return 'Shopify'
  return 'Supabase'
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
