import { normalizeProjectPagePath } from './project-pages'
import {
  fetchPublicHtml,
  fetchPublicText,
  type SafeHtmlResponse,
  type SafeTextResponse
} from './safe-fetch'

const MAX_DISCOVERED_PAGES = 200
const MAX_SITEMAPS = 10

type HtmlFetcher = (url: string) => Promise<SafeHtmlResponse>
type TextFetcher = (url: string) => Promise<SafeTextResponse>

export type PageDiscoverySource = 'homepage' | 'sitemap'

export interface DiscoveredPage {
  path: string
  source: PageDiscoverySource
}

export interface PublicPageDiscovery {
  pages: DiscoveredPage[]
  sitemapCount: number
  truncated: boolean
  usedHomepage: boolean
}

/** Read bounded same-origin navigation paths from an already rendered, authorised app page. */
export function discoverRenderedPagePaths(
  html: string,
  pageUrl: string,
  maximumPages = 200
): string[] {
  const source = new URL(pageUrl)
  if (source.protocol !== 'https:') throw new Error('Website address must use HTTPS')
  const limit = Math.max(1, Math.min(MAX_DISCOVERED_PAGES, maximumPages))
  const paths = new Set<string>()
  addRenderedPath(paths, source, source)
  for (const href of extractHtmlLinks(html)) {
    if (paths.size >= limit) break
    try {
      addRenderedPath(paths, new URL(href, source), source)
    } catch {}
  }
  return [...paths]
}

/** Find same-origin HTML page candidates without crawling every discovered URL. */
export async function discoverPublicPagePaths(
  rawUrl: string,
  options: { fetchHtml?: HtmlFetcher; fetchText?: TextFetcher } = {}
): Promise<PublicPageDiscovery> {
  const requestedUrl = new URL(rawUrl)
  if (requestedUrl.protocol !== 'https:') throw new Error('Website address must use HTTPS')
  const fetchHtml = options.fetchHtml ?? fetchPublicHtml
  const fetchText = options.fetchText ?? fetchPublicText
  const discovered = new Map<string, PageDiscoverySource>()
  let siteUrl = new URL('/', requestedUrl.origin)
  let homepageError: unknown
  let usedHomepage = false

  try {
    const homepage = await fetchHtml(siteUrl.toString())
    siteUrl = new URL('/', new URL(homepage.url).origin)
    usedHomepage = true
    addPage(discovered, new URL(homepage.url), siteUrl, 'homepage')
    for (const href of extractHtmlLinks(homepage.html)) {
      try {
        addPage(discovered, new URL(href, homepage.url), siteUrl, 'homepage')
      } catch {}
    }
  } catch (error) {
    homepageError = error
  }

  const sitemapUrls = await resolveSitemapUrls(siteUrl, fetchText)
  const visitedSitemaps = new Set<string>()
  const queue = [...sitemapUrls]
  let sitemapCount = 0
  while (queue.length > 0 && visitedSitemaps.size < MAX_SITEMAPS) {
    const sitemapUrl = queue.shift()
    if (!sitemapUrl || visitedSitemaps.has(sitemapUrl)) continue
    visitedSitemaps.add(sitemapUrl)
    try {
      const response = await fetchText(sitemapUrl)
      sitemapCount += 1
      const locations = extractXmlLocations(response.text)
      if (/<(?:[a-z0-9_-]+:)?sitemapindex(?:\s|>)/i.test(response.text)) {
        for (const location of locations) {
          const child = safeSameOriginUrl(location, siteUrl)
          if (child && !visitedSitemaps.has(child.toString())) queue.push(child.toString())
        }
        continue
      }
      for (const location of locations) {
        const pageUrl = safeSameOriginUrl(location, siteUrl)
        if (pageUrl) addPage(discovered, pageUrl, siteUrl, 'sitemap')
      }
    } catch {}
  }

  if (discovered.size === 0 && homepageError instanceof Error) throw homepageError
  const pages = [...discovered].map(([path, source]) => ({ path, source }))
  return {
    pages: pages.slice(0, MAX_DISCOVERED_PAGES),
    sitemapCount,
    truncated: pages.length > MAX_DISCOVERED_PAGES || queue.length > 0,
    usedHomepage
  }
}

async function resolveSitemapUrls(siteUrl: URL, fetchText: TextFetcher): Promise<string[]> {
  const fallback = new URL('/sitemap.xml', siteUrl).toString()
  try {
    const robots = await fetchText(new URL('/robots.txt', siteUrl).toString())
    const declared = [...robots.text.matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gim)]
      .map(match => match[1])
      .filter((value): value is string => Boolean(value))
      .map(value => safeSameOriginUrl(value, siteUrl)?.toString())
      .filter((value): value is string => Boolean(value))
    return declared.length > 0 ? [...new Set(declared)] : [fallback]
  } catch {
    return [fallback]
  }
}

function addPage(
  discovered: Map<string, PageDiscoverySource>,
  pageUrl: URL,
  siteUrl: URL,
  source: PageDiscoverySource
) {
  if (pageUrl.origin !== siteUrl.origin || pageUrl.username || pageUrl.password) return
  if (!isLikelyHtmlPath(pageUrl.pathname)) return
  try {
    const path = normalizeProjectPagePath(pageUrl.pathname)
    if (!discovered.has(path) || source === 'sitemap') discovered.set(path, source)
  } catch {}
}

/** Keep navigation-like private routes while excluding authentication and destructive actions. */
function addRenderedPath(paths: Set<string>, candidate: URL, source: URL) {
  if (
    candidate.protocol !== 'https:' ||
    candidate.origin !== source.origin ||
    candidate.username ||
    candidate.password ||
    !isLikelyHtmlPath(candidate.pathname)
  )
    return
  const segments = candidate.pathname.toLowerCase().split('/').filter(Boolean)
  if (
    segments.some(segment =>
      /^(?:delete|destroy|log-?out|remove|sign-?out|unsubscribe)$/.test(segment)
    )
  )
    return
  try {
    paths.add(normalizeProjectPagePath(candidate.pathname))
  } catch {}
}

function safeSameOriginUrl(value: string, siteUrl: URL): URL | undefined {
  try {
    const parsed = new URL(decodeXmlEntities(value.trim()), siteUrl)
    if (parsed.protocol !== 'https:' || parsed.origin !== siteUrl.origin) return undefined
    return parsed
  } catch {
    return undefined
  }
}

function extractHtmlLinks(html: string): string[] {
  const links: string[] = []
  const pattern = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi
  for (const match of html.matchAll(pattern)) {
    const value = match[1] ?? match[2] ?? match[3]
    if (value) links.push(decodeXmlEntities(value))
  }
  return links
}

function extractXmlLocations(xml: string): string[] {
  return [...xml.matchAll(/<(?:[a-z0-9_-]+:)?loc(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-z0-9_-]+:)?loc>/gi)]
    .map(match => match[1]?.trim())
    .filter((value): value is string => Boolean(value))
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:0*39|x0*27);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function isLikelyHtmlPath(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop() ?? ''
  if (!lastSegment.includes('.')) return true
  return /\.(?:html?|php|aspx?)$/i.test(lastSegment)
}
