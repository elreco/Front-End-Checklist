import {
  Check,
  FileText,
  Image,
  Link2,
  LoaderCircle,
  MousePointerClick
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import type { BuilderMessage, BuilderSiteDetail } from '@/lib/builder-data'
import { StudioEditForm } from './studio-edit-form'
import { StudioRefresh } from './studio-refresh'
import { StudioStopGeneration } from './studio-stop-generation'

/** Make conversation the permanent project control surface without a competing manual editor. */
export function StudioBuildPanel({ site }: { site: BuilderSiteDetail }) {
  const active = site.messages.some(
    message => message.status === 'queued' || message.status === 'working'
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      {active ? <StudioRefresh /> : null}
      <div className="shrink-0 border-border border-b px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
              Ask CodeRocket
            </p>
            <h2 className="mt-0.5 font-heading font-semibold text-base">
              What should we build next?
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {active ? <StudioStopGeneration mode="change" siteId={site.id} /> : null}
            <span className="border border-border px-2 py-1 font-mono text-[10px] text-muted">
              V{site.revisionNumber ?? 1}
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-muted text-xs leading-5">
          Change the design, add pages, products, or new capabilities. Every result becomes a
          recoverable version.
        </p>
      </div>
      <ConnectionRequest site={site} />
      <div
        aria-live="polite"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background p-3"
      >
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
      </div>
      <StudioEditForm disabled={active} siteId={site.id} />
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
          <LoaderCircle
            aria-hidden
            className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          />
          {status === 'queued' ? 'Waiting safely' : 'Preparing your new version'}
        </p>
      ) : author === 'assistant' && status === 'completed' ? (
        <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-success">
          <Check aria-hidden className="h-3.5 w-3.5" /> New private version ready
        </p>
      ) : null}
    </div>
  )
}
