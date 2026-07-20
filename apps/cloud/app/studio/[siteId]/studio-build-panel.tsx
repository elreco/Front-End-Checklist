import { Check, LoaderCircle, MousePointerClick } from '@repo/design-system/icons'
import type { BuilderMessage, BuilderSiteDetail } from '@/lib/builder-data'
import { StudioEditForm } from './studio-edit-form'
import { StudioRefresh } from './studio-refresh'

/** Make conversation the permanent project control surface without a competing manual editor. */
export function StudioBuildPanel({ site }: { site: BuilderSiteDetail }) {
  const active = site.messages.some(
    message => message.status === 'queued' || message.status === 'working'
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      {active ? <StudioRefresh /> : null}
      <div className="shrink-0 border-border border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              Ask CodeRocket
            </p>
            <h2 className="mt-1 font-heading font-semibold text-xl">What should we build next?</h2>
          </div>
          <span className="border border-border px-2 py-1 font-mono text-[10px] text-muted">
            V{site.revisionNumber ?? 1}
          </span>
        </div>
        <p className="mt-2 text-muted text-sm leading-6">
          Change the design, add pages, products, or new capabilities. Every result becomes a
          recoverable version.
        </p>
      </div>
      <div
        aria-live="polite"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-background p-4"
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

function Message({
  author,
  content,
  selection,
  status
}: {
  author: 'assistant' | 'user'
  content: string
  selection?: BuilderMessage['selection']
  status: 'queued' | 'working' | 'completed' | 'failed'
}) {
  const pending = status === 'queued' || status === 'working'
  return (
    <div
      className={`border p-3 text-sm leading-6 ${
        author === 'user'
          ? 'ml-7 border-accent bg-accent text-accent-foreground'
          : 'mr-7 border-border bg-surface'
      }`}
    >
      {selection ? (
        <p className="mb-2 flex items-center gap-1.5 font-mono text-xs">
          <MousePointerClick aria-hidden className="h-3.5 w-3.5" /> Selected: {selection.label}
        </p>
      ) : null}
      <p>{content}</p>
      {pending ? (
        <p className="mt-2 flex items-center gap-2 font-mono text-xs">
          <LoaderCircle
            aria-hidden
            className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
          />
          {status === 'queued' ? 'Waiting safely' : 'Preparing your new version'}
        </p>
      ) : author === 'assistant' && status === 'completed' ? (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-success text-xs">
          <Check aria-hidden className="h-3.5 w-3.5" /> New private version ready
        </p>
      ) : null}
    </div>
  )
}
