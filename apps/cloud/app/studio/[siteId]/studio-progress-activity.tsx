import {
  Check,
  Circle,
  Globe2,
  Image,
  Monitor,
  Smartphone,
  Sparkles,
  TriangleAlert
} from '@repo/design-system/icons'
import type { StudioImportEvent } from './studio-progress-model'

/** Show private source captures as recognisable previews rather than technical image artifacts. */
export function StudioProgressCaptures({
  events,
  pending
}: {
  events: StudioImportEvent[]
  pending: boolean
}) {
  const captures = events.filter(event => event.kind === 'capture' && event.artifactUrl)

  return (
    <section
      aria-labelledby="captured-views-heading"
      className="border border-border bg-background"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-border border-b p-4">
        <div>
          <h3 className="font-heading font-semibold text-lg" id="captured-views-heading">
            Views CodeRocket studied
          </h3>
          <p className="mt-1 text-muted text-sm">
            Private previews from the public page. They are removed after 24 hours.
          </p>
        </div>
        <span className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
          Private
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {captures.length > 0 ? (
          captures.map(event => <CaptureCard event={event} key={event.id} pending={pending} />)
        ) : pending ? (
          ['Computer view', 'Phone view'].map((label, index) => (
            <div className="overflow-hidden border border-border bg-surface" key={label}>
              <div className="flex items-center gap-2 border-border border-b px-3 py-2 font-mono text-[10px] text-muted uppercase tracking-[.08em]">
                {index === 0 ? (
                  <Monitor aria-hidden className="h-3.5 w-3.5" />
                ) : (
                  <Smartphone aria-hidden className="h-3.5 w-3.5" />
                )}
                {label}
              </div>
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-surface-raised">
                <div className="absolute inset-x-0 top-0 h-px animate-pulse bg-signal motion-reduce:animate-none" />
                <Image aria-hidden className="h-7 w-7 text-muted" />
                <span className="sr-only">Waiting for the private capture</span>
              </div>
            </div>
          ))
        ) : (
          <div className="border border-border bg-surface p-5 sm:col-span-2">
            <p className="font-semibold text-sm">No view was captured</p>
            <p className="mt-1 text-muted text-sm leading-6">
              Creation stopped before CodeRocket could save a computer or phone preview.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

/** Render the bounded, owner-visible activity history without exposing raw logs or prompts. */
export function StudioProgressActivity({
  events,
  pending
}: {
  events: StudioImportEvent[]
  pending: boolean
}) {
  return (
    <section aria-labelledby="live-activity-heading" className="border border-border bg-background">
      <div className="border-border border-b p-4">
        <h3 className="font-heading font-semibold text-lg" id="live-activity-heading">
          What is happening
        </h3>
        <p className="mt-1 text-muted text-sm">
          A simple, live explanation of each completed step.
        </p>
      </div>
      <ol aria-live="polite" className="max-h-[25rem] space-y-0 overflow-y-auto p-4">
        {events.length > 0 ? (
          events.map((event, index) => {
            const Icon = eventIcon(event.kind)
            const latest = index === events.length - 1
            return (
              <li className="relative flex gap-3 pb-5 last:pb-0" key={event.id}>
                {index < events.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-7 bottom-0 left-[.6875rem] w-px bg-border"
                  />
                ) : null}
                <span
                  className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border bg-background ${
                    event.kind === 'warning' || event.kind === 'failed'
                      ? 'border-warning text-warning'
                      : latest && pending
                        ? 'border-signal text-signal'
                        : 'border-success text-success'
                  }`}
                >
                  <Icon
                    aria-hidden
                    className={`h-3.5 w-3.5 ${
                      latest && pending ? 'animate-pulse motion-reduce:animate-none' : ''
                    }`}
                  />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{event.title}</p>
                  {event.detail ? (
                    <p className="mt-1 text-muted text-sm leading-6">{event.detail}</p>
                  ) : null}
                </div>
              </li>
            )
          })
        ) : (
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center border border-signal text-signal">
              <Circle
                aria-hidden
                className="h-2.5 w-2.5 animate-pulse fill-current motion-reduce:animate-none"
              />
            </span>
            <div>
              <p className="font-semibold text-sm">Waiting for the first update</p>
              <p className="mt-1 text-muted text-sm">
                Your request is saved and will continue even if you leave this page.
              </p>
            </div>
          </li>
        )}
      </ol>
    </section>
  )
}

function CaptureCard({ event, pending }: { event: StudioImportEvent; pending: boolean }) {
  if (!event.artifactUrl) return null
  const mobile = event.artifactKind === 'mobile'
  return (
    <figure className="overflow-hidden border border-border bg-surface">
      <figcaption className="flex items-center gap-2 border-border border-b px-3 py-2 font-mono text-[10px] uppercase tracking-[.08em]">
        {mobile ? (
          <Smartphone aria-hidden className="h-3.5 w-3.5 text-signal" />
        ) : (
          <Monitor aria-hidden className="h-3.5 w-3.5 text-signal" />
        )}
        {mobile ? 'Phone view' : 'Computer view'}
      </figcaption>
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-raised">
        <img
          alt={`${mobile ? 'Phone' : 'Computer'} capture of the public source page`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          src={event.artifactUrl}
        />
        {pending ? (
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px animate-pulse bg-signal motion-reduce:animate-none"
          />
        ) : null}
      </div>
    </figure>
  )
}

function eventIcon(kind: StudioImportEvent['kind']) {
  if (kind === 'ai') return Sparkles
  if (kind === 'capture') return Image
  if (kind === 'page') return Globe2
  if (kind === 'warning' || kind === 'failed') return TriangleAlert
  return Check
}
