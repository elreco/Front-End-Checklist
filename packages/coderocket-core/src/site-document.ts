import { z } from 'zod'

export type SiteSourceMode = 'owned' | 'inspiration'
export type SiteGoal = 'contact' | 'booking' | 'sell' | 'present'

export interface SourceSectionBlueprint {
  backgroundColor: string
  body: string
  foregroundColor: string
  heading: string
  imageAlt?: string
  imageUrl?: string
  links: Array<{ href: string; label: string }>
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
}

const httpsUrlSchema = z
  .string()
  .url()
  .refine(value => value.startsWith('https://'))
const siteLinkSchema = z.object({
  href: httpsUrlSchema,
  label: z.string().trim().min(1).max(80)
})
const siteSectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  kind: z.enum(['hero', 'content', 'features', 'cta']),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().max(1200),
  imageAlt: z.string().trim().max(240).optional(),
  imageUrl: httpsUrlSchema.optional(),
  links: z.array(siteLinkSchema).max(4),
  backgroundColor: z.string().max(80),
  foregroundColor: z.string().max(80),
  layout: z.enum(['centered', 'split', 'stacked'])
})
const sitePageSchema = z.object({
  path: z
    .string()
    .regex(/^\/(?:[^?#\s]*)$/)
    .max(1024),
  title: z.string().trim().min(1).max(180),
  sections: z.array(siteSectionSchema).min(1).max(12)
})

export const siteDocumentSchema = z.object({
  version: z.literal(1),
  source: z.object({
    url: httpsUrlSchema,
    mode: z.enum(['owned', 'inspiration']),
    capturedAt: z.iso.datetime()
  }),
  identity: z.object({
    name: z.string().trim().min(1).max(120),
    logoUrl: httpsUrlSchema.optional()
  }),
  theme: z.object({
    backgroundColor: z.string().max(80),
    foregroundColor: z.string().max(80),
    accentColor: z.string().max(80),
    fontStyle: z.enum(['sans', 'editorial', 'technical'])
  }),
  navigation: z.array(siteLinkSchema).max(8),
  sections: z.array(siteSectionSchema).min(1).max(12),
  pages: z.array(sitePageSchema).min(1).max(50).optional(),
  importSummary: z
    .object({
      discoveredPages: z.number().int().min(1).max(200),
      capturedPages: z.number().int().min(1).max(50),
      failedPaths: z.array(z.string().max(1024)).max(50)
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
      links:
        mode === 'owned'
          ? normalizeLinks(section.links, sourceOrigin).slice(0, 4)
          : isHero
            ? [{ href: `${sourceOrigin}/#contact`, label: inspiration.cta }]
            : [],
      backgroundColor: safeColor(section.backgroundColor, blueprint.backgroundColor),
      foregroundColor: safeColor(section.foregroundColor, blueprint.foregroundColor),
      layout: isHero ? 'split' : section.imageUrl ? 'split' : 'stacked'
    }
  })

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
      fontStyle: 'sans'
    },
    navigation:
      mode === 'owned'
        ? normalizeLinks(blueprint.navigation, sourceOrigin).slice(0, 8)
        : [{ href: `${sourceOrigin}/#contact`, label: inspiration.cta }],
    sections
  })
}

function inferSiteGoal(blueprint: SiteSourceBlueprint): SiteGoal {
  const searchableContent = [
    blueprint.title,
    blueprint.description,
    blueprint.brandName,
    ...blueprint.navigation.flatMap(item => [item.label, item.href]),
    ...blueprint.sections.flatMap(section => [
      section.heading,
      section.body,
      ...section.links.flatMap(link => [link.label, link.href])
    ])
  ]
    .join(' ')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (
    /\b(appointment|book|booking|calendly|calendar|rendez-vous|reservation|reserve|reserver)\b/.test(
      searchableContent
    )
  )
    return 'booking'
  if (
    /\b(acheter|boutique|buy|cart|checkout|commander|panier|product|shop|store)\b/.test(
      searchableContent
    )
  )
    return 'sell'
  if (/\b(appel|call|contact|devis|estimate|quote)\b/.test(searchableContent)) return 'contact'
  return 'present'
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
      sections: page.document.sections
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

/** Return the builder limits whose variable-cost ceilings protect plan margin. */
export function getBuilderPlanEntitlements(plan: 'free' | 'solo' | 'agency') {
  if (plan === 'agency')
    return {
      sites: 10,
      pagesPerImport: 50,
      importsPerMonth: 50,
      hostedVisitsPerMonth: 250_000,
      storageMegabytes: 10_240,
      variableCostBudgetMicroeur: 40_000_000
    }
  if (plan === 'solo')
    return {
      sites: 1,
      pagesPerImport: 10,
      importsPerMonth: 5,
      hostedVisitsPerMonth: 20_000,
      storageMegabytes: 1024,
      variableCostBudgetMicroeur: 6_000_000
    }
  return {
    sites: 0,
    pagesPerImport: 0,
    importsPerMonth: 0,
    hostedVisitsPerMonth: 0,
    storageMegabytes: 0,
    variableCostBudgetMicroeur: 0
  }
}

function fallbackSection(blueprint: SiteSourceBlueprint): SourceSectionBlueprint {
  return {
    backgroundColor: blueprint.backgroundColor,
    body: blueprint.description,
    foregroundColor: blueprint.foregroundColor,
    heading: blueprint.title,
    links: []
  }
}

function inferSectionKind(
  section: SourceSectionBlueprint,
  index: number,
  total: number
): 'content' | 'features' | 'cta' {
  if (index === total - 1 && section.links.length > 0) return 'cta'
  if (section.links.length > 1) return 'features'
  return 'content'
}

function cleanText(value: string, maximumLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maximumLength)
}

function safeHttpsUrl(value?: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

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
