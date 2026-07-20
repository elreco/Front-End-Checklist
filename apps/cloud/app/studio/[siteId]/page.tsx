import { AlertTriangle } from '@repo/design-system/icons'
import { notFound } from 'next/navigation'
import { ProductShell } from '@/components/product-shell'
import { getBuilderSite } from '@/lib/builder-data'
import { createPrivateMetadata } from '@/lib/seo'
import { RetrySiteImportForm } from './retry-site-import-form'
import { StudioAppLayout } from './studio-app-layout'
import { StudioCreationProgress } from './studio-creation-progress'
import { StudioPreview } from './studio-preview'
import { StudioPrivateAccessForm } from './studio-private-access-form'
import { StudioPublishAction } from './studio-publish-action'
import { StudioSelectionProvider } from './studio-selection-context'
import { StudioToolbar } from './studio-toolbar'
import { StudioWorkspacePanel } from './studio-workspace-panel'

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
  'monthly-limit': 'This recreation cannot start because the protected monthly budget was reached.',
  restored: 'This version is restored as a new private version.',
  'restore-failed': 'That version could not be restored. Your current version is unchanged.'
}
const positiveNotices = new Set([
  'saved',
  'published',
  'retry-started',
  'change-started',
  'data-ready',
  'connection-ready',
  'restored',
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
      eyebrow="Website project"
      title={site.name}
      workspace
    >
      <div className="flex h-full min-h-0 flex-col">
        {notice && notices[notice] ? (
          <p
            className={`shrink-0 border-b px-4 py-2 text-sm ${
              positiveNotices.has(notice)
                ? 'border-success bg-surface text-success'
                : 'border-danger bg-surface text-danger'
            }`}
            role="status"
          >
            {notices[notice]}
          </p>
        ) : null}
        <div className="min-h-0 flex-1">
          {pending ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <StudioCreationProgress
                initialMessage={site.statusMessage}
                initialUpdatedAt={site.updatedAt}
                siteId={site.id}
              />
            </div>
          ) : site.status === 'failed' || !site.document ? (
            <section className="h-full overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-3xl border border-danger bg-surface p-5 text-center sm:p-7">
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
              <div className="flex h-full min-h-0 flex-col">
                <StudioToolbar selectedPath={selectedPath} site={site} />
                <StudioAppLayout
                  conversation={<StudioWorkspacePanel site={site} />}
                  preview={<StudioPreview document={previewDocument} />}
                />
              </div>
            </StudioSelectionProvider>
          ) : null}
        </div>
      </div>
    </ProductShell>
  )
}
