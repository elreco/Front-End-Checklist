import { createServiceClient } from '@coderocket/db'
import type { WorkerJob } from './audit-job'

const ARTIFACT_BUCKET = 'cr-builder-imports'
const ARTIFACT_RETENTION_MS = 24 * 60 * 60 * 1000
const MAX_ARTIFACT_BYTES = 3 * 1024 * 1024

export type SiteImportEventKind =
  | 'queued'
  | 'progress'
  | 'capture'
  | 'ai'
  | 'page'
  | 'warning'
  | 'completed'
  | 'failed'

export type SiteImportProgressStage =
  | 'queued'
  | 'starting'
  | 'checking_pages'
  | 'comparing'
  | 'saving'
  | 'retrying'
  | 'completed'

interface SiteImportProgress {
  current?: number
  detail?: string
  eventKey: string
  kind: SiteImportEventKind
  message: string
  progress: number
  stage: SiteImportProgressStage
  title: string
  total?: number
}

/** Persist one plain-language milestone while keeping the import independent from its activity UI. */
export async function reportSiteImportProgress(
  job: WorkerJob,
  progress: SiteImportProgress
): Promise<void> {
  if (!job.builder_site_id) return
  const db = createServiceClient()
  const now = new Date().toISOString()
  const { error } = await db
    .from('cr_jobs')
    .update({
      progress_stage: progress.stage,
      progress_current: progress.current ?? 0,
      progress_total: progress.total ?? 0,
      progress_message: progress.message,
      progress_updated_at: now
    })
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
  if (error) throw new Error(error.message)

  await db.from('cr_builder_import_events').upsert(
    {
      owner_id: job.owner_id,
      site_id: job.builder_site_id,
      job_id: job.id,
      event_key: progress.eventKey,
      stage: progress.stage,
      event_kind: progress.kind,
      title: progress.title,
      detail: progress.detail ?? null,
      progress: Math.max(0, Math.min(100, Math.round(progress.progress)))
    },
    { ignoreDuplicates: true, onConflict: 'job_id,event_key' }
  )
}

/** Store one bounded private screenshot and attach it to an owner-visible capture milestone. */
export async function reportSiteImportCapture(
  job: WorkerJob,
  capture: { dataUrl: string; name: 'desktop' | 'mobile' }
): Promise<void> {
  if (!job.builder_site_id) return
  const encoded = capture.dataUrl.match(/^data:image\/jpeg;base64,([a-z0-9+/=]+)$/i)?.[1]
  const bytes = encoded ? Buffer.from(encoded, 'base64') : undefined
  const artifactPath =
    bytes && bytes.byteLength <= MAX_ARTIFACT_BYTES
      ? `${job.owner_id}/${job.builder_site_id}/${job.id}/${capture.name}.jpg`
      : undefined
  let storedPath: string | undefined
  if (artifactPath && bytes) {
    const { error } = await createServiceClient()
      .storage.from(ARTIFACT_BUCKET)
      .upload(artifactPath, bytes, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: true
      })
    if (!error) storedPath = artifactPath
  }

  const db = createServiceClient()
  const progress = capture.name === 'desktop' ? 28 : 34
  const message =
    capture.name === 'desktop'
      ? 'Checking how the homepage adapts to a phone'
      : 'Understanding the design and layout'
  const now = new Date().toISOString()
  await db
    .from('cr_jobs')
    .update({
      progress_stage: 'checking_pages',
      progress_message: message,
      progress_updated_at: now
    })
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
  await db.from('cr_builder_import_events').upsert(
    {
      owner_id: job.owner_id,
      site_id: job.builder_site_id,
      job_id: job.id,
      event_key: `capture-${capture.name}`,
      stage: 'checking_pages',
      event_kind: 'capture',
      title: capture.name === 'desktop' ? 'Computer view captured' : 'Phone view captured',
      detail:
        storedPath && capture.name === 'desktop'
          ? 'CodeRocket measured the wide layout, spacing, colours, and visible sections.'
          : storedPath
            ? 'CodeRocket checked how the same page adapts to a smaller screen.'
            : 'The layout was checked, but its private image preview could not be saved.',
      progress,
      artifact_path: storedPath ?? null,
      artifact_kind: storedPath ? capture.name : null,
      artifact_expires_at: storedPath
        ? new Date(Date.now() + ARTIFACT_RETENTION_MS).toISOString()
        : null
    },
    { ignoreDuplicates: true, onConflict: 'job_id,event_key' }
  )
}

/** Remove expired screenshots while retaining the plain-language activity history. */
export async function cleanupExpiredSiteImportArtifacts(): Promise<void> {
  const db = createServiceClient()
  const { data, error } = await db
    .from('cr_builder_import_events')
    .select('id,artifact_path')
    .not('artifact_path', 'is', null)
    .lt('artifact_expires_at', new Date().toISOString())
    .limit(100)
  if (error) throw new Error(error.message)
  const artifacts = (data ?? []).flatMap(event =>
    event.artifact_path ? [{ id: event.id, path: event.artifact_path }] : []
  )
  if (artifacts.length === 0) return
  const { error: removalError } = await db.storage
    .from(ARTIFACT_BUCKET)
    .remove(artifacts.map(artifact => artifact.path))
  if (removalError) throw new Error(removalError.message)
  const { error: updateError } = await db
    .from('cr_builder_import_events')
    .update({
      artifact_path: null,
      artifact_kind: null,
      artifact_expires_at: null
    })
    .in(
      'id',
      artifacts.map(artifact => artifact.id)
    )
  if (updateError) throw new Error(updateError.message)
}
