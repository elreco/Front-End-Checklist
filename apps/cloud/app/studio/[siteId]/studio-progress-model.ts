import { z } from 'zod'

const studioImportEventSchema = z.object({
  id: z.string(),
  key: z.string(),
  kind: z.enum(['queued', 'progress', 'capture', 'ai', 'page', 'warning', 'completed', 'failed']),
  title: z.string(),
  detail: z.string().nullable().optional(),
  progress: z.number().min(0).max(100),
  artifactKind: z.enum(['desktop', 'figma', 'mobile']).nullable().optional(),
  artifactUrl: z.string().url().optional(),
  createdAt: z.string()
})

const studioImportProgressSchema = z.object({
  status: z.enum(['queued', 'analyzing', 'ready', 'failed', 'published', 'cancelled']),
  message: z.string().nullable().optional(),
  stage: z.enum([
    'queued',
    'starting',
    'checking_pages',
    'comparing',
    'saving',
    'retrying',
    'completed'
  ]),
  current: z.number().nonnegative(),
  total: z.number().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  attempts: z.number().nonnegative(),
  workerAvailable: z.boolean(),
  events: z.array(studioImportEventSchema)
})

export type StudioImportEvent = z.infer<typeof studioImportEventSchema>
export type StudioImportProgress = z.infer<typeof studioImportProgressSchema>

/** Accept only the bounded owner-visible progress shape returned by the Studio route. */
export function parseStudioImportProgress(value: unknown): StudioImportProgress | undefined {
  const parsed = studioImportProgressSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** Derive one stable percentage even before the first durable activity event arrives. */
export function studioProgressPercent(progress: StudioImportProgress): number {
  if (
    progress.status === 'ready' ||
    progress.status === 'published' ||
    progress.status === 'failed' ||
    progress.status === 'cancelled'
  )
    return 100
  const latest = progress.events.at(-1)
  if (latest) return latest.progress
  if (progress.stage === 'starting') return 8
  if (progress.stage === 'checking_pages') return 22
  if (progress.stage === 'comparing') return 45
  if (progress.stage === 'saving') return 94
  if (progress.stage === 'completed') return 100
  return 3
}

/** Detect a queued request whose worker signal is late without mislabelling active long work. */
export function studioQueueIsDelayed(progress: StudioImportProgress, now: number): boolean {
  if (progress.status !== 'queued' || progress.workerAvailable) return false
  return now - new Date(progress.updatedAt).getTime() > 15_000
}

/** Explain the current milestone in plain language without inventing a completion estimate. */
export function studioProgressGuidance(
  progress: StudioImportProgress,
  elapsedMilliseconds: number,
  sourceType: 'figma' | 'website' = 'website'
): string {
  if (progress.stage === 'retrying')
    return 'No action is needed. CodeRocket will continue from the saved request automatically.'
  if (progress.stage === 'queued' || progress.stage === 'starting')
    return 'The request is saved. You can leave this page without stopping the work.'
  if (progress.stage === 'checking_pages' && progress.current === 0) {
    if (sourceType === 'figma')
      return progress.total > 1
        ? `CodeRocket is reading the ${progress.total} selected screens and their structured Figma layers.`
        : 'CodeRocket is reading the selected screen and its structured Figma layers.'
    const remaining = Math.max(0, progress.total - 1)
    return remaining > 0
      ? `The first screen is checked on computer and phone. The other ${remaining} page${remaining === 1 ? '' : 's'} will follow.`
      : 'The first screen is being checked on computer and phone before it is rebuilt.'
  }
  if (progress.stage === 'checking_pages' && progress.total > 0)
    return `${Math.min(progress.current, progress.total)} of ${progress.total} ${sourceType === 'figma' ? 'screens' : 'pages'} rebuilt. Each finished page is saved as the work continues.`
  if (progress.stage === 'comparing')
    return elapsedMilliseconds > 60_000
      ? 'Visual and animated websites can take a few minutes here. CodeRocket is still working.'
      : 'CodeRocket is turning the colours, type, spacing, and layout into an editable design.'
  if (progress.stage === 'saving')
    return 'The last checks are running now. Your private preview is almost ready.'
  return 'You can leave this page. The work continues safely in the background.'
}
