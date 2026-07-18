export type EmailAlertKind = 'check_failures' | 'new_problems'

export interface EmailAlertPreferences {
  checkFailures: boolean
  enabled: boolean
  newProblems: boolean
}

/** Return whether one site preference allows a specific actionable email alert. */
export function allowsEmailAlert(
  preferences: EmailAlertPreferences,
  kind: EmailAlertKind
): boolean {
  if (!preferences.enabled) return false
  return kind === 'new_problems' ? preferences.newProblems : preferences.checkFailures
}

/** Narrow a queued job value to the supported email alert kinds. */
export function readEmailAlertKind(value: unknown): EmailAlertKind | undefined {
  return value === 'new_problems' || value === 'check_failures' ? value : undefined
}
