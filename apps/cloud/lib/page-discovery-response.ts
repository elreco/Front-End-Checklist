import type { DiscoveredPage } from '@coderocket/core'

/** Return whether page discovery can safely target one entered HTTPS origin. */
export function isValidPageDiscoveryUrl(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

/** Read a safe page-discovery API error without assuming the response shape. */
export function readPageDiscoveryError(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string')
    return value.error
  return 'Page discovery could not be completed.'
}

/** Extract validated public-page candidates from an unknown API response. */
export function readDiscoveredPages(value: unknown): DiscoveredPage[] {
  if (!value || typeof value !== 'object' || !('pages' in value) || !Array.isArray(value.pages))
    return []
  return value.pages.filter(isDiscoveredPage)
}

/** Narrow one unknown candidate to the public page-discovery response contract. */
function isDiscoveredPage(value: unknown): value is DiscoveredPage {
  if (!value || typeof value !== 'object') return false
  if (!('path' in value) || typeof value.path !== 'string') return false
  if (!('source' in value)) return false
  return value.source === 'homepage' || value.source === 'sitemap'
}
