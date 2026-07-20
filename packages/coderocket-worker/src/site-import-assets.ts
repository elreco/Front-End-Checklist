import { createHash } from 'node:crypto'
import { fetchPublicImage } from '@coderocket/core/safe-fetch'
import { type SiteDocument, siteDocumentSchema } from '@coderocket/core/site-document'
import type { createServiceClient } from '@coderocket/db'

const ASSET_BUCKET = 'cr-builder-assets'
const MAX_IMPORTED_ASSETS = 24

/** Copy bounded passive source images into durable project storage and rewrite the document URLs. */
export async function cacheSiteDocumentImages(
  db: ReturnType<typeof createServiceClient>,
  document: SiteDocument,
  ownerId: string,
  siteId: string
): Promise<SiteDocument> {
  const sourceUrls = [...new Set(readSiteDocumentImageUrls(document))].slice(0, MAX_IMPORTED_ASSETS)
  const cachedAssets = await Promise.all(
    sourceUrls.map(async sourceUrl => ({
      cachedUrl: await cacheSourceImage(db, sourceUrl, ownerId, siteId).catch(() => sourceUrl),
      sourceUrl
    }))
  )
  return rewriteSiteDocumentImageUrls(
    document,
    new Map(cachedAssets.map(asset => [asset.sourceUrl, asset.cachedUrl]))
  )
}

/** Rewrite every bounded image slot without changing source content or visual measurements. */
export function rewriteSiteDocumentImageUrls(
  document: SiteDocument,
  replacements: Map<string, string>
): SiteDocument {
  /** Replace one optional URL while preserving uncached sources. */
  const rewriteUrl = (value?: string) => (value ? (replacements.get(value) ?? value) : undefined)
  /** Rewrite each section and its bounded structured items. */
  const rewriteSections = (sections: SiteDocument['sections']) =>
    sections.map(section => ({
      ...section,
      imageUrl: rewriteUrl(section.imageUrl),
      items: section.items?.map(item => ({
        ...item,
        imageUrl: rewriteUrl(item.imageUrl)
      }))
    }))
  return siteDocumentSchema.parse({
    ...document,
    identity: {
      ...document.identity,
      logoUrl: rewriteUrl(document.identity.logoUrl)
    },
    sections: rewriteSections(document.sections),
    pages: document.pages?.map(page => ({
      ...page,
      identity: page.identity
        ? { ...page.identity, logoUrl: rewriteUrl(page.identity.logoUrl) }
        : undefined,
      sections: rewriteSections(page.sections)
    }))
  })
}

/** Collect every supported image slot before applying the per-import asset ceiling. */
function readSiteDocumentImageUrls(document: SiteDocument): string[] {
  /** Collect the section-level and item-level image slots. */
  const sectionUrls = (sections: SiteDocument['sections']) =>
    sections.flatMap(section => [
      ...(section.imageUrl ? [section.imageUrl] : []),
      ...(section.items?.flatMap(item => (item.imageUrl ? [item.imageUrl] : [])) ?? [])
    ])
  return [
    ...(document.identity.logoUrl ? [document.identity.logoUrl] : []),
    ...sectionUrls(document.sections),
    ...(document.pages?.flatMap(page => [
      ...(page.identity?.logoUrl ? [page.identity.logoUrl] : []),
      ...sectionUrls(page.sections)
    ]) ?? [])
  ]
}

/** Store one content-addressed image and return its stable public delivery URL. */
async function cacheSourceImage(
  db: ReturnType<typeof createServiceClient>,
  sourceUrl: string,
  ownerId: string,
  siteId: string
): Promise<string> {
  const image = await fetchPublicImage(sourceUrl, { timeoutMs: 12_000 })
  const digest = createHash('sha256').update(image.bytes).digest('hex')
  const assetPath = `${ownerId}/${siteId}/${digest}.${extensionFor(image.contentType)}`
  const { error } = await db.storage.from(ASSET_BUCKET).upload(assetPath, image.bytes, {
    cacheControl: '31536000',
    contentType: image.contentType,
    upsert: true
  })
  if (error) throw new Error(error.message)
  return db.storage.from(ASSET_BUCKET).getPublicUrl(assetPath).data.publicUrl
}

/** Keep stored filenames aligned with the validated raster response type. */
function extensionFor(contentType: string): string {
  if (contentType === 'image/avif') return 'avif'
  if (contentType === 'image/gif') return 'gif'
  if (contentType === 'image/jpeg') return 'jpg'
  if (contentType === 'image/png') return 'png'
  return 'webp'
}
