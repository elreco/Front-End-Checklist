import { createServiceClient } from '@coderocket/db'

export const dynamic = 'force-dynamic'

/** Report web/database readiness while exposing worker degradation without taking the site offline. */
export async function GET() {
  const startedAt = Date.now()
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('cr_worker_heartbeats')
      .select('last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    const heartbeatAge = data?.last_seen_at
      ? Date.now() - new Date(data.last_seen_at).getTime()
      : undefined
    const workerHealthy = heartbeatAge !== undefined && heartbeatAge < 120_000
    return Response.json(
      {
        status: workerHealthy ? 'ok' : 'degraded',
        database: 'ok',
        worker: workerHealthy ? 'ok' : 'stale',
        latencyMs: Date.now() - startedAt
      },
      // A delayed worker must remain visible without removing the healthy web process from traffic.
      { status: 200 }
    )
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        database: 'unavailable',
        worker: 'unknown',
        message: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 503 }
    )
  }
}
