import { getRulesetVersion } from '@coderocket/core'
import { calculateWebsiteLevel, calculateWebsiteStability } from '@coderocket/core/website-level'
import { getRuleDocumentationUrlBySlug } from './docs'
import { formatAuditDate, formatRelativeTime } from './format'
import type { ManagedAccessKind, ManagedAccessScope, ManagedAccessStatus } from './managed-access'
import {
  resolveAccessMode,
  resolveCheckStage,
  resolveDocumentProof,
  resolveEvidence,
  resolveGate,
  resolveWorkflowStatus
} from './project-data-normalizers'
import type {
  ProjectAudit,
  ProjectCheckProgress,
  ProjectDetail,
  ProjectFinding,
  ProjectPageCheck
} from './project-data-types'
import { getSupabaseServerConfig } from './supabase/config'
import { createSupabaseServerClient } from './supabase/server'

export type {
  ProjectAudit,
  ProjectCheckProgress,
  ProjectDetail,
  ProjectFinding,
  ProjectPageCheck
} from './project-data-types'

const OCCURRENCE_BATCH_SIZE = 500

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
  environment: 'preview',
  rulesetVersion: getRulesetVersion()
}

const demoProject: ProjectDetail = {
  id: 'demo-acme',
  name: 'Acme Storefront',
  url: 'https://acme.example',
  socialImageUrl: '/social-card.png',
  accessMode: 'public',
  authenticatedPages: [],
  pages: ['/', '/pricing', '/contact', '/products', '/checkout'],
  secureRunnerRequired: false,
  scheduleEnabled: true,
  nextCheck: 'tomorrow',
  checking: false,
  latestAudit: demoAudit,
  latestPages: [
    {
      path: '/',
      url: 'https://acme.example/',
      reachable: true,
      httpStatus: 200,
      durationMs: 420,
      finalUrl: 'https://acme.example/',
      document: {
        byteLength: 48_320,
        fetchedAt: '2026-07-16T10:42:00.000Z',
        htmlOutline:
          '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Acme Storefront</title>\n<link rel="stylesheet" href="/assets/app.css">\n</head>\n<body>\n<header>\n</header>\n<main>\n</main>\n</body>\n</html>',
        sha256: '9b60bcf65e52f5a5057a24e11fc99ce39834979b519ad44326ca997a0d45f19c',
        cacheStatus: 'Vercel: HIT · Age: 37s',
        contentType: 'text/html',
        etag: '"acme-home-v4"',
        title: 'Acme Storefront'
      }
    }
  ],
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
  ciRuns: 0,
  level: calculateWebsiteLevel({
    auditStatus: 'succeeded',
    checkedPages: 5,
    requestedPages: 5,
    gate: 'failed',
    findings: [
      { identity: 'demo-finding-1', priority: 'high', status: 'new' },
      { identity: 'demo-finding-2', priority: 'high', status: 'new' }
    ]
  }),
  stability: calculateWebsiteStability(
    [
      {
        status: 'succeeded',
        checkedPages: 5,
        requestedPages: 5,
        blockingCount: 2,
        rulesetVersion: getRulesetVersion()
      }
    ],
    getRulesetVersion()
  )
}

const demoUrlErrorAudit: ProjectAudit = {
  ...demoAudit,
  id: 'demo-audit-url-error',
  status: 'succeeded',
  gate: 'inconclusive',
  newCount: 0,
  persistentCount: 0,
  resolvedCount: 0,
  blockingCount: 0,
  requestedPageCount: 3,
  checkedPageCount: 1,
  trigger: 'manual',
  environment: 'production'
}

const demoUrlErrorProject: ProjectDetail = {
  ...demoProject,
  id: 'demo-url-error',
  name: 'Watch Peak',
  url: 'https://watchpeak.example',
  socialImageUrl: undefined,
  pages: ['/', '/contact', '/pricing'],
  latestAudit: demoUrlErrorAudit,
  latestPages: [
    {
      path: '/',
      url: 'https://watchpeak.example/',
      reachable: true,
      httpStatus: 200,
      durationMs: 380
    },
    {
      path: '/contact',
      url: 'https://watchpeak.example/contact',
      reachable: false,
      error: 'HTTP 404'
    },
    {
      path: '/pricing',
      url: 'https://watchpeak.example/pricing',
      reachable: false,
      error: 'HTTP 404'
    }
  ],
  audits: [demoUrlErrorAudit],
  findings: [],
  level: calculateWebsiteLevel({
    auditStatus: 'succeeded',
    checkedPages: 1,
    requestedPages: 3,
    gate: 'inconclusive',
    findings: []
  }),
  stability: calculateWebsiteStability([], getRulesetVersion())
}

/** Load one owner-scoped project with its latest real findings and check history. */
export async function getProjectDetail(projectId: string): Promise<ProjectDetail | null> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true')
    return projectId === demoProject.id
      ? demoProject
      : projectId === demoUrlErrorProject.id
        ? demoUrlErrorProject
        : null
  if (!getSupabaseServerConfig()) return null
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const [
    { data: project },
    { data: audits },
    { data: activeJob },
    { data: subscription },
    { count: apiTokenCount },
    { count: ciRuns },
    { data: managedAccessConnections }
  ] = await Promise.all([
    supabase
      .from('cr_projects')
      .select(
        'id,name,production_url,social_image_url,page_paths,authenticated_page_paths,secure_runner_required,access_mode,schedule_enabled,next_audit_at,baseline_reset_at'
      )
      .eq('id', projectId)
      .eq('owner_id', auth.user.id)
      .is('archived_at', null)
      .maybeSingle(),
    supabase
      .from('cr_audits')
      .select(
        'id,status,gate_status,new_count,persistent_count,resolved_count,blocking_count,requested_page_count,checked_page_count,created_at,completed_at,trigger,environment,ruleset_version'
      )
      .eq('project_id', projectId)
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(30),
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
      .eq('trigger', 'ci'),
    supabase
      .from('cr_project_access_connections')
      .select('kind,scope,status,display_label,last_verified_at,last_error')
      .eq('project_id', projectId)
      .eq('owner_id', auth.user.id)
  ])
  if (!project) return null
  const storedAudits = audits ?? []
  const auditHistory = storedAudits.map(audit => ({
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
    environment: audit.environment,
    rulesetVersion: audit.ruleset_version
  }))
  const baselineResetAt = project.baseline_reset_at
    ? new Date(project.baseline_reset_at).getTime()
    : 0
  const latestCurrentAuditId = storedAudits.find(
    audit => new Date(audit.created_at).getTime() >= baselineResetAt
  )?.id
  const latestAudit = auditHistory.find(audit => audit.id === latestCurrentAuditId)
  let findings: ProjectFinding[] = []
  let latestPages: ProjectPageCheck[] = []
  if (latestAudit) {
    /** Fetch one bounded occurrence page so large audits remain complete. */
    const fetchOccurrenceBatch = (from: number) =>
      supabase
        .from('cr_occurrences')
        .select(
          'id,status,message,evidence,cr_findings(id,priority,title,normalized_path,rule_slug,category,source,workflow_status,workflow_note)'
        )
        .eq('audit_id', latestAudit.id)
        .eq('owner_id', auth.user.id)
        .order('id')
        .range(from, from + OCCURRENCE_BATCH_SIZE - 1)
    const [firstOccurrenceBatch, { data: auditPages }] = await Promise.all([
      fetchOccurrenceBatch(0),
      supabase
        .from('cr_audit_pages')
        .select(
          'url,normalized_path,reachable,http_status,duration_ms,error,final_url,document_proof'
        )
        .eq('audit_id', latestAudit.id)
        .eq('owner_id', auth.user.id)
        .order('normalized_path')
    ])
    if (firstOccurrenceBatch.error) throw new Error(firstOccurrenceBatch.error.message)
    let occurrences = firstOccurrenceBatch.data ?? []
    let latestBatchSize = occurrences.length
    while (latestBatchSize === OCCURRENCE_BATCH_SIZE) {
      const nextBatch = await fetchOccurrenceBatch(occurrences.length)
      if (nextBatch.error) throw new Error(nextBatch.error.message)
      const rows = nextBatch.data ?? []
      occurrences = [...occurrences, ...rows]
      latestBatchSize = rows.length
    }
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
    latestPages = (auditPages ?? []).map(page => ({
      path: page.normalized_path,
      url: page.url,
      reachable: page.reachable,
      finalUrl: page.final_url ?? undefined,
      document: resolveDocumentProof(page.document_proof),
      httpStatus: page.http_status ?? undefined,
      durationMs: page.duration_ms ?? undefined,
      error: page.error ?? undefined
    }))
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

  const level = calculateWebsiteLevel({
    auditStatus: latestAudit?.status,
    checkedPages: latestAudit?.checkedPageCount ?? 0,
    requestedPages: latestAudit?.requestedPageCount ?? project.page_paths.length,
    gate: latestAudit?.gate,
    rulesetCurrent: latestAudit?.rulesetVersion === getRulesetVersion(),
    findings: findings.map(finding => ({
      identity: finding.findingId,
      priority: finding.priority,
      status: finding.status
    }))
  })
  const stability = calculateWebsiteStability(
    auditHistory.map(audit => ({
      status: audit.status,
      checkedPages: audit.checkedPageCount,
      requestedPages: audit.requestedPageCount,
      blockingCount: audit.blockingCount,
      rulesetVersion: audit.rulesetVersion
    })),
    getRulesetVersion()
  )

  return {
    id: project.id,
    name: project.name,
    url: project.production_url,
    socialImageUrl: project.social_image_url ?? undefined,
    accessMode: resolveAccessMode(project.access_mode),
    authenticatedPages: project.authenticated_page_paths ?? [],
    pages: project.page_paths,
    secureRunnerRequired: project.secure_runner_required ?? false,
    scheduleEnabled: project.schedule_enabled,
    nextCheck: formatRelativeTime(project.next_audit_at),
    checking: Boolean(activeCheck),
    activeCheck,
    latestAudit,
    latestPages,
    audits: auditHistory,
    findings,
    plan:
      subscription?.plan_id === 'solo' || subscription?.plan_id === 'agency'
        ? subscription.plan_id
        : 'free',
    apiTokenConfigured: (apiTokenCount ?? 0) > 0,
    ciRuns: ciRuns ?? 0,
    managedAccess: resolveManagedAccess(managedAccessConnections ?? []),
    level,
    stability
  }
}

/** Collapse stored origin and page access layers into one secret-free project status. */
function resolveManagedAccess(
  connections: Array<{
    display_label: string
    kind: string
    last_error: string | null
    last_verified_at: string | null
    scope: string
    status: string
  }>
) {
  const valid = connections.filter(
    connection =>
      isManagedAccessKind(connection.kind) &&
      isManagedAccessScope(connection.scope) &&
      isManagedAccessStatus(connection.status)
  )
  const first = valid[0]
  if (!first || !isManagedAccessKind(first.kind) || !isManagedAccessScope(first.scope)) return
  const status: ManagedAccessStatus = valid.some(connection => connection.status === 'failed')
    ? 'failed'
    : valid.some(connection => connection.status === 'configured')
      ? 'configured'
      : 'verified'
  const labels = [...new Set(valid.flatMap(connection => connection.display_label.split(' + ')))]
  const verifiedDates = valid
    .flatMap(connection => (connection.last_verified_at ? [connection.last_verified_at] : []))
    .sort()
  return {
    connectionCount: valid.length,
    displayLabel: labels.join(' + '),
    kind: valid.every(connection => connection.kind === first.kind) ? first.kind : 'custom_headers',
    lastError: valid.find(connection => connection.last_error)?.last_error ?? undefined,
    lastVerifiedAt: verifiedDates.at(-1),
    scope: valid.every(connection => connection.scope === 'authenticated')
      ? 'authenticated'
      : 'all',
    status
  } satisfies ProjectDetail['managedAccess']
}

/** Narrow an untrusted database value to a supported managed-access kind. */
function isManagedAccessKind(value: unknown): value is ManagedAccessKind {
  return [
    'vercel',
    'cloudflare',
    'basic_auth',
    'bearer_token',
    'session_cookie',
    'custom_headers'
  ].includes(String(value))
}

/** Narrow an untrusted database value to a supported access scope. */
function isManagedAccessScope(value: unknown): value is ManagedAccessScope {
  return value === 'all' || value === 'authenticated'
}

/** Narrow an untrusted database value to a public managed-connection status. */
function isManagedAccessStatus(value: unknown): value is ManagedAccessStatus {
  return value === 'configured' || value === 'verified' || value === 'failed'
}
