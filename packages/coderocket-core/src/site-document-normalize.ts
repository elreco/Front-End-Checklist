import type { SiteSourceBlueprint, SourceSectionBlueprint } from './site-source-blueprint'
import type { SiteSectionVisualStyle, SiteVisualTheme } from './site-visual-style'
import {
  sanitizeFontFamily,
  sanitizeVisualBackground,
  siteSectionVisualStyleSchema,
  siteVisualThemeSchema
} from './site-visual-style'

/** Create one usable section when the rendered page exposes no clear section containers. */
export function fallbackSection(blueprint: SiteSourceBlueprint): SourceSectionBlueprint {
  return {
    backgroundColor: blueprint.backgroundColor,
    body: blueprint.description,
    foregroundColor: blueprint.foregroundColor,
    heading: blueprint.title,
    links: []
  }
}

/** Validate captured theme values and replace unsafe CSS fragments with stable fallbacks. */
export function normalizeVisualTheme(value?: SiteVisualTheme): SiteVisualTheme | undefined {
  if (!value) return undefined
  const parsed = siteVisualThemeSchema.safeParse({
    ...value,
    fontFamily: sanitizeFontFamily(value.fontFamily, 'system-ui, sans-serif'),
    headingFontFamily: sanitizeFontFamily(
      value.headingFontFamily,
      value.fontFamily || 'system-ui, sans-serif'
    ),
    header: {
      ...value.header,
      backgroundColor: safeColor(value.header.backgroundColor, '#ffffff'),
      foregroundColor: safeColor(value.header.foregroundColor, '#111827'),
      borderColor: safeColor(value.header.borderColor, 'rgba(0, 0, 0, 0.12)')
    },
    button: {
      ...value.button,
      backgroundColor: safeColor(value.button.backgroundColor, '#111827'),
      foregroundColor: safeColor(value.button.foregroundColor, '#ffffff'),
      borderColor: safeColor(value.button.borderColor, value.button.backgroundColor)
    }
  })
  return parsed.success ? parsed.data : undefined
}

/** Validate one captured section style before it enters the persisted document. */
export function normalizeSectionVisual(
  value?: SiteSectionVisualStyle
): SiteSectionVisualStyle | undefined {
  if (!value) return undefined
  const parsed = siteSectionVisualStyleSchema.safeParse({
    ...value,
    headingFontFamily: sanitizeFontFamily(value.headingFontFamily, 'system-ui, sans-serif'),
    borderColor: safeColor(value.borderColor, 'rgba(0, 0, 0, 0)'),
    backgroundImage: sanitizeVisualBackground(value.backgroundImage)
  })
  return parsed.success ? parsed.data : undefined
}

/** Infer a small semantic section role without exposing implementation choices to the owner. */
export function inferSectionKind(
  section: SourceSectionBlueprint,
  index: number,
  total: number
): 'content' | 'features' | 'collection' | 'gallery' | 'pricing' | 'testimonials' | 'cta' {
  if (index === total - 1 && section.links.length > 0) return 'cta'
  if (!section.items || section.items.length <= 1)
    return section.links.length > 1 ? 'features' : 'content'
  const searchable = [
    section.heading,
    section.body,
    ...section.items.flatMap(item => [item.title, item.body, item.price ?? ''])
  ]
    .join(' ')
    .toLowerCase()
  if (section.items.some(item => Boolean(item.price))) return 'pricing'
  if (/\b(review|reviews|testimonial|testimonials|avis|témoignage|témoignages)\b/.test(searchable))
    return 'testimonials'
  return section.items.every(item => item.imageUrl && !item.body) ? 'gallery' : 'collection'
}

/** Collapse and bound untrusted visible copy. */
export function cleanText(value: string, maximumLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maximumLength)
}

/** Keep only complete secure asset URLs. */
export function safeHttpsUrl(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** Keep common computed CSS color formats and reject arbitrary declarations. */
export function safeColor(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase()
  const supported =
    /^#[0-9a-f]{3,8}$/.test(normalized) ||
    /^rgba?\([\d\s.,%/]+\)$/.test(normalized) ||
    /^hsla?\([\d\s.,%/a-z-]+\)$/.test(normalized) ||
    /^oklch\([\d\s.%/a-z-]+\)$/.test(normalized)
  return supported ? normalized : fallback
}
