import { type GateStatus, getPlanEntitlements, type PlanId } from '@coderocket/core'
import { formatRelativeTime } from './format'
import { createSupabaseServerClient } from './supabase/server'

export interface DashboardProject {
  id: string
  name: string
  url: string
  pageCount: number
  gate: GateStatus
  blockingCount: number
  newCount: number
  requestedPageCount: number
  checkedPageCount: number
  lastRun: string
  nextCheck: string
  isChecking: boolean
}

export interface DashboardActivity {
  id: string
  projectId: string
  projectName: string
  gate: GateStatus
  status: string
  environment: 'production' | 'preview'
  trigger: 'manual' | 'scheduled' | 'ci'
  blockingCount: number
  happenedAt: string
}

export interface DashboardData {
  plan: PlanId
  projectLimit: number
  runLimit: number
  projectCount: number
  pageCount: number
  checksThisMonth: number
  attentionCount: number
  incompleteCount: number
  nextCheck: string
  projects: DashboardProject[]
  activity: DashboardActivity[]
  setup: {
    hasProject: boolean
    hasSuccessfulCheck: boolean
    hasDeliveryConnection: boolean
  }
}

const demoData: DashboardData = {
  plan: 'free',
  projectLimit: 1,
  runLimit: 10,
  projectCount: 1,
  pageCount: 5,
  checksThisMonth: 6,
  attentionCount: 2,
  incompleteCount: 0,
  nextCheck: 'tomorrow',
  projects: [
    {
      id: 'demo-acme',
      name: 'Acme Storefront',
      url: 'https://acme.example',
      pageCount: 5,
      gate: 'failed',
      blockingCount: 2,
      newCount: 2,
      requestedPageCount: 5,
      checkedPageCount: 5,
      lastRun: '12 minutes ago',
      nextCheck: 'tomorrow',
      isChecking: false
    }
  ],
  activity: [
    {
      id: 'demo-audit-1',
      projectId: 'demo-acme',
      projectName: 'Acme Storefront',
      gate: 'failed',
      status: 'succeeded',
      environment: 'preview',
      trigger: 'ci',
      blockingCount: 2,
      happenedAt: '12 minutes ago'
    }
  ],
  setup: { hasProject: true, hasSuccessfulCheck: true, hasDeliveryConnection: false }
}

/** Load the real workspace overview used by the authenticated dashboard. */
export async function getDashboardData(): Promise<DashboardData> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return demoData
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
    return emptyDashboard()

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return emptyDashboard()

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const [projectsResult, auditsResult, subscriptionResult, tokensResult, sharesResult, runsResult] =
    await Promise.all([
      supabase
        .from('cr_projects')
        .select('id,name,production_url,page_paths,next_audit_at,schedule_enabled')
        .eq('owner_id', auth.user.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('cr_audits')
        .select(
          'id,project_id,environment,trigger,status,gate_status,new_count,blocking_count,requested_page_count,checked_page_count,created_at,completed_at,cr_projects(name)'
        )
        .eq('owner_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('cr_subscriptions')
        .select('plan_id')
        .eq('owner_id', auth.user.id)
        .maybeSingle(),
      supabase
        .from('cr_api_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', auth.user.id)
        .is('revoked_at', null),
      supabase
        .from('cr_share_links')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', auth.user.id)
        .is('revoked_at', null),
      supabase
        .from('cr_audits')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', auth.user.id)
        .in('trigger', ['manual', 'ci'])
        .gte('created_at', monthStart.toISOString())
    ])

  const plan = resolvePlan(subscriptionResult.data?.plan_id)
  const limits = getPlanEntitlements(plan)
  const projects = projectsResult.data ?? []
  const audits = auditsResult.data ?? []
  const summaries = projects.map(project => {
    const latest = audits.find(audit => audit.project_id === project.id)
    const pending = audits.some(
      audit => audit.project_id === project.id && ['queued', 'running'].includes(audit.status)
    )
    return {
      id: project.id,
      name: project.name,
      url: project.production_url,
      pageCount: project.page_paths.length,
      gate: resolveGate(latest?.gate_status),
      blockingCount: latest?.blocking_count ?? 0,
      newCount: latest?.new_count ?? 0,
      requestedPageCount: latest?.requested_page_count ?? project.page_paths.length,
      checkedPageCount: latest?.checked_page_count ?? 0,
      lastRun: formatRelativeTime(latest?.completed_at ?? latest?.created_at),
      nextCheck: project.schedule_enabled
        ? formatRelativeTime(project.next_audit_at)
        : 'Automatic checks paused',
      isChecking: pending
    }
  })
  const completedAudits = audits.filter(audit => audit.status === 'succeeded')
  const earliestNextCheck = projects
    .filter(project => project.schedule_enabled)
    .map(project => project.next_audit_at)
    .sort()[0]

  return {
    plan,
    projectLimit: limits.projects,
    runLimit: limits.onDemandRunsPerMonth,
    projectCount: projects.length,
    pageCount: projects.reduce((total, project) => total + project.page_paths.length, 0),
    checksThisMonth: runsResult.count ?? 0,
    attentionCount: summaries.reduce(
      (total, project) => total + (project.gate === 'failed' ? project.blockingCount : 0),
      0
    ),
    incompleteCount: summaries.filter(project => project.gate === 'inconclusive').length,
    nextCheck: earliestNextCheck ? formatRelativeTime(earliestNextCheck) : 'Not scheduled',
    projects: summaries,
    activity: audits.slice(0, 5).map(audit => ({
      id: audit.id,
      projectId: audit.project_id,
      projectName: audit.cr_projects?.[0]?.name ?? 'Archived site',
      gate: resolveGate(audit.gate_status),
      status: audit.status,
      environment: audit.environment,
      trigger: audit.trigger,
      blockingCount: audit.blocking_count,
      happenedAt: formatRelativeTime(audit.completed_at ?? audit.created_at)
    })),
    setup: {
      hasProject: projects.length > 0,
      hasSuccessfulCheck: completedAudits.length > 0,
      hasDeliveryConnection: (tokensResult.count ?? 0) > 0 || (sharesResult.count ?? 0) > 0
    }
  }
}

function emptyDashboard(): DashboardData {
  const limits = getPlanEntitlements('free')
  return {
    plan: 'free',
    projectLimit: limits.projects,
    runLimit: limits.onDemandRunsPerMonth,
    projectCount: 0,
    pageCount: 0,
    checksThisMonth: 0,
    attentionCount: 0,
    incompleteCount: 0,
    nextCheck: 'Add a site first',
    projects: [],
    activity: [],
    setup: { hasProject: false, hasSuccessfulCheck: false, hasDeliveryConnection: false }
  }
}

function resolvePlan(value: unknown): PlanId {
  return value === 'solo' || value === 'agency' ? value : 'free'
}

function resolveGate(value: unknown): GateStatus {
  return value === 'passed' || value === 'failed' || value === 'inconclusive'
    ? value
    : 'needs_baseline'
}
