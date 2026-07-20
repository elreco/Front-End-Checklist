import { notFound } from 'next/navigation'
import { ProductShell } from '@/components/product-shell'
import { isBrowserHandoffConfigured } from '@/lib/browser-handoff'
import { getBuilderAccessRecovery } from '@/lib/builder-access-recovery'
import { getBuilderBrowserHandoff } from '@/lib/builder-browser-handoff-data'
import { getBuilderSite } from '@/lib/builder-data'
import { createPrivateMetadata } from '@/lib/seo'
import { RetrySiteImportForm } from './retry-site-import-form'
import { StudioAppLayout } from './studio-app-layout'
import { StudioBrowserHandoff } from './studio-browser-handoff'
import { StudioCreationProgress } from './studio-creation-progress'
import { StudioPreview } from './studio-preview'
import { StudioProtectedAccess } from './studio-protected-access'
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
  'confirm-authorised-access': 'Confirm that you are allowed to access this website.',
  'secure-browser-ready': 'Your temporary private browser is ready.',
  'secure-browser-failed':
    'The private browser could not be opened. No password or browser session was stored.',
  'secure-browser-unavailable': 'Private browser access is not available for this website.',
  'secure-browser-expired': 'That private browser expired. Start another session to try again.',
  'secure-browser-continued': 'CodeRocket is continuing from the browser session you just opened.',
  'secure-browser-stopped': 'The temporary browser was closed safely. You can try another way.',
  'secure-browser-stop-failed':
    'The temporary browser could not be closed from here. It will still expire automatically.',
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
  'secure-browser-ready',
  'secure-browser-continued',
  'secure-browser-stopped',
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
  const handoff =
    site.status === 'waiting_for_access' ? await getBuilderBrowserHandoff(siteId) : undefined
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
          {site.status === 'waiting_for_access' ? (
            <StudioBrowserHandoff handoff={handoff} siteId={site.id} />
          ) : pending ? (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <StudioCreationProgress
                initialMessage={site.statusMessage}
                initialUpdatedAt={site.updatedAt}
                siteId={site.id}
              />
            </div>
          ) : site.status === 'failed' || !site.document ? (
            <section className="h-full overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-3xl text-center">
                <StudioProtectedAccess
                  browserAvailable={isBrowserHandoffConfigured()}
                  ownedSource={site.sourceMode === 'owned'}
                  recovery={getBuilderAccessRecovery(site.error)}
                  siteId={site.id}
                  sourceUrl={site.sourceUrl}
                />
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
