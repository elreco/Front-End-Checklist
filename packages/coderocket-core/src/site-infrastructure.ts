import { normalizeAuditPath } from './diff'
import { fetchPublicText, type SafeTextResponse } from './safe-fetch'
import type { AuditFindingInput } from './types'

type TextFetcher = (url: string) => Promise<SafeTextResponse>

/** Check crawl-control resources once per site, independently from page HTML findings. */
export async function auditSiteInfrastructure(
  rawUrl: string,
  options: { fetchText?: TextFetcher } = {}
): Promise<AuditFindingInput[]> {
  const siteUrl = new URL(rawUrl)
  const pagePath = normalizeAuditPath(siteUrl.pathname)
  const fetchText = options.fetchText ?? fetchPublicText
  const findings: AuditFindingInput[] = []
  const robotsUrl = new URL('/robots.txt', siteUrl.origin).toString()
  let robots = ''

  try {
    const response = await fetchText(robotsUrl)
    robots = response.text
    if (/^\s*disallow\s*:\s*\/\s*$/im.test(robots)) {
      findings.push(
        infrastructureFinding({
          pagePath,
          ruleSlug: 'robots-txt',
          title: 'Search crawlers are blocked site-wide',
          priority: 'high',
          message:
            'robots.txt contains Disallow: /, which asks compliant search crawlers not to visit any page.',
          observed: 'Disallow: /',
          expected: 'Allow public pages that should appear in search',
          occurrenceKey: 'robots-block-all'
        })
      )
    }
  } catch (error) {
    if (isHttpNotFound(error)) {
      findings.push(
        infrastructureFinding({
          pagePath,
          ruleSlug: 'robots-txt',
          title: 'robots.txt is missing',
          priority: 'medium',
          message: 'The standard /robots.txt URL returned HTTP 404.',
          observed: 'HTTP 404 at /robots.txt',
          expected: 'A readable robots.txt file',
          occurrenceKey: 'robots-missing'
        })
      )
    }
  }

  const declaredSitemaps = parseSitemapUrls(robots, siteUrl)
  const sitemapUrl = declaredSitemaps[0] ?? new URL('/sitemap.xml', siteUrl.origin).toString()
  try {
    const response = await fetchText(sitemapUrl)
    if (!/<(?:urlset|sitemapindex)(?:\s|>)/i.test(response.text)) {
      findings.push(
        infrastructureFinding({
          pagePath,
          ruleSlug: 'sitemap-valid',
          title: 'The sitemap response is not valid sitemap XML',
          priority: 'medium',
          message: 'The sitemap URL responded, but no <urlset> or <sitemapindex> root was found.',
          observed: `Readable response at ${new URL(sitemapUrl).pathname}`,
          expected: 'XML with a <urlset> or <sitemapindex> root',
          occurrenceKey: 'sitemap-invalid'
        })
      )
    }
  } catch (error) {
    if (isHttpNotFound(error)) {
      findings.push(
        infrastructureFinding({
          pagePath,
          ruleSlug: 'sitemap-4xx',
          title: 'The XML sitemap could not be found',
          priority: 'medium',
          message: `The expected sitemap URL returned HTTP 404: ${sitemapUrl}`,
          observed: `HTTP 404 at ${new URL(sitemapUrl).pathname}`,
          expected: 'A readable XML sitemap',
          occurrenceKey: 'sitemap-missing'
        })
      )
    }
  }

  return findings
}

function parseSitemapUrls(robots: string, siteUrl: URL): string[] {
  const urls: string[] = []
  for (const match of robots.matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gim)) {
    const value = match[1]
    if (!value) continue
    try {
      const parsed = new URL(value, siteUrl.origin)
      if (parsed.protocol === 'https:' && parsed.hostname === siteUrl.hostname)
        urls.push(parsed.toString())
    } catch {}
  }
  return urls
}

function infrastructureFinding(options: {
  expected: string
  message: string
  observed: string
  occurrenceKey: string
  pagePath: string
  priority: 'high' | 'medium'
  ruleSlug: string
  title: string
}): AuditFindingInput {
  return {
    pagePath: options.pagePath,
    ruleSlug: options.ruleSlug,
    title: options.title,
    priority: options.priority,
    message: options.message,
    category: 'search',
    source: 'http',
    occurrenceKey: options.occurrenceKey,
    evidence: {
      kind: 'network',
      summary: 'CodeRocket requested the standard public crawl-control resource.',
      observed: options.observed,
      expected: options.expected
    }
  }
}

function isHttpNotFound(error: unknown): boolean {
  return error instanceof Error && error.message === 'HTTP 404'
}
