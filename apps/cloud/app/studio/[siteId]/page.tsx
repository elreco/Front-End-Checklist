import { AlertTriangle, Check } from '@repo/design-system/icons'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductShell } from '@/components/product-shell'
import { getBuilderSite } from '@/lib/builder-data'
import { createPrivateMetadata } from '@/lib/seo'
import { RetrySiteImportForm } from './retry-site-import-form'
import { StudioCreationProgress } from './studio-creation-progress'
import { StudioEditor } from './studio-editor'
import { StudioPreview } from './studio-preview'

export const metadata = createPrivateMetadata('Website studio')

const notices: Record<string, string> = {
  saved: 'Your changes were saved as a new version.',
  published: 'Your latest version is now online.',
  'save-failed': 'The changes could not be saved. Your previous version is unchanged.',
  'publish-failed': 'The website could not be published. Your private version is unchanged.',
  'retry-started': 'CodeRocket is studying this website again. No additional import was counted.',
  'retry-failed': 'The website could not be restarted. Nothing was changed.',
  'missing-version': 'This website does not have an editable version yet.',
  'invalid-content': 'Add a business name and a main headline.',
  'invalid-action-link': 'Use a complete secure link beginning with https://.'
}

export default async function StudioPage({
  params,
  searchParams
}: {
  params: Promise<{ siteId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ siteId }, query] = await Promise.all([params, searchParams])
  const site = await getBuilderSite(siteId)
  if (!site) notFound()
  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice
  const pending = site.status === 'queued' || site.status === 'analyzing'
  const requestedPage = Array.isArray(query.page) ? query.page[0] : query.page
  const selectedPage =
    site.document?.pages?.find(page => page.path === requestedPage) ??
    site.document?.pages?.find(page => page.path === '/')
  const selectedPath = selectedPage?.path ?? '/'
  const previewDocument =
    site.document && selectedPage
      ? { ...site.document, sections: selectedPage.sections }
      : site.document

  return (
    <ProductShell eyebrow="No-code website studio" title={site.name}>
      {notice && notices[notice] ? (
        <p
          className={`mb-5 border p-4 ${
            notice === 'saved' || notice === 'published' || notice === 'retry-started'
              ? 'border-success bg-surface text-success'
              : 'border-danger bg-surface text-danger'
          }`}
          role="status"
        >
          {notices[notice]}
        </p>
      ) : null}
      {pending ? (
        <StudioCreationProgress
          initialMessage={site.statusMessage}
          initialUpdatedAt={site.updatedAt}
          siteId={site.id}
        />
      ) : site.status === 'failed' || !site.document ? (
        <section className="flex min-h-[28rem] items-center justify-center border border-danger bg-surface p-6 text-center">
          <div className="max-w-lg">
            <AlertTriangle aria-hidden className="mx-auto h-8 w-8 text-danger" />
            <h2 className="mt-5 font-heading font-semibold text-3xl">
              This source could not be recreated
            </h2>
            <p className="mt-3 text-muted leading-7">
              It may require a sign-in, block automated visitors, or return something other than a
              public web page. Nothing was published.
            </p>
            <RetrySiteImportForm className="mt-6" siteId={site.id} />
          </div>
        </section>
      ) : previewDocument ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b p-4">
              <div>
                <p className="flex items-center gap-2 font-mono text-success text-xs uppercase tracking-[.14em]">
                  <Check aria-hidden className="h-4 w-4" /> Version {site.revisionNumber} ready
                </p>
                <p className="mt-1 text-muted text-xs">
                  Private preview · {site.document.pages?.length ?? 1}{' '}
                  {(site.document.pages?.length ?? 1) === 1 ? 'page' : 'pages'} recreated · links
                  are disabled
                </p>
                {site.document.recreation ? (
                  <p className="mt-1 text-muted text-xs">
                    Layout checked for phone, tablet, and computer. Review it before publishing.
                  </p>
                ) : null}
                {site.document.importSummary?.failedPaths.length ? (
                  <p className="mt-1 text-warning text-xs">
                    {site.document.importSummary.failedPaths.length}{' '}
                    {site.document.importSummary.failedPaths.length === 1
                      ? 'page was'
                      : 'pages were'}{' '}
                    unavailable and clearly skipped.
                  </p>
                ) : null}
              </div>
              <Link className="font-mono text-signal text-xs hover:underline" href="/websites">
                All my websites
              </Link>
            </div>
            {site.document.pages && site.document.pages.length > 1 ? (
              <nav
                aria-label="Website pages"
                className="flex gap-2 overflow-x-auto border-border border-b bg-background p-3"
              >
                {site.document.pages.map(page => (
                  <Link
                    aria-current={page.path === selectedPath ? 'page' : undefined}
                    className={`shrink-0 border px-3 py-2 font-mono text-xs ${
                      page.path === selectedPath
                        ? 'border-signal bg-surface-raised text-foreground'
                        : 'border-border text-muted hover:text-foreground'
                    }`}
                    href={
                      page.path === '/'
                        ? `/studio/${site.id}`
                        : `/studio/${site.id}?page=${encodeURIComponent(page.path)}`
                    }
                    key={page.path}
                  >
                    {page.path === '/' ? 'Home' : page.title}
                  </Link>
                ))}
              </nav>
            ) : null}
            <StudioPreview document={previewDocument} />
          </section>
          <StudioEditor selectedPath={selectedPath} site={site} />
        </div>
      ) : null}
    </ProductShell>
  )
}
