import type { FindingPriority } from '@coderocket/core'
import type {
  WebsiteLevel,
  WebsiteLevelResult,
  WebsiteStabilityMilestone
} from '@coderocket/core/website-level'

interface WebsiteLevelPresentation {
  backgroundClassName: string
  borderClassName: string
  description: string
  label: string
  progressClassName: string
  textClassName: string
}

const LEVEL_PRESENTATIONS: Record<WebsiteLevel, WebsiteLevelPresentation> = {
  unverified: {
    label: 'Not verified',
    description: 'A complete check of every selected page is needed before a level can be shown.',
    borderClassName: 'border-border',
    backgroundClassName: 'bg-surface-raised',
    progressClassName: 'bg-muted',
    textClassName: 'text-muted'
  },
  needs_attention: {
    label: 'Needs attention',
    description: 'At least one urgent problem is still open.',
    borderClassName: 'border-danger',
    backgroundClassName: 'bg-priority-critical-bg',
    progressClassName: 'bg-danger',
    textClassName: 'text-danger'
  },
  bronze: {
    label: 'Bronze',
    description: 'No urgent problem is open. Important problems still need work.',
    borderClassName: 'border-level-bronze',
    backgroundClassName: 'bg-level-bronze/10',
    progressClassName: 'bg-level-bronze',
    textClassName: 'text-level-bronze'
  },
  silver: {
    label: 'Silver',
    description: 'No urgent or important problem is open. Recommended improvements remain.',
    borderClassName: 'border-level-silver',
    backgroundClassName: 'bg-level-silver/10',
    progressClassName: 'bg-level-silver',
    textClassName: 'text-level-silver'
  },
  gold: {
    label: 'Gold',
    description: 'Only optional improvements remain in the verified scope.',
    borderClassName: 'border-level-gold',
    backgroundClassName: 'bg-level-gold/10',
    progressClassName: 'bg-level-gold',
    textClassName: 'text-level-gold'
  },
  platinum: {
    label: 'Platinum',
    description: 'Every applicable automated check is clear across the selected pages.',
    borderClassName: 'border-level-platinum',
    backgroundClassName: 'bg-level-platinum/10',
    progressClassName: 'bg-level-platinum',
    textClassName: 'text-level-platinum'
  }
}

const PRIORITY_LABELS: Record<FindingPriority, string> = {
  critical: 'urgent',
  high: 'important',
  medium: 'recommended',
  low: 'optional'
}

const MILESTONE_LABELS: Record<WebsiteStabilityMilestone, string> = {
  starting: 'Building history',
  steady: 'Steady',
  trusted: 'Trusted',
  proven: 'Proven'
}

/** Return the stable visual and plain-language contract for a website level. */
export function getWebsiteLevelPresentation(level: WebsiteLevel): WebsiteLevelPresentation {
  return LEVEL_PRESENTATIONS[level]
}

/** Explain the exact work required to reach the next level. */
export function getWebsiteLevelNextStep(result: WebsiteLevelResult): string {
  if (!result.eligible)
    return 'Complete every selected page with the current rule set to unlock a verified level.'
  if (result.level === 'platinum')
    return 'Platinum is the highest quality level. Keep it current with complete checks.'
  const nextLabel = result.nextLevel
    ? getWebsiteLevelPresentation(result.nextLevel).label
    : 'the next level'
  const priority = result.requiredPriority ? PRIORITY_LABELS[result.requiredPriority] : 'open'
  const noun = result.requiredFixCount === 1 ? 'problem' : 'problems'
  return `Resolve ${result.requiredFixCount} ${priority} ${noun} to reach ${nextLabel}.`
}

/** Return the user-facing label for a long-running stability milestone. */
export function getStabilityMilestoneLabel(milestone: WebsiteStabilityMilestone): string {
  return MILESTONE_LABELS[milestone]
}
