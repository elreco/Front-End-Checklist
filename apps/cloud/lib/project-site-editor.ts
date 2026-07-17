import type { PlanId } from '@/lib/upgrade'

export interface ProjectSiteEditorProps {
  accessMode: 'public' | 'protected' | 'private'
  checking?: boolean
  maxPages: number
  pages: string[]
  plan: PlanId
  problemPaths?: string[]
  projectId: string
  siteUrl: string
  triggerLabel?: string
  variant?: 'primary' | 'outline'
}

export interface ProjectConfigurationSaveResponse {
  changed: boolean
  checkWarning?: string
  pages: string[]
  queued: boolean
  url: string
}

/** Keep the destructive domain-replacement action explicit in the submit label. */
export function getProjectEditorSubmitLabel(options: {
  checkAfterSave: boolean
  originChanged: boolean
  saving: boolean
}): string {
  if (options.saving) return 'Saving…'
  if (options.originChanged)
    return options.checkAfterSave ? 'Replace address and check' : 'Replace address'
  return options.checkAfterSave ? 'Save and check again' : 'Save changes'
}

/** Read one HTTPS origin without throwing during controlled input editing. */
export function safeHttpsOrigin(value: string): string | undefined {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.origin : undefined
  } catch {
    return undefined
  }
}

/** Narrow a successful JSON payload before using its update and queue state. */
export function isProjectConfigurationSaveResponse(
  value: unknown
): value is ProjectConfigurationSaveResponse {
  if (!isUnknownRecord(value)) return false
  return (
    typeof value.changed === 'boolean' &&
    typeof value.queued === 'boolean' &&
    typeof value.url === 'string' &&
    Array.isArray(value.pages) &&
    value.pages.every(page => typeof page === 'string') &&
    (value.checkWarning === undefined || typeof value.checkWarning === 'string')
  )
}

/** Extract a safe API message from an unknown response payload. */
export function readProjectConfigurationError(value: unknown): string {
  return isUnknownRecord(value) && typeof value.error === 'string'
    ? value.error
    : 'The monitored URLs could not be updated.'
}

/** Narrow an unknown JSON value to an object without a type assertion. */
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
