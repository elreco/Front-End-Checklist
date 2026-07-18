import { CheckCircle2, CircleDashed, ShieldCheck } from '@repo/design-system/icons'

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
    <div className="flex min-h-28 flex-col justify-between bg-background p-4 sm:p-5">
      <dt className="font-mono text-[10px] text-muted uppercase tracking-[.1em]">{label}</dt>
      <dd className="mt-5 font-heading font-semibold text-base leading-5">{value}</dd>
    </div>
  )
}

/** Group the active monitoring entitlements into one intentional full-width summary. */
export function ProjectCoverageSummary({
  alerts,
  frequency,
  history,
  pages
}: {
  alerts: string
  frequency: string
  history: string
  pages: string
}) {
  return (
    <section className="overflow-hidden border border-border bg-surface md:col-span-2 xl:col-span-3">
      <div className="grid lg:grid-cols-[minmax(16rem,.7fr)_minmax(0,1.3fr)]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-success text-success">
              <ShieldCheck aria-hidden className="h-4 w-4" />
            </span>
            <div>
              <p className="font-mono text-[10px] text-success uppercase tracking-[.12em]">
                Monitoring coverage
              </p>
              <h2 className="mt-2 font-heading font-semibold text-lg">What is covered</h2>
            </div>
          </div>
          <p className="mt-3 max-w-md text-muted text-sm leading-6">
            The pages, check schedule, history, and alerts included for this website.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px border-border border-t bg-border sm:grid-cols-4 lg:border-t-0 lg:border-l">
          <ProjectCoverageMetric label="Pages" value={pages} />
          <ProjectCoverageMetric label="Frequency" value={frequency} />
          <ProjectCoverageMetric label="History" value={history} />
          <ProjectCoverageMetric label="Alerts" value={alerts} />
        </dl>
      </div>
    </section>
  )
}
