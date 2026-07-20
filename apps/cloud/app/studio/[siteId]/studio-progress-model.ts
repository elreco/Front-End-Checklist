import { z } from 'zod'

const studioImportEventSchema = z.object({
  id: z.string(),
  key: z.string(),
  kind: z.enum(['queued', 'progress', 'capture', 'ai', 'page', 'warning', 'completed', 'failed']),
  title: z.string(),
  detail: z.string().nullable().optional(),
  progress: z.number().min(0).max(100),
  artifactKind: z.enum(['desktop', 'mobile']).nullable().optional(),
  artifactUrl: z.string().url().optional(),
  createdAt: z.string()
})

const studioImportProgressSchema = z.object({
  status: z.enum(['queued', 'analyzing', 'ready', 'failed', 'published']),
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
    progress.status === 'failed'
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
