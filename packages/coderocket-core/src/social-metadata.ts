import { assertPublicHttpsUrl } from './safe-fetch'

const META_TAG_PATTERN = /<meta\b[^>]*>/gi
const HEAD_PATTERN = /<head\b[^>]*>([\s\S]*?)<\/head>/i
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g
const SCRIPT_PATTERN = /<script\b[\s\S]*?<\/script\s*>/gi
const STYLE_PATTERN = /<style\b[\s\S]*?<\/style\s*>/gi
const ATTRIBUTE_PATTERN = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
const SOCIAL_IMAGE_PROPERTIES = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image']
const MAX_SOCIAL_IMAGE_URL_LENGTH = 2048

function decodeAttributeValue(value: string): string {
  return value
    .replace(/&(?:amp|#0*38|#x0*26);/gi, '&')
    .replace(/&(?:quot|#0*34|#x0*22);/gi, '"')
    .trim()
}

function readAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>()
  for (const match of tag.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1]?.toLowerCase()
    const value = match[2] ?? match[3] ?? match[4]
    if (name && value !== undefined) attributes.set(name, decodeAttributeValue(value))
  }
  return attributes
}

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

function getMetadataMarkup(html: string): string {
  const markup = HEAD_PATTERN.exec(html)?.[1] ?? html.slice(0, 100_000)
  return markup.replace(COMMENT_PATTERN, '').replace(SCRIPT_PATTERN, '').replace(STYLE_PATTERN, '')
}

/** Extract the best HTTPS social preview image declared by a fetched HTML document. */
export function extractSocialImageUrl(html: string, pageUrl: string): string | undefined {
  const candidates = new Map<string, string[]>()
  for (const tag of getMetadataMarkup(html).matchAll(META_TAG_PATTERN)) {
    const attributes = readAttributes(tag[0])
    const property = (attributes.get('property') ?? attributes.get('name'))?.toLowerCase()
    const content = attributes.get('content')
    if (!(property && content && SOCIAL_IMAGE_PROPERTIES.includes(property))) continue
    const values = candidates.get(property) ?? []
    values.push(content)
    candidates.set(property, values)
  }

  for (const property of SOCIAL_IMAGE_PROPERTIES) {
    for (const candidate of candidates.get(property) ?? []) {
      const imageUrl = normalizeImageUrl(candidate, pageUrl)
      if (imageUrl) return imageUrl
    }
  }
  return undefined
}

/** Return a safe image update only when the monitored home page was actually reachable. */
export async function resolveProjectSocialImage(
  pages: Array<{ reachable: boolean; socialImageUrl?: string; url: string }>
): Promise<string | null | undefined> {
  const homePage = pages.find(page => {
    try {
      return new URL(page.url).pathname === '/'
    } catch {
      return false
    }
  })
  if (!homePage?.reachable) return undefined
  if (!homePage.socialImageUrl) return null
  try {
    return (await assertPublicHttpsUrl(homePage.socialImageUrl)).toString()
  } catch {
    return null
  }
}
