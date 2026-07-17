import { DOCUMENTATION_RULES, DOCUMENTATION_RULESET_VERSION } from '@/lib/docs'
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/seo'

/** Serve a curated, AI-readable index of CodeRocket public documentation. */
export function GET() {
  const content = `# CodeRocket

> Website health monitoring that shows what changed, what still needs attention, and what could not be verified.

CodeRocket monitors selected website pages through a cloud check when no sign-in is required or a CI check when access is restricted. It uses deterministic checks grounded in the maintained Front-End Checklist corpus, then offers optional AI explanations without allowing AI to edit a website or resolve a finding.

## Product

- [Website monitoring](${SITE_URL}/): Product overview, use cases, and check model
- [Pricing](${SITE_URL}/pricing): Free, Personal, and Agency plans
- [Support](${SITE_URL}/support): Product, account, billing, privacy, and security help

## Official documentation

- [Documentation home](${SITE_URL}/docs): Start here
- [How checks work](${SITE_URL}/docs/audits): Access modes, evidence, comparison, and incomplete pages
- [AI fix assistant](${SITE_URL}/docs/ai): Grounding, safety boundaries, and fresh verification
- [CI checks](${SITE_URL}/docs/cli): Restricted pages and preview deployments with GitHub, GitLab, Bitbucket, or another CI
- [Security model](${SITE_URL}/docs/security): Safe fetching, tenant isolation, tokens, and retention
- [Rules reference](${SITE_URL}/docs/rules): Searchable synchronized rule corpus
- [Complete rule index](${SITE_URL}/llms-full.txt): ${DOCUMENTATION_RULES.length} rules from ruleset ${DOCUMENTATION_RULESET_VERSION}

## Contact

- Email: ${SUPPORT_EMAIL}

This file is a curated discovery aid. Search indexing and crawler access remain controlled by HTML metadata, robots.txt, and sitemap.xml.
`
  return new Response(content, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'text/plain; charset=utf-8'
    }
  })
}
