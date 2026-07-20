import { normalizeLinks } from './site-document-links'
import {
  cleanText,
  inferSectionKind,
  normalizeSectionVisual,
  safeColor,
  safeHttpsUrl
} from './site-document-normalize'
import type { SiteDocument } from './site-document-schema'
import { normalizeSourceForm } from './site-form'
import type {
  SiteSourceBlueprint,
  SourceContentItem,
  SourceSectionBlueprint
} from './site-source-blueprint'

interface InspirationCopy {
  body: string
  cta: string
  heading: string
  section: string
}

/** Convert captured sections into the controlled blocks persisted by CodeRocket. */
export function createSiteSections(
  blueprint: SiteSourceBlueprint,
  sourceSections: SourceSectionBlueprint[],
  owned: boolean,
  inspiration: InspirationCopy,
  sourceOrigin: string
): SiteDocument['sections'] {
  return sourceSections
    .slice(0, 12)
    .map((section, index) =>
      owned
        ? createOwnedSection(blueprint, section, index, sourceSections.length, sourceOrigin)
        : createInspiredSection(blueprint, section, index, sourceSections.length, inspiration)
    )
}

/** Preserve bounded visible source data for a website the owner is authorised to recreate. */
function createOwnedSection(
  blueprint: SiteSourceBlueprint,
  section: SourceSectionBlueprint,
  index: number,
  total: number,
  sourceOrigin: string
): SiteDocument['sections'][number] {
  const isHero = index === 0
  const hasStructure = Boolean(
    section.form || section.imageUrl || (section.items && section.items.length > 0)
  )
  const visual = normalizeSectionVisual(section.visual)
  return {
    id: `section-${index + 1}`,
    kind: isHero ? 'hero' : inferSectionKind(section, index, total),
    heading: ownedHeading(blueprint, section, isHero, hasStructure),
    body: ownedBody(blueprint, section, hasStructure),
    imageUrl: safeHttpsUrl(section.imageUrl),
    imageWidth: section.imageWidth,
    imageMobileWidth: section.imageMobileWidth,
    imageAlt: section.imageUrl ? cleanText(section.imageAlt ?? '', 240) : undefined,
    items: createOwnedItems(section.items, index, sourceOrigin),
    links: normalizeLinks(section.links, sourceOrigin).slice(0, 4),
    form: section.form ? normalizeSourceForm(section.form, sourceOrigin) : undefined,
    backgroundColor: safeColor(section.backgroundColor, blueprint.backgroundColor),
    foregroundColor: safeColor(section.foregroundColor, blueprint.foregroundColor),
    layout: section.layout ?? defaultLayout(section, isHero),
    ...(visual ? { visual } : {})
  }
}

/** Use safe replacement copy when the source is inspiration rather than owner-provided content. */
function createInspiredSection(
  blueprint: SiteSourceBlueprint,
  section: SourceSectionBlueprint,
  index: number,
  total: number,
  inspiration: InspirationCopy
): SiteDocument['sections'][number] {
  const isHero = index === 0
  const visual = normalizeSectionVisual(section.visual)
  return {
    id: `section-${index + 1}`,
    kind: isHero ? 'hero' : inferSectionKind(section, index, total),
    heading: isHero ? inspiration.heading : inspiration.section,
    body: isHero
      ? inspiration.body
      : 'Add your own proof, services, or story here. CodeRocket keeps the visual direction without copying the source content.',
    links: isHero
      ? [{ href: `${new URL(blueprint.sourceUrl).origin}/#contact`, label: inspiration.cta }]
      : [],
    backgroundColor: safeColor(section.backgroundColor, blueprint.backgroundColor),
    foregroundColor: safeColor(section.foregroundColor, blueprint.foregroundColor),
    layout: section.layout ?? defaultLayout(section, isHero),
    ...(visual ? { visual } : {})
  }
}

/** Avoid adding a title that was never visible around a captured form or image. */
function ownedHeading(
  blueprint: SiteSourceBlueprint,
  section: SourceSectionBlueprint,
  isHero: boolean,
  hasStructure: boolean
): string {
  const heading = cleanText(section.heading, 180)
  if (heading) return heading
  if (hasStructure) return ''
  return isHero ? blueprint.title : `About ${blueprint.brandName}`
}

/** Avoid promoting metadata descriptions into visible copy beside structured source content. */
function ownedBody(
  blueprint: SiteSourceBlueprint,
  section: SourceSectionBlueprint,
  hasStructure: boolean
): string {
  const body = cleanText(section.body, 1200)
  if (body) return body
  return hasStructure ? '' : blueprint.description
}

/** Convert repeated cards without allowing empty synthetic items into the document. */
function createOwnedItems(
  items: SourceContentItem[] | undefined,
  sectionIndex: number,
  sourceOrigin: string
): SiteDocument['sections'][number]['items'] {
  return items?.slice(0, 12).flatMap((item, itemIndex) => {
    const title = cleanText(item.title, 180)
    if (!title) return []
    return [
      {
        id: `section-${sectionIndex + 1}-item-${itemIndex + 1}`,
        title,
        body: cleanText(item.body, 500),
        imageUrl: safeHttpsUrl(item.imageUrl),
        imageAlt: item.imageUrl ? cleanText(item.imageAlt ?? '', 240) : undefined,
        links: normalizeLinks(item.links, sourceOrigin).slice(0, 2),
        price: item.price ? cleanText(item.price, 80) : undefined
      }
    ]
  })
}

/** Choose a stable layout only when the source did not expose one. */
function defaultLayout(section: SourceSectionBlueprint, isHero: boolean): 'split' | 'stacked' {
  if (isHero || section.imageUrl) return 'split'
  return 'stacked'
}
