import { getRulesetVersion } from '@coderocket/core'
import {
  type FrontendChecklistCategory,
  type FrontendChecklistRule,
  loadRules
} from '@frontendchecklist/rules'

export const DOCUMENTATION_RULES = loadRules().sort(
  (left, right) =>
    left.primaryCategory.localeCompare(right.primaryCategory) ||
    left.title.localeCompare(right.title)
)

export const DOCUMENTATION_RULESET_VERSION = getRulesetVersion()
const DOCUMENTATION_RULES_BY_SLUG = new Map(DOCUMENTATION_RULES.map(rule => [rule.slug, rule]))

const CATEGORY_LABELS: Record<FrontendChecklistCategory, string> = {
  accessibility: 'Accessibility',
  css: 'CSS',
  html: 'HTML',
  i18n: 'Internationalization',
  images: 'Images',
  javascript: 'JavaScript',
  performance: 'Performance',
  privacy: 'Privacy',
  pwa: 'PWA',
  security: 'Security',
  seo: 'SEO',
  testing: 'Testing'
}

/** Return the human-readable label for a rule category. */
export function getCategoryLabel(category: FrontendChecklistCategory): string {
  return CATEGORY_LABELS[category]
}

/** Return categories that currently contain at least one rule. */
export function getDocumentationCategories(): Array<{
  category: FrontendChecklistCategory
  count: number
  label: string
}> {
  const counts = new Map<FrontendChecklistCategory, number>()
  for (const rule of DOCUMENTATION_RULES)
    counts.set(rule.primaryCategory, (counts.get(rule.primaryCategory) ?? 0) + 1)

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count, label: getCategoryLabel(category) }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

/** Find one canonical documentation rule by category and slug. */
export function getDocumentationRule(
  category: string,
  slug: string
): FrontendChecklistRule | undefined {
  return DOCUMENTATION_RULES.find(rule => rule.primaryCategory === category && rule.slug === slug)
}

/** Return the previous and next rules in the canonical sorted reference. */
export function getAdjacentDocumentationRules(rule: FrontendChecklistRule): {
  next?: FrontendChecklistRule
  previous?: FrontendChecklistRule
} {
  const index = DOCUMENTATION_RULES.indexOf(rule)
  return {
    previous: index > 0 ? DOCUMENTATION_RULES[index - 1] : undefined,
    next: index >= 0 ? DOCUMENTATION_RULES[index + 1] : undefined
  }
}

/** Build the official CodeRocket URL for a rule from the upstream-backed corpus. */
export function getRuleDocumentationUrl(rule: FrontendChecklistRule): string {
  return `/docs/rules/${rule.primaryCategory}/${rule.slug}`
}

/** Resolve a stored finding slug to a canonical route without ever returning a dead link. */
export function getRuleDocumentationUrlBySlug(slug: string): string {
  const rule = DOCUMENTATION_RULES_BY_SLUG.get(slug)
  return rule ? getRuleDocumentationUrl(rule) : '/docs/rules'
}
