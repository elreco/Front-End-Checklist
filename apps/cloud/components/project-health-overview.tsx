import {
  Accessibility,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gauge,
  Globe2,
  Search,
  ShieldCheck
} from '@repo/design-system/icons'
import { getCategoryLabel } from '@/lib/product-language'
import type { ProjectFinding } from '@/lib/project-data'

interface ProjectHealthOverviewProps {
  checkedPages: number
  findings: ProjectFinding[]
  pending: boolean
  requestedPages: number
}

interface HealthArea {
  detail: string
  icon: typeof Globe2
  key: ProjectFinding['category'] | 'availability'
  label: string
  metric: string
  open: number
}

/** Summarizes the latest check by user-facing website health area. */
export function ProjectHealthOverview({
  checkedPages,
  findings,
  pending,
  requestedPages
}: ProjectHealthOverviewProps) {
  const unavailablePages = Math.max(0, requestedPages - checkedPages)
  const ruleAreas: Array<Pick<HealthArea, 'icon' | 'label'> & { key: ProjectFinding['category'] }> =
    [
      { key: 'search', label: getCategoryLabel('search'), icon: Search },
      { key: 'accessibility', label: getCategoryLabel('accessibility'), icon: Accessibility },
      { key: 'performance', label: getCategoryLabel('performance'), icon: Gauge },
      { key: 'security', label: getCategoryLabel('security'), icon: ShieldCheck },
      { key: 'quality', label: getCategoryLabel('quality'), icon: FileCheck2 }
    ]
  const areas: HealthArea[] = [
    {
      key: 'availability',
      label: 'Online',
      icon: Globe2,
      open: unavailablePages,
      metric: `${checkedPages}/${requestedPages}`,
      detail:
        unavailablePages > 0
          ? `${unavailablePages} ${unavailablePages === 1 ? 'page could' : 'pages could'} not be checked`
          : 'All selected pages are reachable'
    },
    ...ruleAreas.map(area => {
      const open = findings.filter(
        finding => finding.category === area.key && finding.status !== 'resolved'
      ).length
      return {
        ...area,
        open,
        metric: open > 0 ? String(open) : 'Clear',
        detail: open > 0 ? `${open} open ${open === 1 ? 'item' : 'items'}` : 'No open items'
      }
    })
  ]
  const clearAreas = pending ? 0 : areas.filter(area => area.open === 0).length

  return (
    <section aria-labelledby="health-areas-title" className="mt-5 border border-border bg-surface">
      <div className="flex flex-col justify-between gap-4 border-border border-b p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading font-semibold text-xl" id="health-areas-title">
            Website health areas
          </h2>
          <p className="mt-1 text-muted text-xs leading-5">
            See what is clear and where your website still needs attention.
          </p>
        </div>
        <div
          aria-label={
            pending
              ? 'Website check results are pending'
              : `${clearAreas} of ${areas.length} website health areas are clear`
          }
          className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start border border-border bg-background px-3 font-mono text-xs sm:self-auto"
        >
          {pending ? (
            <Clock3 aria-hidden className="h-4 w-4 text-signal" />
          ) : (
            <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
          )}
          <span>{pending ? 'Results pending' : `${clearAreas}/${areas.length} clear`}</span>
        </div>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-6">
        {areas.map(area => {
          const Icon = area.icon
          const state = pending ? 'Waiting' : area.open > 0 ? 'Review' : 'Clear'
          const borderTone = pending
            ? 'border-signal'
            : area.open > 0
              ? 'border-danger'
              : 'border-success'
          const textTone = pending ? 'text-signal' : area.open > 0 ? 'text-danger' : 'text-success'

          return (
            <article className="min-h-40 bg-surface p-4" key={area.key}>
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center border ${borderTone} ${textTone}`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                <span className={`font-mono text-[10px] uppercase tracking-[.1em] ${textTone}`}>
                  {state}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-sm">{area.label}</h3>
              <p className="mt-2 font-heading font-semibold text-2xl">
                {pending ? '—' : area.metric}
              </p>
              <p
                className={`mt-1 text-xs leading-5 ${area.open > 0 && !pending ? 'text-danger' : 'text-muted'}`}
              >
                {pending ? 'Waiting for results' : area.detail}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
