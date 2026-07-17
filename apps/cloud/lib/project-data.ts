import type {
  AuditStatus,
  CheckProgressStage,
  FindingCategory,
  FindingEvidence,
  FindingPriority,
  FindingSource,
  FindingStatus,
  GateStatus,
  SiteAccessMode
} from '@coderocket/core'
import { getRuleDocumentationUrlBySlug } from './docs'
import { formatAuditDate, formatRelativeTime } from './format'
import { createSupabaseServerClient } from './supabase/server'

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

export interface ProjectDetail {
  id: string
  name: string
  url: string
  accessMode: SiteAccessMode
  pages: string[]
  scheduleEnabled: boolean
  nextCheck: string
  checking: boolean
  activeCheck?: ProjectCheckProgress
  latestAudit?: ProjectAudit
  audits: ProjectAudit[]
  findings: ProjectFinding[]
  plan: 'free' | 'solo' | 'agency'
  apiTokenConfigured: boolean
  ciRuns: number
}

const demoAudit: ProjectAudit = {
  id: 'demo-audit-1',
  status: 'succeeded',
  gate: 'failed',
  newCount: 2,
  persistentCount: 1,
  resolvedCount: 1,
  blockingCount: 2,
  requestedPageCount: 5,
  checkedPageCount: 5,
  when: '12 minutes ago',
  date: 'Jul 16, 2026, 10:42 AM',
  trigger: 'ci',
  environment: 'preview'
}

const demoProject: ProjectDetail = {
  id: 'demo-acme',
  name: 'Acme Storefront',
  url: 'https://acme.example',
  accessMode: 'public',
  pages: ['/', '/pricing', '/contact', '/products', '/checkout'],
  scheduleEnabled: true,
  nextCheck: 'tomorrow',
  checking: false,
  latestAudit: demoAudit,
  audits: [demoAudit],
  findings: [
    {
      id: 'demo-finding-1',
      findingId: 'demo-finding-1',
      projectId: 'demo-acme',
      status: 'new',
      priority: 'high',
      title: 'Checkout button has no accessible name',
      path: '/checkout',
      rule: 'button-name',
      message: 'People using a screen reader cannot tell what this button does.',
      category: 'accessibility',
      source: 'frontend_checklist',
      documentationUrl: '/docs/rules/accessibility/button-name',
      evidence: {
        kind: 'html',
        summary: 'The checkout button has no text or accessible label.',
        observed: '<button><svg /></button>',
        expected: 'Visible text or an aria-label that explains the action'
      },
      workflowStatus: 'open'
    },
    {
      id: 'demo-finding-2',
      findingId: 'demo-finding-2',
      projectId: 'demo-acme',
      status: 'new',
      priority: 'high',
      title: 'Email field is missing a visible label',
      path: '/checkout',
      rule: 'form-labels',
      message: 'The field relies on placeholder text, which disappears when someone starts typing.',
      category: 'accessibility',
      source: 'frontend_checklist',
      documentationUrl: '/docs/rules/accessibility/form-labels',
      workflowStatus: 'open'
    }
  ],
  plan: 'free',
  apiTokenConfigured: false,
  ciRuns: 0
}

/** Load one owner-scoped project with its latest real findings and check history. */
export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true')
    return projectId === demoProject.id ? demoProject : null
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
    return null
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const [
    { data: project },
    { data: audits },
    { data: activeJob },
    { data: subscription },
    { count: apiTokenCount },
    { count: ciRuns }
  ] = await Promise.all([
    supabase
      .from('cr_projects')
      .select('id,name,production_url,page_paths,access_mode,schedule_enabled,next_audit_at')
      .eq('id', projectId)
      .eq('owner_id', auth.user.id)
      .is('archived_at', null)
      .maybeSingle(),
    supabase
      .from('cr_audits')
      .select(
        'id,status,gate_status,new_count,persistent_count,resolved_count,blocking_count,requested_page_count,checked_page_count,created_at,completed_at,trigger,environment'
      )
      .eq('project_id', projectId)
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('cr_jobs')
      .select(
        'id,status,attempts,progress_stage,progress_current,progress_total,progress_message,progress_updated_at,created_at'
      )
      .eq('project_id', projectId)
      .eq('owner_id', auth.user.id)
      .eq('kind', 'audit')
      .in('status', ['queued', 'leased'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('cr_subscriptions').select('plan_id').eq('owner_id', auth.user.id).maybeSingle(),
    supabase
      .from('cr_api_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('owner_id', auth.user.id)
      .is('revoked_at', null),
    supabase
      .from('cr_audits')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('owner_id', auth.user.id)
      .eq('trigger', 'ci')
  ])
  if (!project) return null
  const auditHistory = (audits ?? []).map(audit => ({
    id: audit.id,
    status: audit.status,
    gate: resolveGate(audit.gate_status),
    newCount: audit.new_count,
    persistentCount: audit.persistent_count,
    resolvedCount: audit.resolved_count,
    blockingCount: audit.blocking_count,
    requestedPageCount: audit.requested_page_count ?? 0,
    checkedPageCount: audit.checked_page_count ?? 0,
    when: formatRelativeTime(audit.completed_at ?? audit.created_at),
    date: formatAuditDate(audit.completed_at ?? audit.created_at),
    trigger: audit.trigger,
    environment: audit.environment
  }))
  const latestAudit = auditHistory[0]
  let findings: ProjectFinding[] = []
  if (latestAudit) {
    const { data: occurrences } = await supabase
      .from('cr_occurrences')
      .select(
        'id,status,message,evidence,cr_findings(id,priority,title,normalized_path,rule_slug,category,source,workflow_status,workflow_note)'
      )
      .eq('audit_id', latestAudit.id)
      .eq('owner_id', auth.user.id)
    findings = (occurrences ?? []).flatMap(occurrence => {
      const relatedFindings = Array.isArray(occurrence.cr_findings)
        ? occurrence.cr_findings
        : [occurrence.cr_findings]
      return relatedFindings.flatMap(finding =>
        finding
          ? [
              {
                id: occurrence.id,
                findingId: finding.id,
                projectId: project.id,
                status: occurrence.status,
                priority: finding.priority,
                title: finding.title,
                path: finding.normalized_path,
                rule: finding.rule_slug,
                message: occurrence.message,
                category: finding.category,
                source: finding.source,
                documentationUrl:
                  finding.source === 'http' &&
                  finding.rule_slug === 'coderocket-server-response-time'
                    ? '/docs/audits#http-checks'
                    : getRuleDocumentationUrlBySlug(finding.rule_slug),
                evidence: resolveEvidence(occurrence.evidence),
                workflowStatus: resolveWorkflowStatus(finding.workflow_status),
                workflowNote: finding.workflow_note ?? undefined
              }
            ]
          : []
      )
    })
  }

  const activeCheck: ProjectCheckProgress | undefined = activeJob
    ? {
        id: activeJob.id,
        status: activeJob.status,
        stage: resolveCheckStage(activeJob.progress_stage),
        current: activeJob.progress_current ?? 0,
        total: activeJob.progress_total || project.page_paths.length,
        message: activeJob.progress_message ?? 'Waiting for the website checking service',
        attempts: activeJob.attempts,
        createdAt: activeJob.created_at,
        updatedAt: activeJob.progress_updated_at ?? activeJob.created_at
      }
    : undefined

  return {
    id: project.id,
    name: project.name,
    url: project.production_url,
    accessMode: resolveAccessMode(project.access_mode),
    pages: project.page_paths,
    scheduleEnabled: project.schedule_enabled,
    nextCheck: formatRelativeTime(project.next_audit_at),
    checking: Boolean(activeCheck),
    activeCheck,
    latestAudit,
    audits: auditHistory,
    findings,
    plan:
      subscription?.plan_id === 'solo' || subscription?.plan_id === 'agency'
        ? subscription.plan_id
        : 'free',
    apiTokenConfigured: (apiTokenCount ?? 0) > 0,
    ciRuns: ciRuns ?? 0
  }
}

function resolveAccessMode(value: unknown): SiteAccessMode {
  return value === 'protected' || value === 'private' ? value : 'public'
}

function resolveEvidence(value: unknown): FindingEvidence | undefined {
  if (!value || typeof value !== 'object') return undefined
  const evidence = value as Record<string, unknown>
  if (evidence.kind !== 'html' && evidence.kind !== 'header' && evidence.kind !== 'network')
    return undefined
  if (typeof evidence.summary !== 'string') return undefined
  return {
    kind: evidence.kind,
    summary: evidence.summary,
    observed: typeof evidence.observed === 'string' ? evidence.observed : undefined,
    expected: typeof evidence.expected === 'string' ? evidence.expected : undefined
  }
}

function resolveWorkflowStatus(value: unknown): 'open' | 'acknowledged' | 'muted' {
  return value === 'acknowledged' || value === 'muted' ? value : 'open'
}

function resolveCheckStage(value: unknown): CheckProgressStage {
  return value === 'starting' ||
    value === 'checking_pages' ||
    value === 'comparing' ||
    value === 'saving' ||
    value === 'retrying' ||
    value === 'completed'
    ? value
    : 'queued'
}

function resolveGate(value: unknown): GateStatus {
  return value === 'passed' || value === 'failed' || value === 'inconclusive'
    ? value
    : 'needs_baseline'
}
