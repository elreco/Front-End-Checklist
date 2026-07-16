/** Write one structured JSON log line for Fly log aggregation. */
export function log(level: 'info' | 'error', event: string, context: Record<string, unknown> = {}) {
  process.stdout.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...context })}\n`
  )
}
