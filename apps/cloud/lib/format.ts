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
