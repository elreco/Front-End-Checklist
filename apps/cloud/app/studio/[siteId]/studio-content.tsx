import { parseFigmaFileUrl } from '@coderocket/core/figma-source'
import { selectSiteDocumentPage } from '@coderocket/core/site-document'
import { isBrowserHandoffConfigured } from '@/lib/browser-handoff'
import { getBuilderAccessRecovery } from '@/lib/builder-access-recovery'
import type { getBuilderBrowserHandoff } from '@/lib/builder-browser-handoff-data'
import type { getBuilderSite } from '@/lib/builder-data'
import { RetrySiteImportForm } from './retry-site-import-form'
import { StudioAppLayout } from './studio-app-layout'
import { StudioBrowserHandoff } from './studio-browser-handoff'
import { StudioCancelledCreation } from './studio-cancelled-creation'
import { StudioCreationProgress } from './studio-creation-progress'
import { StudioFigmaImportFailure } from './studio-figma-import-failure'
import { StudioPreview } from './studio-preview'
import { StudioProtectedAccess } from './studio-protected-access'
import { StudioSelectionProvider } from './studio-selection-context'
import { StudioToolbar } from './studio-toolbar'
import { StudioWorkspacePanel } from './studio-workspace-panel'

const notices: Record<string, string> = {
  saved: 'Your changes were saved as a new version.',
  published: 'Your latest version is now online.',
  'save-failed': 'The changes could not be saved. Your previous version is unchanged.',
  'publish-failed': 'The website could not be published. Your private version is unchanged.',
  'retry-started': 'CodeRocket is studying this website again. No additional import was counted.',
  'retry-failed': 'The website could not be restarted. Nothing was changed.',
  'figma-connected': 'Figma is connected. You can try the saved design again.',
  'missing-version': 'This website does not have an editable version yet.',
  'invalid-content': 'Add a business name and a main headline.',
  'invalid-action-link': 'Use a complete secure link beginning with https://.',
  'describe-change': 'Describe the result you want in a little more detail.',
  'change-started': 'Your change is safely queued. You can leave this page.',
  'change-already-running': 'Finish the current change before starting another one.',
  'change-failed': 'The change could not be started. Your current version is unchanged.',
  'change-file-expired': 'One of the files is no longer available. Add it again and retry.',
  'generation-stopped':
    'Generation stopped. Your previous version is unchanged and reserved credits were returned.',
  'generation-already-finished':
    'This generation had already finished, so its completed result was kept.',
  'generation-stop-failed':
    'The generation could not be stopped. Refresh the page to check its current state.',
  'not-enough-credits': 'There are not enough creation credits for this change.',
  'data-ready': 'Your managed data list is ready.',
  'data-failed': 'That data list could not be created.',
  'connection-ready': 'The service is connected and ready for your next request.',
  'connection-applied': 'Connected and added to the website as a new recoverable version.',
  'connection-partial':
    'The service is connected. Ask CodeRocket where to use it and it will finish the website.',
  'connection-attention': 'Stripe is connected but needs one last check before payments can open.',
  'connection-unavailable':
    'One-click Stripe is not available here yet. You can still use a Stripe checkout page below.',
  'connection-removed': 'The service was disconnected from this project.',
  'connection-failed': 'The service could not be connected. Nothing on the website was changed.',
  'connection-disconnect-failed':
    'The service could not be disconnected safely. Check the connection and try again.',
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
  'version-continued':
    'You are now continuing from that version. Every version in your timeline is still available.',
  'version-continue-failed':
    'CodeRocket could not continue from that version. Your latest version is unchanged.'
}
const positiveNotices = new Set([
  'saved',
  'published',
  'retry-started',
  'figma-connected',
  'change-started',
  'generation-stopped',
  'generation-already-finished',
  'data-ready',
  'connection-ready',
  'connection-applied',
  'connection-removed',
  'version-continued',
  'secure-browser-ready',
  'secure-browser-continued',
  'secure-browser-stopped',
  'private-access-started'
])
const warningNotices = new Set([
  'connection-attention',
  'connection-partial',
  'connection-unavailable'
])

/** Render the current creation, recovery, or ready Studio state inside the shared product shell. */
export function StudioContent({
  handoff,
  notice,
  openPanel,
  requestedPage,
  site
}: {
  handoff: Awaited<ReturnType<typeof getBuilderBrowserHandoff>> | undefined
  notice?: string
  openPanel?: string
  requestedPage?: string
  site: NonNullable<Awaited<ReturnType<typeof getBuilderSite>>>
}) {
  const pending = site.status === 'queued' || site.status === 'analyzing'
  const figmaSource = Boolean(parseFigmaFileUrl(site.sourceUrl))
  const selectedPage =
    site.document?.pages?.find(page => page.path === requestedPage) ??
    site.document?.pages?.find(page => page.path === '/')
  const selectedPath = selectedPage?.path ?? '/'
  const previewDocument =
    site.document && selectedPage
      ? selectSiteDocumentPage(site.document, selectedPage.path)
      : site.document
  return (
    <div className="flex h-full min-h-0 flex-col">
      {notice && notices[notice] ? (
        <p
          className={`shrink-0 border-b bg-surface px-4 py-2 text-sm ${
            positiveNotices.has(notice)
              ? 'border-success text-success'
              : warningNotices.has(notice)
                ? 'border-warning text-warning'
                : 'border-danger text-danger'
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
              sourceType={figmaSource ? 'figma' : 'website'}
            />
          </div>
        ) : site.status === 'failed' && site.error === 'cancelled_by_owner' ? (
          <section className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-3xl">
              <StudioCancelledCreation siteId={site.id} />
            </div>
          </section>
        ) : (site.status === 'failed' || !site.document) && figmaSource ? (
          <section className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-3xl">
              <StudioFigmaImportFailure siteId={site.id} sourceUrl={site.sourceUrl} />
            </div>
          </section>
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
          <StudioSelectionProvider
            key={`${site.viewedRevision?.id ?? 'latest'}:${selectedPath}`}
            pagePath={selectedPath}
          >
            <div className="flex h-full min-h-0 flex-col">
              <StudioToolbar
                openConnections={openPanel === 'connections'}
                selectedPath={selectedPath}
                site={site}
              />
              <StudioAppLayout
                conversation={<StudioWorkspacePanel selectedPath={selectedPath} site={site} />}
                preview={
                  <StudioPreview
                    connections={site.connections}
                    document={previewDocument}
                    revisionId={
                      site.viewedRevision?.id === site.currentRevisionId
                        ? undefined
                        : site.viewedRevision?.id
                    }
                    readOnly={site.viewedRevision?.id !== site.currentRevisionId}
                    selectedPath={selectedPath}
                    siteId={site.id}
                  />
                }
              />
            </div>
          </StudioSelectionProvider>
        ) : null}
      </div>
    </div>
  )
}
