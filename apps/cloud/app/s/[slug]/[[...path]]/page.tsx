import type { SiteDocument } from '@coderocket/core'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteDocumentPreview } from '@/components/site-document-preview'
import { getPublishedBuilderSite, recordPublishedBuilderVisit } from '@/lib/builder-data'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: Promise<{ path?: string[]; slug: string }>
}): Promise<Metadata> {
  const { path, slug } = await params
  const site = await getPublishedBuilderSite(slug)
  if (!site) return { title: 'Website not found', robots: { index: false, follow: false } }
  const pageDocument = selectPublishedPage(site.document, path)
  if (!pageDocument) return { title: 'Page not found', robots: { index: false, follow: false } }
  const firstSection = pageDocument.sections[0]
  return {
    title: path?.length ? `${firstSection?.heading ?? site.name} — ${site.name}` : site.name,
    description: firstSection?.body.slice(0, 160),
    robots: { index: true, follow: true }
  }
}

/** Serve the immutable revision chosen by its owner from the existing Fly.io application. */
export default async function PublishedWebsitePage({
  params
}: {
  params: Promise<{ path?: string[]; slug: string }>
}) {
  const { path, slug } = await params
  const site = await getPublishedBuilderSite(slug)
  if (!site) notFound()
  const pageDocument = selectPublishedPage(site.document, path)
  if (!pageDocument) notFound()
  if (!(await recordPublishedBuilderVisit(slug)))
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <div className="max-w-lg">
          <h1 className="font-heading font-semibold text-3xl">
            This website is temporarily paused
          </h1>
          <p className="mt-4 text-muted leading-7">
            Its included monthly visitor capacity has been reached. The owner can bring it back
            online from CodeRocket without an automatic overage charge.
          </p>
        </div>
      </main>
    )
  return <SiteDocumentPreview document={pageDocument} publicBasePath={`/s/${slug}`} published />
}

/** Select one captured path while keeping the shared identity, theme, and navigation. */
function selectPublishedPage(document: SiteDocument, path?: string[]): SiteDocument | undefined {
  const requestedPath = path?.length ? `/${path.join('/')}` : '/'
  if (requestedPath === '/' && !document.pages) return document
  const page = document.pages?.find(candidate => candidate.path === requestedPath)
  return page ? { ...document, sections: page.sections } : undefined
}
