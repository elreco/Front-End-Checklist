import { type SiteDocument, siteDocumentSchema, sitePageSchema } from './site-document-schema'

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
      title: page.document.sections[0]?.heading || page.document.identity.name,
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
