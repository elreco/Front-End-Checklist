import { AlertTriangle, CheckCircle2 } from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'

/** Explain where to start without competing with the full findings list. */
export function ProjectAnalysisSummary({
  importantCount,
  knownCount,
  newCount
}: {
  importantCount: number
  knownCount: number
  newCount: number
}) {
  const clear = newCount === 0 && knownCount === 0
  const title =
    newCount > 0
      ? 'Review what just changed'
      : knownCount > 0
        ? 'Work through known problems'
        : 'Nothing needs action'
  const description =
    newCount > 0
      ? 'Start with new important problems. They appear first in the list below.'
      : knownCount > 0
        ? 'Nothing new appeared. Known problems are ordered by impact, with the most important first.'
        : 'Everything from the latest complete check has been reviewed or fixed.'
  const StatusIcon = clear ? CheckCircle2 : AlertTriangle

  return (
    <aside
      aria-label="Recommended analysis focus"
      className="flex flex-col justify-center border-border border-t bg-background p-5 xl:border-t-0 xl:border-l"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
          Where to start
        </p>
        <Badge
          className="gap-1.5 rounded-none font-mono"
          size="sm"
          variant={importantCount > 0 ? 'high' : 'success'}
        >
          <StatusIcon aria-hidden className="h-3.5 w-3.5" />
          {importantCount > 0
            ? `${importantCount} important`
            : clear
              ? 'All clear'
              : 'No urgent item'}
        </Badge>
      </div>
      <h3 className="mt-3 font-heading font-semibold text-xl">{title}</h3>
      <p className="mt-2 text-muted text-sm leading-6">{description}</p>
    </aside>
  )
}
