import { probePublicImage, type SafeFetchOptions } from './safe-fetch'

const META_TAG_PATTERN = /<meta\b[^>]*>/gi
const LINK_TAG_PATTERN = /<link\b[^>]*>/gi
const HEAD_PATTERN = /<head\b[^>]*>([\s\S]*?)<\/head>/i
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g
const SCRIPT_PATTERN = /<script\b[\s\S]*?<\/script\s*>/gi
const STYLE_PATTERN = /<style\b[\s\S]*?<\/style\s*>/gi
const ATTRIBUTE_PATTERN = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
const SOCIAL_IMAGE_PROPERTIES = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image']
const MAX_SOCIAL_IMAGE_URL_LENGTH = 2048
const MAX_SITE_IMAGE_CANDIDATES = 12

/** Decode the bounded HTML entities accepted inside metadata attribute values. */
function decodeAttributeValue(value: string): string {
  return value
    .replace(/&(?:amp|#0*38|#x0*26);/gi, '&')
    .replace(/&(?:quot|#0*34|#x0*22);/gi, '"')
    .trim()
}

/** Read normalized attributes from one HTML metadata tag. */
function readAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>()
  for (const match of tag.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1]?.toLowerCase()
    const value = match[2] ?? match[3] ?? match[4]
    if (name && value !== undefined) attributes.set(name, decodeAttributeValue(value))
  }
  return attributes
}

/** Resolve one candidate against the page while enforcing a safe HTTPS URL. */
function normalizeImageUrl(value: string, pageUrl: string): string | undefined {
  try {
    const url = new URL(value, pageUrl)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.toString().length > MAX_SOCIAL_IMAGE_URL_LENGTH
    )
      return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/** Isolate inert head markup before metadata extraction. */
function getMetadataMarkup(html: string): string {
  const markup = HEAD_PATTERN.exec(html)?.[1] ?? html.slice(0, 100_000)
  return markup.replace(COMMENT_PATTERN, '').replace(SCRIPT_PATTERN, '').replace(STYLE_PATTERN, '')
}

/** Collect unique, valid HTTPS values without allowing an unbounded metadata list. */
function collectValidUrls(values: string[], pageUrl: string): string[] {
  const urls: string[] = []
  for (const value of values) {
    const url = normalizeImageUrl(value, pageUrl)
    if (url && !urls.includes(url)) urls.push(url)
    if (urls.length >= MAX_SITE_IMAGE_CANDIDATES) break
  }
  return urls
}

/** Keep the conventional favicon as a final recovery candidate within the shared limit. */
function appendConventionalFavicon(values: string[], pageUrl: string): string[] {
  const faviconUrl = normalizeImageUrl('/favicon.ico', pageUrl)
  const candidates = collectValidUrls(values, pageUrl).filter(value => value !== faviconUrl)
  return faviconUrl
    ? [...candidates.slice(0, MAX_SITE_IMAGE_CANDIDATES - 1), faviconUrl]
    : candidates
}

/** Extract ordered HTTPS social preview images from metadata markup. */
function extractSocialImageUrls(markup: string, pageUrl: string): string[] {
  const candidates = new Map<string, string[]>()
  for (const tag of markup.matchAll(META_TAG_PATTERN)) {
    const attributes = readAttributes(tag[0])
    const property = (attributes.get('property') ?? attributes.get('name'))?.toLowerCase()
    const content = attributes.get('content')
    if (!(property && content && SOCIAL_IMAGE_PROPERTIES.includes(property))) continue
    const values = candidates.get(property) ?? []
    values.push(content)
    candidates.set(property, values)
  }

  const orderedValues: string[] = []
  for (const property of SOCIAL_IMAGE_PROPERTIES) {
    orderedValues.push(...(candidates.get(property) ?? []))
  }
  return collectValidUrls(orderedValues, pageUrl)
}

/** Extract ordered Apple touch icons and favicon links from metadata markup. */
function extractIconUrls(markup: string, pageUrl: string): string[] {
  const appleIcons: string[] = []
  const icons: string[] = []
  for (const tag of markup.matchAll(LINK_TAG_PATTERN)) {
    const attributes = readAttributes(tag[0])
    const rel = attributes.get('rel')?.toLowerCase().split(/\s+/) ?? []
    const href = attributes.get('href')
    if (!href || !rel.some(value => value.includes('icon'))) continue
    if (rel.some(value => value.startsWith('apple-touch-icon'))) appleIcons.push(href)
    else icons.push(href)
  }
  return collectValidUrls([...appleIcons, ...icons], pageUrl)
}

/** Extract the best HTTPS social preview image declared by a fetched HTML document. */
export function extractSocialImageUrl(html: string, pageUrl: string): string | undefined {
  return extractSocialImageUrls(getMetadataMarkup(html), pageUrl)[0]
}

/** Extract every useful site-image candidate in display priority order. */
export function extractSiteImageUrls(html: string, pageUrl: string): string[] {
  const markup = getMetadataMarkup(html)
  return appendConventionalFavicon(
    [...extractSocialImageUrls(markup, pageUrl), ...extractIconUrls(markup, pageUrl)],
    pageUrl
  )
}

/** Return a safe image update only when the monitored home page was actually reachable. */
export async function resolveProjectSocialImage(
  pages: Array<{
    finalUrl?: string
    reachable: boolean
    siteImageUrls?: string[]
    socialImageUrl?: string
    url: string
  }>,
  options: SafeFetchOptions = {}
): Promise<string | null | undefined> {
  const homePage = pages.find(page => {
    try {
      return new URL(page.url).pathname === '/'
    } catch {
      return false
    }
  })
  if (!homePage?.reachable) return undefined
  const auditedUrl = new URL(homePage.finalUrl ?? homePage.url)
  const siteImageUrls = homePage.siteImageUrls ?? []
  const declaredCandidates =
    siteImageUrls.length > 0
      ? siteImageUrls
      : homePage.socialImageUrl
        ? [homePage.socialImageUrl]
        : []
  const candidates = appendConventionalFavicon(declaredCandidates, auditedUrl.toString())
  const probeCandidates: string[] = []
  try {
    for (const candidate of candidates) {
      if (!probeCandidates.includes(candidate)) probeCandidates.push(candidate)
      const declaredUrl = new URL(candidate)
      if (declaredUrl.origin !== auditedUrl.origin) {
        const rebasedUrl = new URL(
          `${declaredUrl.pathname}${declaredUrl.search}`,
          auditedUrl
        ).toString()
        if (!probeCandidates.includes(rebasedUrl)) probeCandidates.push(rebasedUrl)
      }
    }
  } catch {
    return null
  }

  for (const candidate of probeCandidates)
    try {
      return await probePublicImage(candidate, options)
    } catch {}
  return null
}
