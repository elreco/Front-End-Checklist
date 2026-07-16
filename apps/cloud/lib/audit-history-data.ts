import type { AuditEnvironment, AuditStatus, AuditTrigger, GateStatus } from '@coderocket/core'
import { formatAuditDate } from './format'
import { createSupabaseServerClient } from './supabase/server'

export interface AuditHistoryItem {
  id: string
  projectId: string
  projectName: string
  environment: AuditEnvironment
  trigger: AuditTrigger
  status: AuditStatus
  gate: GateStatus
  blockingCount: number
  newCount: number
  date: string
}

const demoHistory: AuditHistoryItem[] = [
  {
    id: 'demo-audit-1',
    projectId: 'demo-acme',
    projectName: 'Acme Storefront',
    environment: 'preview',
    trigger: 'ci',
    status: 'succeeded',
    gate: 'failed',
    blockingCount: 2,
    newCount: 2,
    date: 'Jul 16, 2026, 10:42 AM'
  }
]

/** Load owner-scoped checks for the product history screen. */
export async function getAuditHistory(): Promise<AuditHistoryItem[]> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return demoHistory
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY))
    return []
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []
  const { data } = await supabase
    .from('cr_audits')
    .select(
      'id,project_id,environment,trigger,status,gate_status,blocking_count,new_count,created_at,completed_at,cr_projects(name)'
    )
    .eq('owner_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []).map(audit => ({
    id: audit.id,
    projectId: audit.project_id,
    projectName: audit.cr_projects?.[0]?.name ?? 'Archived site',
    environment: audit.environment,
    trigger: audit.trigger,
    status: audit.status,
    gate: resolveGate(audit.gate_status),
    blockingCount: audit.blocking_count,
    newCount: audit.new_count,
    date: formatAuditDate(audit.completed_at ?? audit.created_at)
  }))
}

function resolveGate(value: unknown): GateStatus {
  return value === 'passed' || value === 'failed' || value === 'inconclusive'
    ? value
    : 'needs_baseline'
}
