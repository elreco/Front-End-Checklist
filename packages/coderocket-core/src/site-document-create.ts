import { normalizeLinks } from './site-document-links'
import {
  cleanText,
  fallbackSection,
  normalizeVisualTheme,
  safeColor,
  safeHttpsUrl
} from './site-document-normalize'
import { type SiteDocument, siteDocumentSchema } from './site-document-schema'
import { createSiteSections } from './site-document-sections'
import { inferSiteGoal } from './site-goal'
import type { SiteGoal, SiteSourceBlueprint, SiteSourceMode } from './site-source-blueprint'

interface InspirationCopy {
  body: string
  cta: string
  heading: string
  section: string
}

const INSPIRATION_COPY: Record<SiteGoal, InspirationCopy> = {
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
  const visualTheme = normalizeVisualTheme(blueprint.visualTheme)

  return siteDocumentSchema.parse({
    version: 1,
    source: {
      url: blueprint.sourceUrl,
      mode,
      capturedAt: blueprint.capturedAt
    },
    identity: createIdentity(blueprint, mode),
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
    footer: createFooter(blueprint, mode, sourceOrigin),
    sections: createSiteSections(
      blueprint,
      sourceSections,
      mode === 'owned',
      inspiration,
      sourceOrigin
    ),
    recreation: {
      capturedViewports: visualTheme ? ['mobile', 'tablet', 'desktop'] : ['desktop'],
      visualAnalysis: blueprint.visualAnalysis ?? 'responsive-dom',
      requiresReview: true
    }
  })
}

/** Keep the captured brand only when the user owns the source content. */
function createIdentity(blueprint: SiteSourceBlueprint, mode: SiteSourceMode) {
  return {
    name: mode === 'owned' ? cleanText(blueprint.brandName, 120) : 'Your business',
    logoUrl: mode === 'owned' ? safeHttpsUrl(blueprint.logoUrl) : undefined,
    showInHeader: mode === 'owned' ? (blueprint.headerBrandVisible ?? true) : true
  }
}

/** Preserve a real source footer without inventing one for a sparse capture. */
function createFooter(blueprint: SiteSourceBlueprint, mode: SiteSourceMode, sourceOrigin: string) {
  if (mode !== 'owned' || (!blueprint.footerLinks?.length && !blueprint.footerText))
    return undefined
  return {
    links: normalizeLinks(blueprint.footerLinks ?? [], sourceOrigin).slice(0, 12),
    ...(blueprint.footerText ? { text: cleanText(blueprint.footerText, 240) } : {})
  }
}
