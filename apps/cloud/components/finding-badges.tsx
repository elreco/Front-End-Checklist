import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CircleMinus,
  CirclePlus,
  Clock3,
  ShieldAlert
} from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { getFindingStatusLabel, getPriorityLabel } from '@/lib/product-language'
import type { ProjectFinding } from '@/lib/project-data'

const priorityIcons = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: CircleDot,
  low: CircleMinus
} as const

const statusPresentation = {
  new: {
    icon: CirclePlus,
    className: 'border-signal bg-surface-raised text-signal'
  },
  persistent: {
    icon: Clock3,
    className: 'border-border bg-background text-muted'
  },
  resolved: {
    icon: CheckCircle2,
    className: 'border-success bg-surface-raised text-success'
  }
} as const

const findingBadgeClassName =
  'gap-1.5 rounded-none px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.08em]'

/** Shows a finding priority with a stable tone and a recognisable non-decorative icon. */
export function FindingPriorityBadge({ priority }: { priority: ProjectFinding['priority'] }) {
  const Icon = priorityIcons[priority]
  return (
    <Badge className={findingBadgeClassName} size="sm" variant={priority}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {getPriorityLabel(priority)}
    </Badge>
  )
}

/** Shows whether a finding is new, still open, or fixed without competing with priority. */
export function FindingStatusBadge({ status }: { status: ProjectFinding['status'] }) {
  const presentation = statusPresentation[status]
  const Icon = presentation.icon
  return (
    <Badge
      className={`${findingBadgeClassName} ${presentation.className}`}
      size="sm"
      variant="outline"
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {getFindingStatusLabel(status)}
    </Badge>
  )
}
