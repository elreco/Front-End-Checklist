import {
  DOCUMENTATION_RULES,
  DOCUMENTATION_RULESET_VERSION,
  getCategoryLabel,
  getRuleDocumentationUrl
} from '@/lib/docs'
import { SITE_URL } from '@/lib/seo'

/** Serve the complete canonical CodeRocket rule index for AI-oriented discovery. */
export function GET() {
  const grouped = new Map<string, string[]>()
  for (const rule of DOCUMENTATION_RULES) {
    const label = getCategoryLabel(rule.primaryCategory)
    const entries = grouped.get(label) ?? []
    entries.push(
      `- [${rule.title}](${SITE_URL}${getRuleDocumentationUrl(rule)}): ${rule.description ?? `CodeRocket ${label} rule reference.`}`
    )
    grouped.set(label, entries)
  }
  const sections = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, rules]) => `## ${label}\n\n${rules.join('\n')}`)
    .join('\n\n')
  const content = `# CodeRocket complete rule reference

> ${DOCUMENTATION_RULES.length} maintained frontend rules from ruleset ${DOCUMENTATION_RULESET_VERSION}.

The canonical browser index is ${SITE_URL}/docs/rules. Each link below opens the full official rule page with implementation guidance, sources, examples, and verification steps.

${sections}
`
  return new Response(content, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })
}
