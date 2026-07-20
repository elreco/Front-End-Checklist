import type { PlanId, SiteSourceMode } from '@coderocket/core'

/** Normalize stored source permission to the two supported recreation modes. */
export function readSourceMode(value: string): SiteSourceMode {
  return value === 'inspiration' ? 'inspiration' : 'owned'
}

/** Keep unknown or missing subscriptions on the non-billable free plan. */
export function readBuilderPlan(value?: string): PlanId {
  if (value === 'agency' || value === 'solo') return value
  return 'free'
}

/** Turn one source path into a short label that remains understandable outside technical details. */
export function readablePageName(path: string): string {
  if (path === '/') return 'The homepage'
  const lastPart = path.split('/').filter(Boolean).at(-1) ?? 'This page'
  const label = lastPart.replace(/[-_]+/g, ' ').trim()
  return label ? `“${label.slice(0, 60)}”` : 'This page'
}
