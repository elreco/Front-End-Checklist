import type {
  AuditStatus,
  FindingCategory,
  FindingPriority,
  FindingSource,
  FindingStatus,
  GateStatus
} from '@coderocket/core'
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
  status: FindingStatus
  priority: FindingPriority
  title: string
  path: string
  rule: string
  message: string
  category: FindingCategory
  source: FindingSource
}

export interface ProjectDetail {
  id: string
  name: string
  url: string
  pages: string[]
  scheduleEnabled: boolean
  nextCheck: string
  checking: boolean
  latestAudit?: ProjectAudit
  audits: ProjectAudit[]
  findings: ProjectFinding[]
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
  pages: ['/', '/pricing', '/contact', '/products', '/checkout'],
  scheduleEnabled: true,
  nextCheck: 'tomorrow',
  checking: false,
  latestAudit: demoAudit,
  audits: [demoAudit],
  findings: [
    {
      id: 'demo-finding-1',
      status: 'new',
      priority: 'high',
      title: 'Checkout button has no accessible name',
      path: '/checkout',
      rule: 'button-name',
      message: 'People using a screen reader cannot tell what this button does.',
      category: 'accessibility',
      source: 'frontend_checklist'
    },
    {
      id: 'demo-finding-2',
      status: 'new',
      priority: 'high',
      title: 'Email field is missing a visible label',
      path: '/checkout',
      rule: 'form-labels',
      message: 'The field relies on placeholder text, which disappears when someone starts typing.',
      category: 'accessibility',
      source: 'frontend_checklist'
    }
  ]
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
  const [{ data: project }, { data: audits }, { count: pendingJobs }] = await Promise.all([
    supabase
      .from('cr_projects')
      .select('id,name,production_url,page_paths,schedule_enabled,next_audit_at')
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
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('owner_id', auth.user.id)
      .in('status', ['queued', 'leased'])
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
        'id,status,message,cr_findings(priority,title,normalized_path,rule_slug,category,source)'
      )
      .eq('audit_id', latestAudit.id)
      .eq('owner_id', auth.user.id)
    findings = (occurrences ?? []).flatMap(occurrence =>
      occurrence.cr_findings.map(finding => ({
        id: occurrence.id,
        status: occurrence.status,
        priority: finding.priority,
        title: finding.title,
        path: finding.normalized_path,
        rule: finding.rule_slug,
        message: occurrence.message,
        category: finding.category,
        source: finding.source
      }))
    )
  }

  return {
    id: project.id,
    name: project.name,
    url: project.production_url,
    pages: project.page_paths,
    scheduleEnabled: project.schedule_enabled,
    nextCheck: formatRelativeTime(project.next_audit_at),
    checking: (pendingJobs ?? 0) > 0,
    latestAudit,
    audits: auditHistory,
    findings
  }
}

function resolveGate(value: unknown): GateStatus {
  return value === 'passed' || value === 'failed' || value === 'inconclusive'
    ? value
    : 'needs_baseline'
}
