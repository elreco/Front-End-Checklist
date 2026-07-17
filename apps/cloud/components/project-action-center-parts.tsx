import { CheckCircle2, CircleDashed } from '@repo/design-system/icons'

/** Render one ordered follow-up action with a visible completion state. */
export function ProjectActionStep({
  complete,
  description,
  title
}: {
  complete: boolean
  description: string
  title: string
}) {
  const Icon = complete ? CheckCircle2 : CircleDashed
  return (
    <li className="grid grid-cols-[auto_1fr] gap-3 border border-border bg-background p-3.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center border ${complete ? 'border-success text-success' : 'border-signal text-signal'}`}
      >
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-sm">{title}</p>
          <span
            className={`font-mono text-[10px] uppercase tracking-[.1em] ${complete ? 'text-success' : 'text-signal'}`}
          >
            {complete ? 'Done' : 'To do'}
          </span>
        </div>
        <p className="mt-1 text-muted text-xs leading-5">{description}</p>
      </div>
    </li>
  )
}

/** Render one compact coverage or plan fact. */
export function ProjectCoverageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">{label}</dt>
      <dd className="mt-1 font-semibold text-xs">{value}</dd>
    </div>
  )
}
