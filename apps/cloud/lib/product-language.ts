import type {
  AuditEnvironment,
  AuditTrigger,
  FindingCategory,
  FindingPriority,
  FindingStatus,
  GateStatus,
  PlanId,
  SiteAccessMode
} from '@coderocket/core'

interface GateLanguage {
  label: string
  shortDescription: string
}

const gateLanguage: Record<GateStatus, GateLanguage> = {
  passed: {
    label: 'No new problems',
    shortDescription: 'Nothing important changed since the previous complete check.'
  },
  failed: {
    label: 'Needs attention',
    shortDescription: 'At least one new important problem was found.'
  },
  needs_baseline: {
    label: 'First check saved',
    shortDescription: 'This result is the starting point for future comparisons.'
  },
  inconclusive: {
    label: 'Check incomplete',
    shortDescription: 'One or more pages could not be read, so no clear result was recorded.'
  }
}

const priorityLabels: Record<FindingPriority, string> = {
  critical: 'Urgent',
  high: 'Important',
  medium: 'Recommended',
  low: 'Optional'
}

const findingStatusLabels: Record<FindingStatus, string> = {
  new: 'New',
  persistent: 'Still open',
  resolved: 'Fixed'
}

const categoryLabels: Record<FindingCategory, string> = {
  availability: 'Online',
  search: 'Search visibility',
  accessibility: 'Accessibility',
  performance: 'Speed basics',
  security: 'Security basics',
  quality: 'Page quality'
}

const planLabels: Record<PlanId, string> = {
  free: 'Free',
  solo: 'Personal',
  agency: 'Agency'
}

const accessModeLabels: Record<SiteAccessMode, string> = {
  public: 'Cloud check',
  protected: 'Cloud check',
  private: 'Secure runner'
}

/** Return the same plain-language result label everywhere in the product. */
function getGateLanguage(status: GateStatus): GateLanguage {
  return gateLanguage[status]
}

/** Translate an internal priority into a user-facing level. */
function getPriorityLabel(priority: FindingPriority): string {
  return priorityLabels[priority]
}

/** Translate comparison state without exposing diff terminology. */
function getFindingStatusLabel(status: FindingStatus): string {
  return findingStatusLabels[status]
}

/** Return a readable website-health area name. */
function getCategoryLabel(category: FindingCategory): string {
  return categoryLabels[category]
}

/** Return the commercial plan name shown to customers. */
function getPlanLabel(plan: PlanId): string {
  return planLabels[plan]
}

/** Explain how CodeRocket reaches a monitored website. */
function getAccessModeLabel(mode: SiteAccessMode): string {
  return accessModeLabels[mode]
}

/** Explain which version of a website was checked. */
function getEnvironmentLabel(environment: AuditEnvironment): string {
  return environment === 'preview' ? 'Test version' : 'Live website'
}

/** Explain how a check started without exposing internal trigger names. */
function getTriggerLabel(trigger: AuditTrigger): string {
  if (trigger === 'scheduled') return 'Automatic'
  if (trigger === 'manual') return 'Started by you'
  return 'Secure runner'
}

export {
  getAccessModeLabel,
  getCategoryLabel,
  getEnvironmentLabel,
  getFindingStatusLabel,
  getGateLanguage,
  getPlanLabel,
  getPriorityLabel,
  getTriggerLabel
}
