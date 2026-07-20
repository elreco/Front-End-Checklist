import { cleanText } from './site-document-normalize'
import type { SourceLink } from './site-source-blueprint'

/** Resolve visible links against the source origin and retain only secure destinations. */
export function normalizeLinks(links: SourceLink[], sourceOrigin: string): SourceLink[] {
  return links.flatMap(link => normalizeLink(link, sourceOrigin))
}

/** Validate one secure destination without discarding its measured prominence. */
function normalizeLink(link: SourceLink, sourceOrigin: string): SourceLink[] {
  const label = cleanText(link.label, 80)
  if (!label) return []
  try {
    const url = new URL(link.href, sourceOrigin)
    return url.protocol === 'https:'
      ? [{ href: url.toString(), label, ...(link.prominent ? { prominent: true } : {}) }]
      : []
  } catch {
    return []
  }
}
