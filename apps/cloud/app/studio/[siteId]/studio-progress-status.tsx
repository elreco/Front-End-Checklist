import {
  Check,
  Clock3,
  FileCheck2,
  Globe2,
  LayoutTemplate,
  LoaderCircle,
  Radio,
  Sparkles
} from '@repo/design-system/icons'

const creationSteps = [
  { label: 'Starting', threshold: 3, icon: Clock3 },
  { label: 'Reading your website', threshold: 15, icon: Globe2 },
  { label: 'Learning the design', threshold: 38, icon: Sparkles },
  { label: 'Building your pages', threshold: 55, icon: LayoutTemplate },
  { label: 'Final checks', threshold: 90, icon: FileCheck2 }
]

export type StudioConnectionMode = 'connecting' | 'live' | 'fallback'

/** Show the five stable creation milestones without exposing worker-specific stages. */
export function StudioCreationSteps({ percent }: { percent: number }) {
  const activeIndex = activeStepIndex(percent)
  return (
    <ol className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-5">
      {creationSteps.map(({ icon: Icon, label }, index) => {
        const complete = index < activeIndex || percent === 100
        const active = index === activeIndex && percent < 100
        return (
          <li
            className={`flex items-center gap-2 bg-background px-3 py-3 font-mono text-[10px] uppercase tracking-[.06em] ${
              complete || active ? 'text-foreground' : 'text-muted'
            }`}
            key={label}
          >
            {complete ? (
              <Check aria-hidden className="h-3.5 w-3.5 text-success" />
            ) : active ? (
              <LoaderCircle
                aria-hidden
                className="h-3.5 w-3.5 animate-spin text-signal motion-reduce:animate-none"
              />
            ) : (
              <Icon aria-hidden className="h-3.5 w-3.5" />
            )}
            {label}
          </li>
        )
      })}
    </ol>
  )
}

/** Indicate how fresh updates arrive without suggesting that the browser owns the job. */
export function StudioConnectionBadge({ mode }: { mode: StudioConnectionMode }) {
  const live = mode === 'live'
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.12em] ${
        live ? 'border-signal text-signal' : 'border-border text-muted'
      }`}
    >
      <Radio
        aria-hidden
        className={`h-3.5 w-3.5 ${live ? 'animate-pulse motion-reduce:animate-none' : ''}`}
      />
      {live ? 'Live updates' : mode === 'connecting' ? 'Connecting' : 'Checking for updates'}
    </span>
  )
}

/** Return the current owner-facing milestone label. */
export function currentStudioStepLabel(percent: number): string {
  return creationSteps[activeStepIndex(percent)]?.label ?? creationSteps[0].label
}

/** Format a compact elapsed time without implying a completion estimate. */
export function formatStudioElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`
}

function activeStepIndex(percent: number): number {
  return creationSteps.reduce(
    (activeIndex, step, index) => (percent >= step.threshold ? index : activeIndex),
    0
  )
}
