import { FigmaBrandIcon } from '@repo/design-system/brand-icons'
import {
  Check,
  Circle,
  Globe2,
  Image,
  LoaderCircle,
  Monitor,
  Smartphone,
  Sparkles,
  TriangleAlert
} from '@repo/design-system/icons'
import type { StudioImportEvent } from './studio-progress-model'

const captureSlots: Array<'desktop' | 'mobile'> = ['desktop', 'mobile']

/** Show private source captures as recognisable previews rather than technical image artifacts. */
export function StudioProgressCaptures({
  events,
  pending,
  sourceType = 'website'
}: {
  events: StudioImportEvent[]
  pending: boolean
  sourceType?: 'figma' | 'website'
}) {
  const captureEvents = events.filter(event => event.kind === 'capture')
  const figmaEvents = captureEvents.filter(event => event.artifactKind === 'figma')
  const figmaSource = sourceType === 'figma' || figmaEvents.length > 0

  return (
    <section
      aria-labelledby="captured-views-heading"
      className="border border-border bg-background"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-border border-b p-4">
        <div>
          <h3 className="font-heading font-semibold text-lg" id="captured-views-heading">
            {figmaSource ? 'Figma screens CodeRocket checked' : 'Views CodeRocket checked'}
          </h3>
          <p className="mt-1 text-muted text-sm">
            {figmaSource
              ? 'Private frame previews used with Figma layers, text, colours, and spacing. Deleted after 24 hours.'
              : 'Private snapshots used to understand the computer and phone layouts. Deleted after 24 hours.'}
          </p>
        </div>
        <span className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
          Private
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {figmaSource && figmaEvents.length > 0
          ? figmaEvents
              .slice(0, 5)
              .map(event => (
                <CaptureCard event={event} key={event.id} kind="figma" pending={pending} />
              ))
          : figmaSource
            ? [1].map(slot => <CaptureCard key={slot} kind="figma" pending={pending} />)
            : captureSlots.map(kind => (
                <CaptureCard
                  event={captureEvents.find(event => captureMatches(event, kind))}
                  key={kind}
                  kind={kind}
                  pending={pending}
                />
              ))}
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
          Live progress
        </h3>
        <p className="mt-1 text-muted text-sm">
          Each update appears here as soon as a step finishes.
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

function CaptureCard({
  event,
  kind,
  pending
}: {
  event?: StudioImportEvent
  kind: 'desktop' | 'figma' | 'mobile'
  pending: boolean
}) {
  const mobile = kind === 'mobile'
  const figma = kind === 'figma'
  const Icon = figma ? FigmaBrandIcon : mobile ? Smartphone : Monitor
  const label = figma
    ? event?.title.replace(/ captured$/i, '') || 'Figma screen'
    : mobile
      ? 'Phone view'
      : 'Computer view'
  const ready = Boolean(event?.artifactUrl)
  return (
    <figure
      aria-busy={pending && !event}
      className="overflow-hidden border border-border bg-surface"
    >
      <figcaption className="flex items-center justify-between gap-3 border-border border-b px-3 py-2 font-mono text-[10px] uppercase tracking-[.08em]">
        <span className="flex items-center gap-2">
          <Icon aria-hidden className={`h-3.5 w-3.5 ${ready ? 'text-signal' : 'text-muted'}`} />
          {label}
        </span>
        <span className={ready ? 'text-success' : 'text-muted'}>
          {ready ? 'Ready' : pending && !event ? 'In progress' : 'Unavailable'}
        </span>
      </figcaption>
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-raised">
        {event?.artifactUrl ? (
          <img
            alt={
              figma
                ? `Private preview of the ${label} Figma screen`
                : `${mobile ? 'Phone' : 'Computer'} capture of the public source page`
            }
            className={
              mobile || figma
                ? 'h-full w-full object-contain object-top'
                : 'h-full w-full object-cover object-top'
            }
            decoding="async"
            src={event.artifactUrl}
          />
        ) : (
          <CapturePlaceholder event={event} label={label} pending={pending} />
        )}
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

function CapturePlaceholder({
  event,
  label,
  pending
}: {
  event?: StudioImportEvent
  label: string
  pending: boolean
}) {
  const waiting = pending && !event
  return (
    <div className="flex h-full flex-col items-center justify-center p-5 text-center">
      {waiting ? (
        <LoaderCircle
          aria-hidden
          className="h-6 w-6 animate-spin text-signal motion-reduce:animate-none"
        />
      ) : (
        <Image aria-hidden className="h-6 w-6 text-muted" />
      )}
      <p className="mt-3 font-semibold text-sm">
        {waiting ? `Preparing the ${label.toLowerCase()}` : 'Preview image unavailable'}
      </p>
      <p className="mt-1 max-w-xs text-muted text-xs leading-5">
        {waiting
          ? 'It will appear here automatically as soon as it is ready.'
          : event
            ? 'The layout was still checked and the website can continue to be rebuilt.'
            : 'CodeRocket could not save this private snapshot.'}
      </p>
    </div>
  )
}

function captureMatches(event: StudioImportEvent, kind: 'desktop' | 'mobile'): boolean {
  return event.artifactKind === kind || event.key === `capture-${kind}`
}

function eventIcon(kind: StudioImportEvent['kind']) {
  if (kind === 'ai') return Sparkles
  if (kind === 'capture') return Image
  if (kind === 'page') return Globe2
  if (kind === 'warning' || kind === 'failed') return TriangleAlert
  return Check
}
