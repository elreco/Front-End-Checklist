import {
  ArrowRight,
  Check,
  FileText,
  Image,
  Link2,
  MousePointerClick
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { BuilderMessage, BuilderSiteDetail } from '@/lib/builder-data'
import type { StudioIterationProgress as StudioIterationProgressValue } from '@/lib/studio-iteration-progress'
import { continueFromBuilderRevision } from './actions'
import { StudioEditForm } from './studio-edit-form'
import { StudioIterationProgress } from './studio-iteration-progress'

/** Make conversation the permanent project control surface without a competing manual editor. */
export function StudioBuildPanel({
  selectedPath,
  site
}: {
  selectedPath: string
  site: BuilderSiteDetail
}) {
  const activeRequest = site.messages.find(
    message =>
      message.role === 'user' && (message.status === 'queued' || message.status === 'working')
  )
  const active = Boolean(activeRequest)
  const iterationProgress: StudioIterationProgressValue | undefined = activeRequest
    ? (activeRequest.progress ?? {
        createdAt: activeRequest.createdAt,
        current: 0,
        message: 'Your change is safely waiting',
        stage: 'queued',
        status: activeRequest.status,
        total: 5,
        updatedAt: activeRequest.createdAt
      })
    : undefined
  const viewingEarlier = Boolean(
    site.viewedRevision && site.viewedRevision.id !== site.currentRevisionId
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-border border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
              Ask CodeRocket
            </p>
            <h2 className="mt-0.5 font-heading font-semibold text-base">
              {viewingEarlier ? 'Explore this version' : 'What should we build next?'}
            </h2>
          </div>
          <span className="border border-border px-2 py-1 font-mono text-[10px] text-muted">
            V{site.viewedRevision?.revisionNumber ?? site.revisionNumber ?? 1}
          </span>
        </div>
        <p className="mt-1.5 text-muted text-xs leading-5">
          {viewingEarlier
            ? 'Compare it freely. Your latest version and every later change remain safe.'
            : 'Change the design, add pages, products, or new capabilities. Every result becomes a named version.'}
        </p>
      </div>
      {viewingEarlier && site.viewedRevision ? (
        <EarlierVersionActions selectedPath={selectedPath} site={site} />
      ) : (
        <ConnectionRequest site={site} />
      )}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background p-3">
        {site.messages.length === 0 ? (
          <Message
            content="Your private version is ready. Tell me what you want to change, in your own words."
            author="assistant"
            status="completed"
          />
        ) : (
          site.messages.map(message => (
            <Message
              content={message.content}
              key={message.id}
              attachments={message.attachments}
              author={message.role}
              selection={message.selection}
              status={message.status}
            />
          ))
        )}
        {activeRequest && iterationProgress ? (
          <StudioIterationProgress
            context={{
              attachmentCount: activeRequest.attachments?.length ?? 0,
              ...(activeRequest.selection ? { selectionLabel: activeRequest.selection.label } : {})
            }}
            initialProgress={iterationProgress}
            messageId={activeRequest.id}
            siteId={site.id}
          />
        ) : null}
      </div>
      <StudioEditForm active={active} disabled={active || viewingEarlier} siteId={site.id} />
    </div>
  )
}

/** Offer one safe next action while an earlier version is being compared. */
function EarlierVersionActions({
  selectedPath,
  site
}: {
  selectedPath: string
  site: BuilderSiteDetail
}) {
  const revision = site.viewedRevision
  if (!revision) return null
  const latestQuery = selectedPath === '/' ? '' : `?page=${encodeURIComponent(selectedPath)}`
  return (
    <div className="shrink-0 border-border border-b bg-surface-raised p-3">
      <p className="truncate font-semibold text-xs">{revision.title}</p>
      <p className="mt-1 text-muted text-xs leading-5">
        Want to edit this version? Continue from it. Nothing in the timeline will be deleted.
      </p>
      <form action={continueFromBuilderRevision} className="mt-2">
        <input name="siteId" type="hidden" value={site.id} />
        <input name="revisionId" type="hidden" value={revision.id} />
        <input name="pagePath" type="hidden" value={selectedPath} />
        <CodeRocketButton className="w-full" size="sm" type="submit">
          Continue from this version <ArrowRight aria-hidden />
        </CodeRocketButton>
      </form>
      <Link
        className="mt-2 flex min-h-8 items-center justify-center text-muted text-xs hover:text-foreground"
        href={`/studio/${site.id}${latestQuery}`}
      >
        Back to latest version
      </Link>
    </div>
  )
}

function ConnectionRequest({ site }: { site: BuilderSiteDetail }) {
  const connection = site.connections.find(
    candidate => candidate.status === 'setup' || candidate.status === 'attention'
  )
  if (!connection) return null
  const service =
    connection.provider === 'stripe'
      ? 'payments'
      : connection.provider === 'calendly'
        ? 'appointments'
        : 'this service'
  return (
    <div className="shrink-0 border-border border-b bg-surface-raised p-3">
      <p className="font-semibold text-xs">One quick step to finish {service}</p>
      <p className="mt-1 text-muted text-xs leading-5">
        Your website is prepared. Connect the service and CodeRocket will place it for you.
      </p>
      <CodeRocketButton asChild className="mt-2 w-full" size="sm">
        <Link href={`/studio/${site.id}?panel=connections`}>
          <Link2 aria-hidden /> Finish connection
        </Link>
      </CodeRocketButton>
    </div>
  )
}

function Message({
  attachments,
  author,
  content,
  selection,
  status
}: {
  attachments?: BuilderMessage['attachments']
  author: 'assistant' | 'user'
  content: string
  selection?: BuilderMessage['selection']
  status: 'queued' | 'working' | 'completed' | 'failed'
}) {
  const pending = status === 'queued' || status === 'working'
  return (
    <div
      className={`border p-2.5 text-xs leading-5 ${
        author === 'user'
          ? 'ml-7 border-accent bg-accent text-accent-foreground'
          : 'mr-7 border-border bg-surface'
      }`}
    >
      {selection ? (
        <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px]">
          <MousePointerClick aria-hidden className="h-3.5 w-3.5" /> Selected: {selection.label}
        </p>
      ) : null}
      {attachments && attachments.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map(attachment => {
            const Icon = attachment.type.startsWith('image/') ? Image : FileText
            return (
              <span
                className="inline-flex max-w-full items-center gap-1.5 border border-current px-2 py-1 font-mono text-[10px]"
                key={attachment.id}
              >
                <Icon aria-hidden className="h-3 w-3 shrink-0" />
                <span className="truncate">{attachment.name}</span>
              </span>
            )
          })}
        </div>
      ) : null}
      <p>{content}</p>
      {pending ? (
        <p className="mt-1.5 flex items-center gap-2 font-mono text-[10px]">
          <Check aria-hidden className="h-3.5 w-3.5" /> Request received
        </p>
      ) : author === 'assistant' && status === 'completed' ? (
        <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-success">
          <Check aria-hidden className="h-3.5 w-3.5" /> New private version ready
        </p>
      ) : null}
    </div>
  )
}
