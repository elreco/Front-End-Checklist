import { z } from 'zod'
import { inferSiteGoal } from './site-goal'
import {
  type SiteSectionVisualStyle,
  type SiteVisualTheme,
  sanitizeFontFamily,
  sanitizeVisualBackground,
  siteSectionVisualStyleSchema,
  siteVisualThemeSchema
} from './site-visual-style'

export { BUILDER_CREDIT_COSTS, getBuilderPlanEntitlements } from './builder-entitlements'

export type SiteSourceMode = 'owned' | 'inspiration'
export type SiteGoal = 'contact' | 'booking' | 'sell' | 'present'

export interface SourceContentItem {
  body: string
  imageAlt?: string
  imageUrl?: string
  links: Array<{ href: string; label: string }>
  price?: string
  title: string
}

export interface SourceSectionBlueprint {
  backgroundColor: string
  body: string
  foregroundColor: string
  heading: string
  imageAlt?: string
  imageUrl?: string
  items?: SourceContentItem[]
  layout?: 'centered' | 'split' | 'stacked'
  links: Array<{ href: string; label: string }>
  visual?: SiteSectionVisualStyle
}

export interface SiteSourceBlueprint {
  accentColor: string
  backgroundColor: string
  brandName: string
  capturedAt: string
  description: string
  foregroundColor: string
  logoUrl?: string
  navigation: Array<{ href: string; label: string }>
  sections: SourceSectionBlueprint[]
  sourceUrl: string
  title: string
  visualAnalysis?: 'responsive-ai' | 'responsive-dom'
  visualTheme?: SiteVisualTheme
}

const httpsUrlSchema = z
  .string()
  .url()
  .refine(value => value.startsWith('https://'))
const siteLinkSchema = z.object({
  href: httpsUrlSchema,
  label: z.string().trim().min(1).max(80)
})
const siteContentItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().max(500),
  imageAlt: z.string().trim().max(240).optional(),
  imageUrl: httpsUrlSchema.optional(),
  links: z.array(siteLinkSchema).max(2),
  price: z.string().trim().max(80).optional()
})
const siteSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  kind: z.enum([
    'hero',
    'content',
    'features',
    'collection',
    'gallery',
    'testimonials',
    'pricing',
    'form',
    'cta'
  ]),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().max(1200),
  imageAlt: z.string().trim().max(240).optional(),
  imageUrl: httpsUrlSchema.optional(),
  items: z.array(siteContentItemSchema).max(12).optional(),
  links: z.array(siteLinkSchema).max(4),
  backgroundColor: z.string().max(80),
  foregroundColor: z.string().max(80),
  layout: z.enum(['centered', 'split', 'stacked']),
  visual: siteSectionVisualStyleSchema.optional()
})
const siteIdentitySchema = z.object({
  name: z.string().trim().min(1).max(120),
  logoUrl: httpsUrlSchema.optional()
})
const siteThemeSchema = z.object({
  backgroundColor: z.string().max(80),
  foregroundColor: z.string().max(80),
  accentColor: z.string().max(80),
  fontStyle: z.enum(['sans', 'editorial', 'technical']),
  visual: siteVisualThemeSchema.optional()
})
const sitePageSchema = z.object({
  path: z
    .string()
    .regex(/^\/(?:[^?#\s]*)$/)
    .max(1024),
  title: z.string().trim().min(1).max(180),
  sections: z.array(siteSectionSchema).min(1).max(12),
  identity: siteIdentitySchema.optional(),
  theme: siteThemeSchema.optional(),
  navigation: z.array(siteLinkSchema).max(8).optional()
})

export const siteDocumentSchema = z.object({
  version: z.literal(1),
  source: z.object({
    url: httpsUrlSchema,
    mode: z.enum(['owned', 'inspiration']),
    capturedAt: z.iso.datetime()
  }),
  identity: siteIdentitySchema,
  theme: siteThemeSchema,
  navigation: z.array(siteLinkSchema).max(8),
  sections: z.array(siteSectionSchema).min(1).max(12),
  pages: z.array(sitePageSchema).min(1).max(50).optional(),
  importSummary: z
    .object({
      discoveredPages: z.number().int().min(1).max(200),
      capturedPages: z.number().int().min(1).max(50),
      failedPaths: z.array(z.string().max(1024)).max(50)
    })
    .optional(),
  recreation: z
    .object({
      capturedViewports: z
        .array(z.enum(['mobile', 'tablet', 'desktop']))
        .min(1)
        .max(3),
      visualAnalysis: z.enum(['responsive-ai', 'responsive-dom']),
      requiresReview: z.literal(true)
    })
    .optional()
})

export type SiteDocument = z.infer<typeof siteDocumentSchema>
export type SiteDocumentPage = z.infer<typeof sitePageSchema>

const INSPIRATION_COPY: Record<
  SiteGoal,
  { body: string; cta: string; heading: string; section: string }
> = {
  contact: {
    heading: 'Make it easy to choose your business.',
    body: 'Explain what you do, who you help, and why people can trust you in a few clear sentences.',
    cta: 'Contact us',
    section: 'Everything a future customer needs to take the next step.'
  },
  booking: {
    heading: 'Turn visits into confirmed appointments.',
    body: 'Present your service clearly and guide every visitor toward a simple booking.',
    cta: 'Book an appointment',
    section: 'A calm, reassuring experience from first impression to booking.'
  },
  sell: {
    heading: 'Show the value. Make buying feel simple.',
    body: 'Lead with the result your customer wants, then remove every obstacle between interest and purchase.',
    cta: 'See the offer',
    section: 'A focused storefront built around clarity and trust.'
  },
  present: {
    heading: 'A clear home for your work and ideas.',
    body: 'Introduce your activity with a strong first impression and a simple path through what matters.',
    cta: 'Discover more',
    section: 'Your story, services, and proof in one coherent experience.'
  }
}

/** Convert a safely captured source blueprint into a bounded, versioned site document. */
export function createSiteDocument(
  blueprint: SiteSourceBlueprint,
  mode: SiteSourceMode,
  goal?: SiteGoal
): SiteDocument {
  const sourceOrigin = new URL(blueprint.sourceUrl).origin
  const inspiration = INSPIRATION_COPY[goal ?? inferSiteGoal(blueprint)]
  const sourceSections =
    blueprint.sections.length > 0 ? blueprint.sections : [fallbackSection(blueprint)]
  const sections = sourceSections.slice(0, 12).map((section, index) => {
    const sourceHeading = cleanText(section.heading, 180)
    const sourceBody = cleanText(section.body, 1200)
    const isHero = index === 0
    const sectionVisual = normalizeSectionVisual(section.visual)
    return {
      id: `section-${index + 1}`,
      kind: isHero ? 'hero' : inferSectionKind(section, index, sourceSections.length),
      heading:
        mode === 'owned'
          ? sourceHeading || (isHero ? blueprint.title : `About ${blueprint.brandName}`)
          : isHero
            ? inspiration.heading
            : inspiration.section,
      body:
        mode === 'owned'
          ? sourceBody || blueprint.description
          : isHero
            ? inspiration.body
            : 'Add your own proof, services, or story here. CodeRocket keeps the visual direction without copying the source content.',
      imageUrl: mode === 'owned' ? safeHttpsUrl(section.imageUrl) : undefined,
      imageAlt:
        mode === 'owned' && section.imageUrl ? cleanText(section.imageAlt ?? '', 240) : undefined,
      items:
        mode === 'owned' && section.items
          ? section.items.slice(0, 12).flatMap((item, itemIndex) => {
              const title = cleanText(item.title, 180)
              if (!title) return []
              return [
                {
                  id: `section-${index + 1}-item-${itemIndex + 1}`,
                  title,
                  body: cleanText(item.body, 500),
                  imageUrl: safeHttpsUrl(item.imageUrl),
                  imageAlt: item.imageUrl ? cleanText(item.imageAlt ?? '', 240) : undefined,
                  links: normalizeLinks(item.links, sourceOrigin).slice(0, 2),
                  price: item.price ? cleanText(item.price, 80) : undefined
                }
              ]
            })
          : undefined,
      links:
        mode === 'owned'
          ? normalizeLinks(section.links, sourceOrigin).slice(0, 4)
          : isHero
            ? [{ href: `${sourceOrigin}/#contact`, label: inspiration.cta }]
            : [],
      backgroundColor: safeColor(section.backgroundColor, blueprint.backgroundColor),
      foregroundColor: safeColor(section.foregroundColor, blueprint.foregroundColor),
      layout: section.layout ?? (isHero ? 'split' : section.imageUrl ? 'split' : 'stacked'),
      ...(sectionVisual ? { visual: sectionVisual } : {})
    }
  })
  const visualTheme = normalizeVisualTheme(blueprint.visualTheme)

  return siteDocumentSchema.parse({
    version: 1,
    source: {
      url: blueprint.sourceUrl,
      mode,
      capturedAt: blueprint.capturedAt
    },
    identity: {
      name: mode === 'owned' ? cleanText(blueprint.brandName, 120) : 'Your business',
      logoUrl: mode === 'owned' ? safeHttpsUrl(blueprint.logoUrl) : undefined
    },
    theme: {
      backgroundColor: safeColor(blueprint.backgroundColor, '#ffffff'),
      foregroundColor: safeColor(blueprint.foregroundColor, '#111827'),
      accentColor: safeColor(blueprint.accentColor, '#5b5bd6'),
      fontStyle: 'sans',
      ...(visualTheme ? { visual: visualTheme } : {})
    },
    navigation:
      mode === 'owned'
        ? normalizeLinks(blueprint.navigation, sourceOrigin).slice(0, 8)
        : [{ href: `${sourceOrigin}/#contact`, label: inspiration.cta }],
    sections,
    recreation: {
      capturedViewports: visualTheme ? ['mobile', 'tablet', 'desktop'] : ['desktop'],
      visualAnalysis: blueprint.visualAnalysis ?? 'responsive-dom',
      requiresReview: true
    }
  })
}

/** Combine independently captured pages into one bounded website with an explicit coverage receipt. */
export function createSiteBundleDocument(
  homepage: SiteDocument,
  pages: Array<{ document: SiteDocument; path: string }>,
  discoveredPages: number,
  failedPaths: string[]
): SiteDocument {
  const bundledPages = pages.slice(0, 50).map(page =>
    sitePageSchema.parse({
      path: page.path,
      title: page.document.sections[0]?.heading ?? page.document.identity.name,
      sections: page.document.sections,
      identity: page.document.identity,
      theme: page.document.theme,
      navigation: page.document.navigation
    })
  )
  return siteDocumentSchema.parse({
    ...homepage,
    pages: bundledPages,
    importSummary: {
      discoveredPages: Math.max(1, Math.min(200, discoveredPages)),
      capturedPages: bundledPages.length,
      failedPaths: failedPaths.slice(0, 50)
    }
  })
}

/** Select one captured path with the identity, theme, and navigation measured on that page. */
export function selectSiteDocumentPage(
  document: SiteDocument,
  requestedPath: string
): SiteDocument | undefined {
  if (requestedPath === '/' && !document.pages) return document
  const page = document.pages?.find(candidate => candidate.path === requestedPath)
  if (!page) return undefined
  return {
    ...document,
    identity: page.identity ?? document.identity,
    theme: page.theme ?? document.theme,
    navigation: page.navigation ?? document.navigation,
    sections: page.sections
  }
}

/** Create one usable section when the rendered page exposes no clear section containers. */
function fallbackSection(blueprint: SiteSourceBlueprint): SourceSectionBlueprint {
  return {
    backgroundColor: blueprint.backgroundColor,
    body: blueprint.description,
    foregroundColor: blueprint.foregroundColor,
    heading: blueprint.title,
    links: []
  }
}

/** Validate captured theme values and replace unsafe CSS fragments with stable fallbacks. */
function normalizeVisualTheme(value?: SiteVisualTheme): SiteVisualTheme | undefined {
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
function normalizeSectionVisual(
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
function inferSectionKind(
  section: SourceSectionBlueprint,
  index: number,
  total: number
): 'content' | 'features' | 'collection' | 'gallery' | 'pricing' | 'testimonials' | 'cta' {
  if (index === total - 1 && section.links.length > 0) return 'cta'
  if (section.items && section.items.length > 1) {
    const searchable = [
      section.heading,
      section.body,
      ...section.items.flatMap(item => [item.title, item.body, item.price ?? ''])
    ]
      .join(' ')
      .toLowerCase()
    if (section.items.some(item => Boolean(item.price))) return 'pricing'
    if (
      /\b(review|reviews|testimonial|testimonials|avis|témoignage|témoignages)\b/.test(searchable)
    )
      return 'testimonials'
    if (section.items.every(item => item.imageUrl && !item.body)) return 'gallery'
    return 'collection'
  }
  if (section.links.length > 1) return 'features'
  return 'content'
}

/** Collapse and bound untrusted visible copy. */
function cleanText(value: string, maximumLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maximumLength)
}

/** Keep only complete secure asset URLs. */
function safeHttpsUrl(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** Keep common computed CSS color formats and reject arbitrary declarations. */
function safeColor(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase()
  if (
    /^#[0-9a-f]{3,8}$/.test(normalized) ||
    /^rgba?\([\d\s.,%/]+\)$/.test(normalized) ||
    /^hsla?\([\d\s.,%/a-z-]+\)$/.test(normalized) ||
    /^oklch\([\d\s.%/a-z-]+\)$/.test(normalized)
  )
    return normalized
  return fallback
}

/** Resolve visible links against the source origin and retain only secure destinations. */
function normalizeLinks(
  links: Array<{ href: string; label: string }>,
  sourceOrigin: string
): Array<{ href: string; label: string }> {
  return links.flatMap(link => {
    const label = cleanText(link.label, 80)
    if (!label) return []
    try {
      const url = new URL(link.href, sourceOrigin)
      return url.protocol === 'https:' ? [{ href: url.toString(), label }] : []
    } catch {
      return []
    }
  })
}
