import type { Rule } from '@repo/types'

/**
 * Rules that CodeRocket can prove from the raw HTML returned by a public page.
 *
 * The complete Front-End Checklist corpus remains available in the guide and MCP
 * server. This profile deliberately excludes rules that require source code,
 * rendered browser state, user interaction, or subjective review.
 */
export const PRODUCTION_HTML_RULE_SLUGS = [
  'alt-text',
  'autoplay-media',
  'button-name',
  'canonical-url',
  'charset',
  'dimensions',
  'doctype',
  'empty-heading',
  'empty-links',
  'form-field-multiple-labels',
  'form-labels',
  'frame-title',
  'heading-hierarchy',
  'landmark-one-main',
  'lang-attribute',
  'lazy-loading',
  'list-structure',
  'listitem',
  'meta-description',
  'new-tab',
  'responsive-images',
  'tabindex',
  'unique-id',
  'viewport'
] as const

const PRODUCTION_HTML_RULE_SET = new Set<string>(PRODUCTION_HTML_RULE_SLUGS)

/** Select the conservative live-website subset from the current upstream corpus. */
export function selectProductionHtmlRules(rules: Rule[]): Rule[] {
  return rules.filter(rule => PRODUCTION_HTML_RULE_SET.has(rule.slug))
}
