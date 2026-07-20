import { Check, LoaderCircle, MousePointerClick } from '@repo/design-system/icons'
import type { BuilderMessage, BuilderSiteDetail } from '@/lib/builder-data'
import { StudioEditForm } from './studio-edit-form'
import { StudioEditor } from './studio-editor'
import { StudioRefresh } from './studio-refresh'

/** Put the plain-language creation conversation before manual field editing. */
export function StudioBuildPanel({
  selectedPath,
  site
}: {
  selectedPath: string
  site: BuilderSiteDetail
}) {
  const active = site.messages.some(
    message => message.status === 'queued' || message.status === 'working'
  )
  return (
    <div>
      {active ? <StudioRefresh /> : null}
      <div className="border-border border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">Build</p>
            <h2 className="mt-1 font-heading font-semibold text-xl">Create by describing it</h2>
          </div>
          <span className="border border-border px-2 py-1 font-mono text-[10px] text-muted">
            NO CODE
          </span>
        </div>
        <p className="mt-2 text-muted text-sm leading-6">
          Ask for one visible result at a time. Every accepted change creates a recoverable version.
        </p>
      </div>
      <div aria-live="polite" className="max-h-[24rem] space-y-3 overflow-y-auto bg-background p-4">
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
      <details className="border-border border-t">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-sm hover:bg-surface-raised">
          Quick manual edits
          <span className="ml-2 font-normal text-muted">· free</span>
        </summary>
        <StudioEditor selectedPath={selectedPath} site={site} />
      </details>
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
