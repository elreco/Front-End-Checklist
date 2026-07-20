import { z } from 'zod'

const studioIterationProgressRowSchema = z.object({
  created_at: z.string(),
  progress_current: z.number().nonnegative().nullable().optional(),
  progress_message: z.string().nullable().optional(),
  progress_stage: z
    .enum(['queued', 'starting', 'comparing', 'checking_pages', 'saving', 'retrying', 'completed'])
    .nullable()
    .optional(),
  progress_total: z.number().nonnegative().nullable().optional(),
  progress_updated_at: z.string().nullable().optional(),
  status: z.enum(['queued', 'working', 'completed', 'failed'])
})

export type StudioIterationStage = NonNullable<
  z.infer<typeof studioIterationProgressRowSchema>['progress_stage']
>

export interface StudioIterationProgress {
  createdAt: string
  current: number
  message: string
  stage: StudioIterationStage
  status: 'queued' | 'working' | 'completed' | 'failed'
  total: number
  updatedAt: string
}

export interface StudioIterationContext {
  attachmentCount: number
  selectionLabel?: string
}

/** Accept only the owner-safe iteration status fields exposed by a conversation row. */
export function parseStudioIterationProgress(value: unknown): StudioIterationProgress | undefined {
  const parsed = studioIterationProgressRowSchema.safeParse(value)
  if (!parsed.success || !parsed.data.progress_stage) return undefined
  return {
    createdAt: parsed.data.created_at,
    current: parsed.data.progress_current ?? 0,
    message:
      parsed.data.progress_message ?? studioIterationStageMessage(parsed.data.progress_stage),
    stage: parsed.data.progress_stage,
    status: parsed.data.status,
    total:
      parsed.data.progress_total && parsed.data.progress_total > 0 ? parsed.data.progress_total : 5,
    updatedAt: parsed.data.progress_updated_at ?? parsed.data.created_at
  }
}

/** Locate the current plain-language milestone without pretending the steps take equal time. */
export function studioIterationStepIndex(progress: StudioIterationProgress): number {
  if (progress.status === 'completed' || progress.status === 'failed') return 5
  if (progress.stage === 'starting') return 1
  if (progress.stage === 'comparing') return 2
  if (progress.stage === 'checking_pages') return 3
  if (progress.stage === 'saving') return 4
  if (progress.stage === 'completed') return 5
  if (progress.stage === 'retrying') return Math.min(Math.max(progress.current, 0), 4)
  return 0
}

/** Explain what the current milestone means in language suitable for non-developers. */
export function studioIterationGuidance(
  progress: StudioIterationProgress,
  context: StudioIterationContext,
  delayed: boolean
): string {
  if (progress.status === 'failed')
    return 'Your current website is unchanged. Any reserved credits will be returned automatically.'
  if (progress.status === 'completed' || progress.stage === 'completed')
    return 'The new private version is ready to review. Nothing has been published automatically.'
  if (progress.stage === 'retrying')
    return 'A temporary problem interrupted this attempt. Your request is safe and CodeRocket will try again automatically.'
  if (delayed)
    return 'Your change is still waiting to start. It is saved and will begin automatically.'
  if (progress.stage === 'starting') {
    if (context.selectionLabel)
      return `CodeRocket is reading your request and focusing on “${context.selectionLabel}”.`
    if (context.attachmentCount > 0)
      return `CodeRocket is reading your request and the ${context.attachmentCount} reference file${context.attachmentCount === 1 ? '' : 's'} you attached.`
    return 'CodeRocket is reading your request alongside the current version of your website.'
  }
  if (progress.stage === 'comparing')
    return 'CodeRocket is identifying the pages and visible elements that need to change.'
  if (progress.stage === 'checking_pages')
    return 'The requested result is being applied while unrelated content stays unchanged.'
  if (progress.stage === 'saving')
    return 'CodeRocket is checking the result and saving it as a new private version.'
  return 'Your request is saved. You can leave this page without stopping the work.'
}

/** Detect a request that has remained queued long enough to deserve clearer reassurance. */
export function studioIterationIsDelayed(progress: StudioIterationProgress, now: number): boolean {
  if (progress.stage !== 'queued' || progress.status !== 'queued') return false
  return now - new Date(progress.updatedAt).getTime() > 15_000
}

function studioIterationStageMessage(stage: StudioIterationStage): string {
  if (stage === 'starting') return 'Reading your request and current website'
  if (stage === 'comparing') return 'Preparing the clearest way to make this change'
  if (stage === 'checking_pages') return 'Updating the relevant parts of your website'
  if (stage === 'saving') return 'Checking the result and saving your new version'
  if (stage === 'retrying') return 'Your request is safe and will continue automatically'
  if (stage === 'completed') return 'Your new private version is ready'
  return 'Your change is safely waiting'
}
