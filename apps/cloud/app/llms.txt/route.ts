import { DOCUMENTATION_RULES, DOCUMENTATION_RULESET_VERSION } from '@/lib/docs'
import { SITE_URL, SUPPORT_EMAIL } from '@/lib/seo'

/** Serve a curated, AI-readable index of CodeRocket public documentation. */
export function GET() {
  const content = `# CodeRocket

> Clone a public website into a safe, editable, hosted website without handling source code.

CodeRocket's primary journey starts with one public website address. It studies the visible pages, rebuilds them with controlled components, and gives the owner a private version to edit before publishing. Website health monitoring remains available as an optional tool for sites that are already online.

## Product

- [Website builder](${SITE_URL}/): Clone, edit, host, and publish a website without code
- [Create a website](${SITE_URL}/create): Start from one public website address
- [Pricing](${SITE_URL}/pricing): Free, Launch, and Studio plans
- [Website health tools](${SITE_URL}/monitoring): Optional checks for existing websites
- [Support](${SITE_URL}/support): Product, account, billing, privacy, and security help

## Official documentation

- [Documentation home](${SITE_URL}/docs): Start here
- [How checks work](${SITE_URL}/docs/audits): Access modes, evidence, comparison, and incomplete pages
- [AI fix assistant](${SITE_URL}/docs/ai): Grounding, safety boundaries, and fresh verification
- [Protected site access](${SITE_URL}/docs/cli): Restricted pages checked from GitHub, GitLab, Bitbucket, or another environment that already has access
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
