import {
  type GateStatus,
  getPlanEntitlements,
  type PlanId,
  type SiteAccessMode
} from '@coderocket/core'
import { formatRelativeTime } from './format'
import { firstRelation } from './supabase/relations'
import { createSupabaseServerClient } from './supabase/server'

export interface DashboardProject {
  id: string
  name: string
  url: string
  accessMode: SiteAccessMode
  hasCompletedCheck: boolean
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
  aiCreditAllowance: number
  aiCreditsRemaining: number
  projectCount: number
  pageCount: number
  checksThisMonth: number
  attentionCount: number
  incompleteCount: number
  setupRequiredCount: number
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
  aiCreditAllowance: 3_000,
  aiCreditsRemaining: 2_200,
  projectCount: 1,
  pageCount: 5,
  checksThisMonth: 6,
  attentionCount: 2,
  incompleteCount: 0,
  setupRequiredCount: 0,
  nextCheck: 'tomorrow',
  projects: [
    {
      id: 'demo-acme',
      name: 'Acme Storefront',
      url: 'https://acme.example',
      accessMode: 'public',
      hasCompletedCheck: true,
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
  const [
    projectsResult,
    auditsResult,
    subscriptionResult,
    tokensResult,
    sharesResult,
    runsResult,
    activeJobsResult,
    aiUsageResult
  ] = await Promise.all([
    supabase
      .from('cr_projects')
      .select('id,name,production_url,page_paths,access_mode,next_audit_at,schedule_enabled')
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
    supabase.from('cr_subscriptions').select('plan_id').eq('owner_id', auth.user.id).maybeSingle(),
    supabase
      .from('cr_api_tokens')
      .select('project_id')
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
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('cr_jobs')
      .select('project_id')
      .eq('owner_id', auth.user.id)
      .eq('kind', 'audit')
      .in('status', ['queued', 'leased']),
    supabase
      .from('cr_ai_usage_accounts')
      .select('allowance_credits,consumed_credits,reserved_credits')
      .eq('owner_id', auth.user.id)
      .maybeSingle()
  ])

  const plan = resolvePlan(subscriptionResult.data?.plan_id)
  const limits = getPlanEntitlements(plan)
  const projects = projectsResult.data ?? []
  const audits = auditsResult.data ?? []
  const activeProjectIds = new Set(
    (activeJobsResult.data ?? []).flatMap(job => (job.project_id ? [job.project_id] : []))
  )
  const connectedProjectIds = new Set((tokensResult.data ?? []).map(token => token.project_id))
  const summaries = projects.map(project => {
    const latest = audits.find(audit => audit.project_id === project.id)
    return {
      id: project.id,
      name: project.name,
      url: project.production_url,
      accessMode: resolveAccessMode(project.access_mode),
      hasCompletedCheck: Boolean(latest),
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
      isChecking: activeProjectIds.has(project.id)
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
    aiCreditAllowance: aiUsageResult.data?.allowance_credits ?? limits.aiCreditsPerMonth,
    aiCreditsRemaining: Math.max(
      0,
      (aiUsageResult.data?.allowance_credits ?? limits.aiCreditsPerMonth) -
        (aiUsageResult.data?.consumed_credits ?? 0) -
        (aiUsageResult.data?.reserved_credits ?? 0)
    ),
    projectCount: projects.length,
    pageCount: projects.reduce((total, project) => total + project.page_paths.length, 0),
    checksThisMonth: runsResult.count ?? 0,
    attentionCount: summaries.reduce(
      (total, project) => total + (project.gate === 'failed' ? project.blockingCount : 0),
      0
    ),
    incompleteCount: summaries.filter(project => project.gate === 'inconclusive').length,
    setupRequiredCount: summaries.filter(
      project => project.accessMode === 'private' && !connectedProjectIds.has(project.id)
    ).length,
    nextCheck: earliestNextCheck ? formatRelativeTime(earliestNextCheck) : 'Not scheduled',
    projects: summaries,
    activity: audits.slice(0, 5).map(audit => ({
      id: audit.id,
      projectId: audit.project_id,
      projectName: firstRelation(audit.cr_projects)?.name ?? 'Archived site',
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
      hasDeliveryConnection: connectedProjectIds.size > 0 || (sharesResult.count ?? 0) > 0
    }
  }
}

function emptyDashboard(): DashboardData {
  const limits = getPlanEntitlements('free')
  return {
    plan: 'free',
    projectLimit: limits.projects,
    runLimit: limits.onDemandRunsPerMonth,
    aiCreditAllowance: limits.aiCreditsPerMonth,
    aiCreditsRemaining: limits.aiCreditsPerMonth,
    projectCount: 0,
    pageCount: 0,
    checksThisMonth: 0,
    attentionCount: 0,
    incompleteCount: 0,
    setupRequiredCount: 0,
    nextCheck: 'Add a site first',
    projects: [],
    activity: [],
    setup: { hasProject: false, hasSuccessfulCheck: false, hasDeliveryConnection: false }
  }
}

function resolveAccessMode(value: unknown): SiteAccessMode {
  return value === 'protected' || value === 'private' ? value : 'public'
}

function resolvePlan(value: unknown): PlanId {
  return value === 'solo' || value === 'agency' ? value : 'free'
}

function resolveGate(value: unknown): GateStatus {
  return value === 'passed' || value === 'failed' || value === 'inconclusive'
    ? value
    : 'needs_baseline'
}
