import { AlertTriangle, Check } from '@repo/design-system/icons'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductShell } from '@/components/product-shell'
import { getBuilderSite } from '@/lib/builder-data'
import { createPrivateMetadata } from '@/lib/seo'
import { RetrySiteImportForm } from './retry-site-import-form'
import { StudioCreationProgress } from './studio-creation-progress'
import { StudioPreview } from './studio-preview'
import { StudioPrivateAccessForm } from './studio-private-access-form'
import { StudioPublishAction } from './studio-publish-action'
import { StudioSelectionProvider } from './studio-selection-context'
import { type StudioPanel, StudioWorkspacePanel } from './studio-workspace-panel'

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
  'invalid-action-link': 'Use a complete secure link beginning with https://.',
  'describe-change': 'Describe the result you want in a little more detail.',
  'change-started': 'Your change is safely queued. You can leave this page.',
  'change-already-running': 'Finish the current change before starting another one.',
  'change-failed': 'The change could not be started. Your current version is unchanged.',
  'not-enough-credits': 'There are not enough creation credits for this change.',
  'data-ready': 'Your managed data list is ready.',
  'data-failed': 'That data list could not be created.',
  'connection-ready': 'The secure link is connected.',
  'connection-failed': 'The connection could not be saved.',
  'invalid-connection-link': 'Use a valid Stripe, Calendly, or Cal.com secure link.',
  'invalid-test-account': 'Use a dedicated test account and confirm that it contains sample data.',
  'invalid-private-pages': 'Use secure pages from the same website.',
  'private-access-unavailable': 'Secure access storage is not configured on this installation.',
  'private-access-failed': 'The test account could not be connected. Nothing was changed.',
  'private-access-started':
    'The test account is connected for this attempt. You can leave this page.',
  'monthly-limit': 'This recreation cannot start because the protected monthly budget was reached.'
}
const positiveNotices = new Set([
  'saved',
  'published',
  'retry-started',
  'change-started',
  'data-ready',
  'connection-ready',
  'private-access-started'
])

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
  const requestedPanel = Array.isArray(query.panel) ? query.panel[0] : query.panel
  const panel = readStudioPanel(requestedPanel)
  const selectedPage =
    site.document?.pages?.find(page => page.path === requestedPage) ??
    site.document?.pages?.find(page => page.path === '/')
  const selectedPath = selectedPage?.path ?? '/'
  const previewDocument =
    site.document && selectedPage
      ? { ...site.document, sections: selectedPage.sections }
      : site.document

  return (
    <ProductShell
      action={site.document ? <StudioPublishAction site={site} /> : undefined}
      eyebrow="No-code website studio"
      title={site.name}
    >
      {notice && notices[notice] ? (
        <p
          className={`mb-5 border p-4 ${
            positiveNotices.has(notice)
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
        <section className="border border-danger bg-surface p-5 sm:p-7">
          <div className="mx-auto max-w-3xl text-center">
            <AlertTriangle aria-hidden className="mx-auto h-8 w-8 text-danger" />
            <h2 className="mt-5 font-heading font-semibold text-3xl">
              This source could not be recreated
            </h2>
            <p className="mt-3 text-muted leading-7">
              It may need a sign-in or block automated visitors. Nothing was published, and the
              failed attempt did not expose an account.
            </p>
            <div className="mt-7">
              <StudioPrivateAccessForm siteId={site.id} sourceUrl={site.sourceUrl} />
            </div>
            <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <span className="text-muted text-sm">No sign-in is needed?</span>
              <RetrySiteImportForm secondary siteId={site.id} />
            </div>
          </div>
        </section>
      ) : previewDocument ? (
        <StudioSelectionProvider key={selectedPath} pagePath={selectedPath}>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="min-w-0 border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b p-4">
                <div>
                  <p className="flex items-center gap-2 font-mono text-success text-xs uppercase tracking-[.14em]">
                    <Check aria-hidden className="h-4 w-4" /> Version {site.revisionNumber} ready
                  </p>
                  <p className="mt-1 text-muted text-xs">
                    Private preview · {site.document.pages?.length ?? 1} useful page{' '}
                    {(site.document.pages?.length ?? 1) === 1 ? 'type' : 'types'} ready · links are
                    disabled
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
            <StudioWorkspacePanel panel={panel} selectedPath={selectedPath} site={site} />
          </div>
        </StudioSelectionProvider>
      ) : null}
    </ProductShell>
  )
}

function readStudioPanel(value?: string): StudioPanel {
  if (value === 'pages' || value === 'data' || value === 'connections') return value
  return 'build'
}
