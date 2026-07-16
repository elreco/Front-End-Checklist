/** Format a timestamp as a compact, human-readable relative time. */
export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'Not checked yet'
  const timestamp = new Date(value).getTime()
  const difference = timestamp - Date.now()
  const absoluteDifference = Math.abs(difference)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (absoluteDifference < 60_000) return 'just now'
  if (absoluteDifference < 3_600_000)
    return formatter.format(Math.round(difference / 60_000), 'minute')
  if (absoluteDifference < 86_400_000)
    return formatter.format(Math.round(difference / 3_600_000), 'hour')
  if (absoluteDifference < 604_800_000)
    return formatter.format(Math.round(difference / 86_400_000), 'day')
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value))
}

/** Format a timestamp with enough detail for an audit history. */
export function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

/** Turn a user name or email into compact avatar initials. */
export function getInitials(value: string): string {
  const parts = value
    .replace(/@.*$/, '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'CR'
  )
}
