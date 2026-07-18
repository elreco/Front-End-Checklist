import type {
  AuditStatus,
  CheckProgressStage,
  DocumentProof,
  FindingCategory,
  FindingEvidence,
  FindingPriority,
  FindingSource,
  FindingStatus,
  GateStatus,
  SiteAccessMode
} from '@coderocket/core'
import type { WebsiteLevelResult, WebsiteStabilityResult } from '@coderocket/core/website-level'
import type { ProjectManagedAccess } from './managed-access'

export interface ProjectAudit {
  id: string
  status: AuditStatus
  gate: GateStatus
  newCount: number
  persistentCount: number
  resolvedCount: number
  blockingCount: number
  requestedPageCount: number
  checkedPageCount: number
  when: string
  date: string
  trigger: 'manual' | 'scheduled' | 'ci'
  environment: 'production' | 'preview'
  rulesetVersion: string
}

export interface ProjectFinding {
  id: string
  findingId: string
  projectId: string
  status: FindingStatus
  priority: FindingPriority
  title: string
  path: string
  rule: string
  message: string
  category: FindingCategory
  source: FindingSource
  documentationUrl: string
  evidence?: FindingEvidence
  workflowStatus: 'open' | 'acknowledged' | 'muted'
  workflowNote?: string
}

export interface ProjectCheckProgress {
  id: string
  status: 'queued' | 'leased' | 'succeeded' | 'failed' | 'cancelled'
  stage: CheckProgressStage
  current: number
  total: number
  message: string
  attempts: number
  createdAt: string
  updatedAt: string
}

export interface ProjectPageCheck {
  document?: DocumentProof
  durationMs?: number
  error?: string
  finalUrl?: string
  httpStatus?: number
  path: string
  reachable: boolean
  url: string
}

export interface ProjectDetail {
  id: string
  name: string
  url: string
  socialImageUrl?: string
  accessMode: SiteAccessMode
  authenticatedPages: string[]
  pages: string[]
  secureRunnerRequired: boolean
  scheduleEnabled: boolean
  nextCheck: string
  checking: boolean
  activeCheck?: ProjectCheckProgress
  latestAudit?: ProjectAudit
  latestPages: ProjectPageCheck[]
  audits: ProjectAudit[]
  findings: ProjectFinding[]
  plan: 'free' | 'solo' | 'agency'
  apiTokenConfigured: boolean
  ciRuns: number
  managedAccess?: ProjectManagedAccess
  level: WebsiteLevelResult
  stability: WebsiteStabilityResult
}
