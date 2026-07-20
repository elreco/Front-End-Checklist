/** Keep owner-visible import failures useful without leaking provider or website credentials. */
export function sanitizeSiteImportFailure(value: string): string {
  return value
    .replace(/wss:\/\/[^\s]+/gi, '[secure browser endpoint]')
    .replace(
      /([?&](?:access_token|api[_-]?key|key|password|secret|token)=)[^&\s]+/gi,
      '$1[credential]'
    )
    .replace(/\b(?:bearer|token|secret|password)\s+[^\s]+/gi, '[credential]')
    .slice(0, 2_000)
}
