import { z } from 'zod'
import { type SiteDocument, siteDocumentSchema } from './site-document'

const httpsUrlSchema = z
  .string()
  .url()
  .refine(value => value.startsWith('https://'))
const pagePathSchema = z
  .string()
  .regex(/^\/(?:[^?#\s]*)$/)
  .max(1024)
const sectionKindSchema = z.enum([
  'content',
  'features',
  'collection',
  'gallery',
  'testimonials',
  'pricing',
  'form',
  'cta'
])
export const siteEditSelectionSchema = z.object({
  kind: z.enum(['brand', 'section', 'heading', 'text', 'button', 'image', 'collection_item']),
  label: z.string().trim().min(1).max(240),
  pagePath: pagePathSchema,
  sectionId: z
    .string()
    .regex(/^[a-z0-9-]{1,80}$/)
    .optional(),
  itemId: z
    .string()
    .regex(/^[a-z0-9-]{1,120}$/)
    .optional()
})
const updateIdentitySchema = z.object({
  type: z.literal('update_identity'),
  name: z.string().trim().min(1).max(120)
})
const updateThemeSchema = z.object({
  type: z.literal('update_theme'),
  accentColor: z.string().max(80).optional(),
  backgroundColor: z.string().max(80).optional(),
  foregroundColor: z.string().max(80).optional()
})
const updateSectionSchema = z.object({
  type: z.literal('update_section'),
  pagePath: pagePathSchema,
  sectionId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  heading: z.string().trim().min(1).max(180).optional(),
  body: z.string().trim().max(1200).optional(),
  layout: z.enum(['centered', 'split', 'stacked']).optional(),
  backgroundColor: z.string().max(80).optional(),
  foregroundColor: z.string().max(80).optional(),
  actionLabel: z.string().trim().min(1).max(80).optional(),
  actionUrl: httpsUrlSchema.optional(),
  imageUrl: httpsUrlSchema.optional(),
  imageAlt: z.string().trim().max(240).optional()
})
const updateItemSchema = z.object({
  type: z.literal('update_item'),
  pagePath: pagePathSchema,
  sectionId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  itemId: z.string().regex(/^[a-z0-9-]{1,120}$/),
  title: z.string().trim().min(1).max(180).optional(),
  body: z.string().trim().max(1200).optional(),
  price: z.string().trim().max(80).optional(),
  imageUrl: httpsUrlSchema.optional(),
  imageAlt: z.string().trim().max(240).optional(),
  actionLabel: z.string().trim().min(1).max(80).optional(),
  actionUrl: httpsUrlSchema.optional()
})
const addSectionSchema = z.object({
  type: z.literal('add_section'),
  pagePath: pagePathSchema,
  afterSectionId: z
    .string()
    .regex(/^[a-z0-9-]{1,80}$/)
    .optional(),
  kind: sectionKindSchema,
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().max(1200),
  layout: z.enum(['centered', 'split', 'stacked']),
  backgroundColor: z.string().max(80),
  foregroundColor: z.string().max(80),
  actionLabel: z.string().trim().min(1).max(80).optional(),
  actionUrl: httpsUrlSchema.optional()
})
const removeSectionSchema = z.object({
  type: z.literal('remove_section'),
  pagePath: pagePathSchema,
  sectionId: z.string().regex(/^[a-z0-9-]{1,80}$/)
})
const addPageSchema = z.object({
  type: z.literal('add_page'),
  path: pagePathSchema.refine(path => path !== '/'),
  title: z.string().trim().min(1).max(180),
  heading: z.string().trim().min(1).max(180),
  body: z.string().trim().max(1200),
  layout: z.enum(['centered', 'split', 'stacked']),
  backgroundColor: z.string().max(80),
  foregroundColor: z.string().max(80),
  actionLabel: z.string().trim().min(1).max(80).optional(),
  actionUrl: httpsUrlSchema.optional()
})

export const siteEditPlanSchema = z.object({
  response: z.string().trim().min(1).max(500),
  summary: z.string().trim().min(1).max(120),
  operations: z
    .array(
      z.discriminatedUnion('type', [
        updateIdentitySchema,
        updateThemeSchema,
        updateSectionSchema,
        updateItemSchema,
        addSectionSchema,
        removeSectionSchema,
        addPageSchema
      ])
    )
    .min(1)
    .max(8)
})

export type SiteEditPlan = z.infer<typeof siteEditPlanSchema>
export type SiteEditSelection = z.infer<typeof siteEditSelectionSchema>
type SiteSection = SiteDocument['sections'][number]

/** Apply one schema-validated assistant plan without executing arbitrary generated code. */
export function applySiteEditPlan(document: SiteDocument, plan: SiteEditPlan): SiteDocument {
  let nextDocument = structuredClone(document)
  for (const operation of plan.operations) {
    if (operation.type === 'update_identity') {
      nextDocument.identity.name = operation.name
      continue
    }
    if (operation.type === 'update_theme') {
      nextDocument.theme = {
        ...nextDocument.theme,
        ...(operation.accentColor
          ? {
              accentColor: safeEditableColor(operation.accentColor, nextDocument.theme.accentColor)
            }
          : {}),
        ...(operation.backgroundColor
          ? {
              backgroundColor: safeEditableColor(
                operation.backgroundColor,
                nextDocument.theme.backgroundColor
              )
            }
          : {}),
        ...(operation.foregroundColor
          ? {
              foregroundColor: safeEditableColor(
                operation.foregroundColor,
                nextDocument.theme.foregroundColor
              )
            }
          : {})
      }
      continue
    }
    if (operation.type === 'add_page') {
      nextDocument = addPage(nextDocument, operation)
      continue
    }
    nextDocument = updatePageSections(nextDocument, operation.pagePath, sections => {
      if (operation.type === 'update_section')
        return sections.map(section =>
          section.id === operation.sectionId ? updateSection(section, operation) : section
        )
      if (operation.type === 'update_item')
        return sections.map(section =>
          section.id === operation.sectionId ? updateSectionItem(section, operation) : section
        )
      if (operation.type === 'remove_section')
        return sections.length > 1
          ? sections.filter(section => section.id !== operation.sectionId)
          : sections
      const section = createSection(nextDocument, operation, sections)
      const afterIndex = operation.afterSectionId
        ? sections.findIndex(candidate => candidate.id === operation.afterSectionId)
        : sections.length - 1
      const insertionIndex = afterIndex < 0 ? sections.length : afterIndex + 1
      return [...sections.slice(0, insertionIndex), section, ...sections.slice(insertionIndex)]
    })
  }
  return siteDocumentSchema.parse(nextDocument)
}

/** Add one controlled page and expose it in navigation without generating arbitrary source files. */
function addPage(document: SiteDocument, operation: z.infer<typeof addPageSchema>): SiteDocument {
  const existingPages = document.pages ?? [
    {
      path: '/',
      title: document.sections[0]?.heading ?? document.identity.name,
      sections: document.sections
    }
  ]
  if (existingPages.some(page => page.path === operation.path) || existingPages.length >= 50)
    return document
  const idBase =
    operation.path
      .split('/')
      .filter(Boolean)
      .join('-')
      .replaceAll(/[^a-z0-9-]/gi, '')
      .toLowerCase() || 'page'
  const section: SiteSection = {
    id: `${idBase.slice(0, 60)}-hero`,
    kind: 'hero',
    heading: operation.heading,
    body: operation.body,
    links:
      operation.actionLabel && operation.actionUrl
        ? [{ href: operation.actionUrl, label: operation.actionLabel }]
        : [],
    backgroundColor: safeEditableColor(operation.backgroundColor, document.theme.backgroundColor),
    foregroundColor: safeEditableColor(operation.foregroundColor, document.theme.foregroundColor),
    layout: operation.layout
  }
  const publicHref = new URL(operation.path, document.source.url).toString()
  return {
    ...document,
    pages: [
      ...existingPages,
      { path: operation.path, title: operation.title, sections: [section] }
    ],
    navigation:
      document.navigation.length < 8
        ? [...document.navigation, { href: publicHref, label: operation.title }]
        : document.navigation
  }
}

/** Update one existing section while retaining untouched captured structure and media. */
function updateSection(
  section: SiteSection,
  operation: z.infer<typeof updateSectionSchema>
): SiteSection {
  const firstLink = section.links[0]
  const updatedFirstLink =
    firstLink && (operation.actionLabel || operation.actionUrl)
      ? {
          label: operation.actionLabel ?? firstLink.label,
          href: operation.actionUrl ?? firstLink.href
        }
      : operation.actionUrl
        ? { label: operation.actionLabel ?? 'Learn more', href: operation.actionUrl }
        : undefined
  return {
    ...section,
    ...(operation.heading ? { heading: operation.heading } : {}),
    ...(operation.body !== undefined ? { body: operation.body } : {}),
    ...(operation.layout ? { layout: operation.layout } : {}),
    ...(operation.backgroundColor
      ? {
          backgroundColor: safeEditableColor(operation.backgroundColor, section.backgroundColor)
        }
      : {}),
    ...(operation.foregroundColor
      ? {
          foregroundColor: safeEditableColor(operation.foregroundColor, section.foregroundColor)
        }
      : {}),
    ...(operation.imageUrl ? { imageUrl: operation.imageUrl } : {}),
    ...(operation.imageAlt !== undefined ? { imageAlt: operation.imageAlt } : {}),
    ...(updatedFirstLink
      ? { links: [updatedFirstLink, ...section.links.slice(firstLink ? 1 : 0)] }
      : {})
  }
}

/** Update one repeated card while retaining the rest of its captured collection. */
function updateSectionItem(
  section: SiteSection,
  operation: z.infer<typeof updateItemSchema>
): SiteSection {
  return {
    ...section,
    items: section.items?.map(item => {
      if (item.id !== operation.itemId) return item
      const firstLink = item.links[0]
      const nextLink =
        firstLink && (operation.actionLabel || operation.actionUrl)
          ? {
              label: operation.actionLabel ?? firstLink.label,
              href: operation.actionUrl ?? firstLink.href
            }
          : operation.actionUrl
            ? { label: operation.actionLabel ?? 'Learn more', href: operation.actionUrl }
            : undefined
      return {
        ...item,
        ...(operation.title ? { title: operation.title } : {}),
        ...(operation.body !== undefined ? { body: operation.body } : {}),
        ...(operation.price !== undefined ? { price: operation.price } : {}),
        ...(operation.imageUrl ? { imageUrl: operation.imageUrl } : {}),
        ...(operation.imageAlt !== undefined ? { imageAlt: operation.imageAlt } : {}),
        ...(nextLink ? { links: [nextLink, ...item.links.slice(firstLink ? 1 : 0)] } : {})
      }
    })
  }
}

/** Create one controlled section from a bounded assistant operation. */
function createSection(
  document: SiteDocument,
  operation: z.infer<typeof addSectionSchema>,
  sections: SiteSection[]
): SiteSection {
  const baseId = operation.heading
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 48)
  const id = uniqueSectionId(baseId || 'section', new Set(sections.map(section => section.id)))
  return {
    id,
    kind: operation.kind,
    heading: operation.heading,
    body: operation.body,
    links:
      operation.actionLabel && operation.actionUrl
        ? [{ href: operation.actionUrl, label: operation.actionLabel }]
        : [],
    backgroundColor: safeEditableColor(operation.backgroundColor, document.theme.backgroundColor),
    foregroundColor: safeEditableColor(operation.foregroundColor, document.theme.foregroundColor),
    layout: operation.layout
  }
}

/** Keep root sections and the optional root page in sync after every controlled change. */
function updatePageSections(
  document: SiteDocument,
  pagePath: string,
  update: (sections: SiteSection[]) => SiteSection[]
): SiteDocument {
  const selectedPage = document.pages?.find(page => page.path === pagePath)
  if (pagePath !== '/' && !selectedPage) return document
  const sections = update(selectedPage?.sections ?? document.sections).slice(0, 12)
  return {
    ...document,
    sections: pagePath === '/' ? sections : document.sections,
    pages: document.pages?.map(page =>
      page.path === pagePath
        ? { ...page, sections, title: sections[0]?.heading ?? page.title }
        : page
    )
  }
}

/** Create a stable unique section identifier without leaking generated implementation details. */
function uniqueSectionId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  let suffix = 2
  while (existing.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

/** Accept common CSS colour forms and reject declarations or executable fragments. */
function safeEditableColor(value: string, fallback: string): string {
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
