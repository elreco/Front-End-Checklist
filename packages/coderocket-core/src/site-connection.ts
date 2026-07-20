import { z } from 'zod'
import { type SiteDocument, siteDocumentSchema } from './site-document'

export const siteConnectionProviderSchema = z.enum([
  'coderocket_data',
  'stripe',
  'calendly',
  'shopify',
  'supabase'
])
export const siteConnectionCapabilitySchema = z.enum([
  'data',
  'payments',
  'bookings',
  'commerce',
  'accounts'
])
export const siteConnectionStatusSchema = z.enum(['available', 'setup', 'connected', 'attention'])
export const siteConnectionModeSchema = z.enum(['managed', 'link', 'account'])

export type SiteConnectionProvider = z.infer<typeof siteConnectionProviderSchema>
export type SiteConnectionCapability = z.infer<typeof siteConnectionCapabilitySchema>
export type SiteConnectionStatus = z.infer<typeof siteConnectionStatusSchema>
export type SiteConnectionMode = z.infer<typeof siteConnectionModeSchema>

export interface SiteConnectionContext {
  accountId?: string
  capability: SiteConnectionCapability
  defaultCurrency?: string
  mode: SiteConnectionMode
  provider: SiteConnectionProvider
  publicUrl?: string
  status: SiteConnectionStatus
}

export interface SiteConnectionPlacement {
  itemId?: string
  pagePath?: string
  sectionId?: string
}

type SiteSection = SiteDocument['sections'][number]

/** Apply a public service URL only where the project already expresses the matching outcome. */
export function applyPublicSiteConnection(
  document: SiteDocument,
  input: {
    placement?: SiteConnectionPlacement
    previousUrl?: string
    provider: 'calendly' | 'stripe'
    url: string
  }
): { applied: number; document: SiteDocument } {
  const parsedUrl = new URL(input.url)
  if (parsedUrl.protocol !== 'https:') return { applied: 0, document }
  let applied = 0
  /** Apply the connector to every relevant section while retaining the total change count. */
  const updateSections = (sections: SiteSection[], pagePath: string) =>
    sections.map(section => {
      const result = applyConnectionToSection(section, pagePath, input)
      applied += result.applied
      return result.section
    })
  const nextDocument: SiteDocument = {
    ...document,
    sections: updateSections(document.sections, '/'),
    pages: document.pages?.map(page => ({
      ...page,
      sections: updateSections(page.sections, page.path)
    }))
  }
  return { applied, document: siteDocumentSchema.parse(nextDocument) }
}

/** Remove one provider URL from every editable action while preserving all other content. */
export function removePublicSiteConnection(
  document: SiteDocument,
  url: string
): { document: SiteDocument; removed: number } {
  let removed = 0
  /** Strip the exact provider URL from section and item actions. */
  const updateSections = (sections: SiteSection[]) =>
    sections.map(section => ({
      ...section,
      links: section.links.filter(link => {
        if (link.href !== url) return true
        removed += 1
        return false
      }),
      items: section.items?.map(item => ({
        ...item,
        links: item.links.filter(link => {
          if (link.href !== url) return true
          removed += 1
          return false
        })
      }))
    }))
  const nextDocument: SiteDocument = {
    ...document,
    sections: updateSections(document.sections),
    pages: document.pages?.map(page => ({ ...page, sections: updateSections(page.sections) }))
  }
  return { document: siteDocumentSchema.parse(nextDocument), removed }
}

/** Apply one public connector to a matching section or explicitly requested target. */
function applyConnectionToSection(
  section: SiteSection,
  pagePath: string,
  input: {
    placement?: SiteConnectionPlacement
    previousUrl?: string
    provider: 'calendly' | 'stripe'
    url: string
  }
): { applied: number; section: SiteSection } {
  const exactSection =
    input.placement?.sectionId === section.id &&
    (!input.placement.pagePath || input.placement.pagePath === pagePath)
  const relevant = exactSection || sectionMatchesProvider(section, input.provider)
  if (!relevant) return { applied: 0, section }
  let applied = 0
  const items = section.items?.map(item => {
    const exactItem = exactSection && input.placement?.itemId === item.id
    const canAddStripeCheckout =
      input.provider === 'stripe' && Boolean(item.price) && (exactItem || item.links.length === 0)
    const replaceIndex = item.links.findIndex(link => link.href === input.previousUrl)
    if (!(canAddStripeCheckout || replaceIndex >= 0)) return item
    applied += 1
    const link = {
      href: input.url,
      label: item.links[replaceIndex]?.label ?? 'Buy now'
    }
    return {
      ...item,
      links:
        replaceIndex >= 0
          ? item.links.map((candidate, index) => (index === replaceIndex ? link : candidate))
          : [link, ...item.links].slice(0, 2)
    }
  })
  const replaceIndex = section.links.findIndex(link => link.href === input.previousUrl)
  const shouldAddSectionAction =
    exactSection || (section.links.length === 0 && !section.items?.some(item => item.price))
  const links =
    replaceIndex >= 0
      ? section.links.map((link, index) =>
          index === replaceIndex ? { ...link, href: input.url } : link
        )
      : shouldAddSectionAction
        ? [
            {
              href: input.url,
              label: input.provider === 'stripe' ? 'Buy now' : 'Book an appointment'
            },
            ...section.links
          ].slice(0, 4)
        : section.links
  if (replaceIndex >= 0 || shouldAddSectionAction) applied += 1
  return { applied, section: { ...section, items, links } }
}

/** Infer whether a section expresses the business outcome served by the provider. */
function sectionMatchesProvider(section: SiteSection, provider: 'calendly' | 'stripe'): boolean {
  const searchable = `${section.heading} ${section.body}`.toLowerCase()
  if (provider === 'stripe')
    return (
      section.kind === 'collection' ||
      section.kind === 'pricing' ||
      /\b(?:buy|orders?|price|pricing|products?|shop|store|purchase|acheter|commandes?|prix|produits?|boutique)\b/.test(
        searchable
      )
    )
  return (
    section.kind === 'form' ||
    /\b(?:appointments?|book|booking|call|consultation|schedule|rendez-vous|réserver|reservations?)\b/.test(
      searchable
    )
  )
}
