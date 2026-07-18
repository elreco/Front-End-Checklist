export type PlanId = 'free' | 'solo' | 'agency'
export type AuditEnvironment = 'production' | 'preview'
export type AuditTrigger = 'manual' | 'scheduled' | 'ci'
export type SiteAccessMode = 'public' | 'protected' | 'private'
export type PageAccessMode = 'anonymous' | 'authenticated'
export type AuditStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type CheckProgressStage =
  | 'queued'
  | 'starting'
  | 'checking_pages'
  | 'comparing'
  | 'saving'
  | 'retrying'
  | 'completed'
export type FindingStatus = 'new' | 'persistent' | 'resolved'
export type GateStatus = 'passed' | 'failed' | 'needs_baseline' | 'inconclusive'
export type FindingPriority = 'critical' | 'high' | 'medium' | 'low'
export type FindingCategory =
  | 'availability'
  | 'search'
  | 'accessibility'
  | 'performance'
  | 'security'
  | 'quality'
export type FindingSource = 'frontend_checklist' | 'http'

export type FindingEvidenceKind = 'html' | 'header' | 'network'

export interface FindingEvidence {
  kind: FindingEvidenceKind
  summary: string
  observed?: string
  expected?: string
}

export interface DocumentProof {
  byteLength: number
  fetchedAt: string
  htmlOutline: string
  sha256: string
  cacheStatus?: string
  contentType?: string
  etag?: string
  lastModified?: string
  title?: string
}

export interface PlanEntitlements {
  projects: number
  pagesPerProject: number
  schedule: 'weekly' | 'daily'
  onDemandRunsPerMonth: number
  retentionDays: number
  secondaryBranding: boolean
  aiCreditsPerMonth: number
}

export interface AuditFindingInput {
  pagePath: string
  ruleSlug: string
  title: string
  priority: FindingPriority
  message: string
  category?: FindingCategory
  source?: FindingSource
  occurrenceKey?: string
  evidence?: FindingEvidence
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
    httpStatus?: number
    durationMs?: number
    finalUrl?: string
    document?: DocumentProof
    siteImageUrls?: string[]
    socialImageUrl?: string
    error?: string
  }>
}
