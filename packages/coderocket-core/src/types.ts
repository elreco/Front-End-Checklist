export type PlanId = 'free' | 'solo' | 'agency'
export type AuditEnvironment = 'production' | 'preview'
export type AuditTrigger = 'manual' | 'scheduled' | 'ci'
export type AuditStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type FindingStatus = 'new' | 'persistent' | 'resolved'
export type GateStatus = 'passed' | 'failed' | 'needs_baseline'
export type FindingPriority = 'critical' | 'high' | 'medium' | 'low'

export interface PlanEntitlements {
  projects: number
  pagesPerProject: number
  schedule: 'weekly' | 'daily'
  onDemandRunsPerMonth: number
  retentionDays: number
  secondaryBranding: boolean
}

export interface AuditFindingInput {
  pagePath: string
  ruleSlug: string
  title: string
  priority: FindingPriority
  message: string
}

export interface AuditFinding extends AuditFindingInput {
  fingerprint: string
  status: FindingStatus
}

export interface AuditComparison {
  gate: GateStatus
  findings: AuditFinding[]
  counts: Record<FindingStatus, number>
  blockingRegressions: number
}

export interface AuditSubmission {
  projectId?: string
  environment: AuditEnvironment
  trigger: AuditTrigger
  rulesetVersion: string
  commitSha?: string
  branch?: string
  pullRequest?: string
  pages: Array<{
    url: string
    reachable: boolean
    findings: AuditFindingInput[]
    error?: string
  }>
}
