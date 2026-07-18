import { createHash } from 'node:crypto'
import type { DocumentProof } from './types'

const COMMENT_PATTERN = /<!--[\s\S]*?-->/g
const INERT_CONTENT_PATTERN = /<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi
const TITLE_PATTERN = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i
const TOKEN_PATTERN = /<!doctype\b[^>]*>|<title\b[^>]*>[\s\S]*?<\/title\s*>|<\/?[a-z][^>]*>/gi
const ATTRIBUTE_PATTERN = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
const SAFE_ATTRIBUTE_NAMES = new Set([
  'aria-label',
  'charset',
  'content',
  'dir',
  'href',
  'http-equiv',
  'lang',
  'name',
  'property',
  'rel',
  'role',
  'src',
  'type'
])
const MAX_OUTLINE_TAGS = 48
const MAX_OUTLINE_LENGTH = 6000

/** Build a bounded, redacted receipt for the exact server document used by an audit. */
export function createDocumentProof(options: {
  fetchedAt: string
  headers: Record<string, string>
  html: string
}): DocumentProof {
  const { fetchedAt, headers, html } = options
  const title = extractSafeTitle(html)
  const contentType = readHeader(headers, 'content-type')?.split(';')[0]?.trim()
  const etag = readHeader(headers, 'etag')
  const lastModified = readHeader(headers, 'last-modified')
  const cacheStatus = getCacheStatus(headers)
  return {
    byteLength: new TextEncoder().encode(html).byteLength,
    fetchedAt,
    htmlOutline: buildSafeHtmlOutline(html, title),
    sha256: createHash('sha256').update(html).digest('hex'),
    ...(title ? { title } : {}),
    ...(contentType ? { contentType } : {}),
    ...(etag ? { etag } : {}),
    ...(lastModified ? { lastModified } : {}),
    ...(cacheStatus ? { cacheStatus } : {})
  }
}

/** Read one response header regardless of how its name was cased upstream. */
function readHeader(headers: Record<string, string>, name: string): string | undefined {
  const value = Object.entries(headers).find(([candidate]) => candidate.toLowerCase() === name)?.[1]
  return value?.trim().slice(0, 500) || undefined
}

/** Summarize common CDN cache evidence without retaining the complete response headers. */
function getCacheStatus(headers: Record<string, string>): string | undefined {
  const values = [
    ['Cloudflare', readHeader(headers, 'cf-cache-status')],
    ['Vercel', readHeader(headers, 'x-vercel-cache')],
    ['Cache', readHeader(headers, 'x-cache')]
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `${label}: ${value}`)
  const age = readHeader(headers, 'age')
  if (age) values.push(`Age: ${age}s`)
  return values.join(' · ') || undefined
}

/** Extract the page title while redacting common account and credential-shaped values. */
function extractSafeTitle(html: string): string | undefined {
  const title = decodeHtmlText(TITLE_PATTERN.exec(html)?.[1] ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[email]')
    .replace(/\b(?:bearer|token|secret)\s+[a-z0-9._~+/=-]{8,}\b/gi, '[credential]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
  return title || undefined
}

/** Produce a structural HTML outline with text and sensitive attribute values removed. */
function buildSafeHtmlOutline(html: string, title?: string): string {
  const inertHtml = html.replace(COMMENT_PATTERN, '').replace(INERT_CONTENT_PATTERN, '')
  const lines: string[] = []
  for (const match of inertHtml.matchAll(TOKEN_PATTERN)) {
    const token = match[0]
    if (/^<title\b/i.test(token)) {
      lines.push(`<title>${escapeHtml(title ?? '[present]')}</title>`)
    } else {
      const safeTag = sanitizeHtmlTag(token)
      if (safeTag) lines.push(safeTag)
    }
    if (lines.length >= MAX_OUTLINE_TAGS || lines.join('\n').length >= MAX_OUTLINE_LENGTH) break
  }
  const excerpt = lines.join('\n').slice(0, MAX_OUTLINE_LENGTH)
  return `${excerpt}${lines.length >= MAX_OUTLINE_TAGS ? '\n<!-- outline truncated -->' : ''}`
}

/** Keep tag names and harmless structural attributes while redacting page content. */
function sanitizeHtmlTag(token: string): string | undefined {
  if (/^<!doctype/i.test(token)) return '<!doctype html>'
  const closing = /^<\//.test(token)
  const name = /^<\/?\s*([a-z][a-z0-9:-]*)/i.exec(token)?.[1]?.toLowerCase()
  if (!name) return undefined
  if (closing) return `</${name}>`
  const attributes = token.slice(token.indexOf(name) + name.length, token.lastIndexOf('>'))
  const safeAttributes: string[] = []
  for (const match of attributes.matchAll(ATTRIBUTE_PATTERN)) {
    const attributeName = match[1]?.toLowerCase()
    if (!attributeName || !SAFE_ATTRIBUTE_NAMES.has(attributeName)) continue
    const rawValue = match[2] ?? match[3] ?? match[4]
    if (rawValue === undefined) {
      safeAttributes.push(attributeName)
      continue
    }
    const value = sanitizeAttributeValue(attributeName, rawValue)
    safeAttributes.push(`${attributeName}="${escapeHtml(value)}"`)
  }
  const suffix = /\/\s*>$/.test(token) ? ' /' : ''
  return `<${name}${safeAttributes.length > 0 ? ` ${safeAttributes.join(' ')}` : ''}${suffix}>`
}

/** Preserve only low-risk attribute values that help identify the returned document. */
function sanitizeAttributeValue(name: string, value: string): string {
  const decoded = decodeHtmlText(value).trim().slice(0, 500)
  if (name === 'href' || name === 'src') {
    try {
      const url = new URL(decoded, 'https://document.invalid')
      return url.origin === 'https://document.invalid'
        ? `${url.pathname}${url.hash ? '#…' : ''}`
        : `${url.origin}${url.pathname}`
    } catch {
      return '[present]'
    }
  }
  if (name === 'content' || name === 'aria-label') return '[present]'
  return decoded.slice(0, 160)
}

/** Decode the small entity set needed for titles and structural attributes. */
function decodeHtmlText(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
}

/** Escape one value before placing it into the inert HTML outline. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
