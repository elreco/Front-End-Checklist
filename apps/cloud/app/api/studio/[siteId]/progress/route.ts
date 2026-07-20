import { createServiceClient } from '@coderocket/db'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ARTIFACT_BUCKET = 'cr-builder-imports'

/** Return one owner-scoped, plain-language website recreation stream with temporary image links. */
export async function GET(_request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: site } = await supabase
    .from('cr_builder_sites')
    .select('id,status,status_message,updated_at')
    .eq('id', siteId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (!site) return Response.json({ error: 'Not found' }, { status: 404 })

  const [{ data: job }, { data: eventRows }, { data: heartbeat }] = await Promise.all([
    supabase
      .from('cr_jobs')
      .select(
        'id,status,attempts,progress_stage,progress_current,progress_total,progress_message,progress_updated_at,created_at'
      )
      .eq('owner_id', auth.user.id)
      .eq('builder_site_id', siteId)
      .eq('kind', 'site_import')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cr_builder_import_events')
      .select(
        'id,event_key,event_kind,title,detail,progress,artifact_path,artifact_kind,artifact_expires_at,created_at'
      )
      .eq('owner_id', auth.user.id)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(50),
    createServiceClient()
      .from('cr_worker_heartbeats')
      .select('last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ])

  const events = [...(eventRows ?? [])].reverse()
  const activeArtifactPaths = events.flatMap(event =>
    event.artifact_path &&
    event.artifact_expires_at &&
    new Date(event.artifact_expires_at).getTime() > Date.now()
      ? [event.artifact_path]
      : []
  )
  const artifactUrls = await createArtifactUrlMap(activeArtifactPaths)
  const workerAvailable = heartbeat?.last_seen_at
    ? Date.now() - new Date(heartbeat.last_seen_at).getTime() < 30_000
    : false
  const failed = job?.status === 'failed' && (job.attempts ?? 0) >= 3
  const safeEvents =
    events.length > 0 || !failed
      ? events
      : [
          {
            id: `failed-${job.id}`,
            event_key: 'failed',
            event_kind: 'failed',
            title: 'Creation stopped safely',
            detail:
              'CodeRocket could not finish this website after several attempts. Nothing was published.',
            progress: 100,
            artifact_path: null,
            artifact_kind: null,
            created_at: job.progress_updated_at ?? site.updated_at
          }
        ]

  return Response.json(
    {
      status: failed ? 'failed' : site.status,
      message: failed
        ? 'The first version could not be completed'
        : (job?.progress_message ?? site.status_message),
      stage: failed ? 'completed' : (job?.progress_stage ?? 'queued'),
      current: job?.progress_current ?? 0,
      total: job?.progress_total ?? 0,
      createdAt: job?.created_at ?? site.updated_at,
      updatedAt: job?.progress_updated_at ?? site.updated_at,
      attempts: job?.attempts ?? 0,
      workerAvailable,
      events: safeEvents.map(event => ({
        id: event.id,
        key: event.event_key,
        kind: event.event_kind,
        title: event.title,
        detail: event.detail,
        progress: event.progress,
        artifactKind: event.artifact_kind,
        artifactUrl: event.artifact_path ? artifactUrls.get(event.artifact_path) : undefined,
        createdAt: event.created_at
      }))
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}

/** Create short-lived links only after the route has verified ownership of the website. */
async function createArtifactUrlMap(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data } = await createServiceClient()
    .storage.from(ARTIFACT_BUCKET)
    .createSignedUrls(paths, 10 * 60)
  for (const artifact of data ?? []) {
    if (artifact.path && artifact.signedUrl) urls.set(artifact.path, artifact.signedUrl)
  }
  return urls
}
