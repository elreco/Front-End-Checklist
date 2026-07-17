import { createHash } from 'node:crypto'
import { createServiceClient } from '@coderocket/db'
import { CODEROCKET_TAGLINE, CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck } from '@repo/design-system/icons'
import { notFound } from 'next/navigation'
import { createPrivateMetadata } from '@/lib/seo'
import { firstRelation, normalizeRelation } from '@/lib/supabase/relations'

export const metadata = createPrivateMetadata('Private website report')

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (token.length < 32) notFound()
  const db = createServiceClient()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data: link } = await db
    .from('cr_share_links')
    .select('audit_id,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!link || link.revoked_at || (link.expires_at && new Date(link.expires_at) < new Date()))
    notFound()
  const { data: audit } = await db
    .from('cr_audits')
    .select(
      'id,gate_status,ruleset_version,new_count,persistent_count,resolved_count,requested_page_count,checked_page_count,completed_at,cr_projects(name,production_url)'
    )
    .eq('id', link.audit_id)
    .single()
  if (!audit) notFound()
  const { data: occurrences } = await db
    .from('cr_occurrences')
    .select('id,status,message,cr_findings(title,priority,normalized_path,category)')
    .eq('audit_id', audit.id)
    .limit(50)
  const project = firstRelation(audit.cr_projects)
  const status = reportStatus(audit.gate_status)
  const GateIcon = status.icon
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex items-center justify-between border-border border-b pb-6">
        <CodeRocketLogo
          className="h-10 w-10"
          tagline={CODEROCKET_TAGLINE}
          wordmarkClassName="text-xl"
        />
        <span className="inline-flex items-center gap-2 text-muted text-sm">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Private report
        </span>
      </div>
      <div className="py-12">
        <p className="font-mono text-accent text-xs uppercase tracking-[.18em]">
          Website health report
        </p>
        <h1 className="mt-3 font-editorial text-6xl">{project?.name ?? 'Website health report'}</h1>
        <p className="mt-3 text-muted">
          {project?.production_url} ·{' '}
          {audit.completed_at
            ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
                new Date(audit.completed_at)
              )
            : 'Completed check'}{' '}
        </p>
        <div className={`mt-8 flex items-center gap-3 border p-5 ${status.className}`}>
          <GateIcon aria-hidden className="h-7 w-7" />
          <div>
            <p className="font-bold font-heading text-xl">{status.title}</p>
            <p className="mt-1 text-sm">{status.description}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {[
            ['Pages checked', `${audit.checked_page_count}/${audit.requested_page_count}`],
            ['New', audit.new_count],
            ['Still open', audit.persistent_count],
            ['Fixed', audit.resolved_count]
          ].map(([label, value]) => (
            <div className="border border-border bg-surface p-5" key={label}>
              <p className="text-muted text-sm">{label}</p>
              <p className="mt-2 font-bold font-heading text-3xl">{value}</p>
            </div>
          ))}
        </div>
        <section className="mt-8 border border-border bg-surface">
          <div className="border-border border-b p-5">
            <h2 className="font-heading font-semibold text-xl">What this check found</h2>
            <p className="mt-1 text-muted text-sm">
              A clear summary of what appeared, what is still open, and what was fixed. The report
              owner controls this private link and can revoke it at any time.
            </p>
          </div>
          {(occurrences ?? []).length === 0 ? (
            <p className="p-5 text-muted text-sm">No individual findings were recorded.</p>
          ) : (
            <div className="divide-y divide-border">
              {(occurrences ?? []).flatMap(occurrence =>
                normalizeRelation(occurrence.cr_findings).map(finding => (
                  <article
                    className="grid gap-3 p-5 sm:grid-cols-[120px_1fr]"
                    key={`${occurrence.id}-${finding.normalized_path}-${finding.title}`}
                  >
                    <p className="font-mono text-[10px] text-muted uppercase">
                      {reportFindingStatus(occurrence.status)} · {reportCategory(finding.category)}
                    </p>
                    <div>
                      <h3 className="font-semibold">{finding.title}</h3>
                      <p className="mt-1 text-muted text-sm leading-6">{occurrence.message}</p>
                      <p className="mt-2 font-mono text-muted text-xs">
                        Page {finding.normalized_path} · {reportPriority(finding.priority)}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function reportStatus(value: string | null) {
  if (value === 'passed')
    return {
      title: 'No new problems',
      description: 'Every selected page was checked and nothing new needs attention.',
      className: 'border-success bg-success/10 text-success',
      icon: CheckCircle2
    }
  if (value === 'inconclusive')
    return {
      title: 'Check incomplete',
      description:
        'At least one requested page could not be read. This report is not marked healthy.',
      className: 'border-warning bg-warning/10 text-warning',
      icon: HelpCircle
    }
  if (value === 'needs_baseline')
    return {
      title: 'First check saved',
      description: 'This complete result is the starting point used to spot future changes.',
      className: 'border-accent bg-accent/10 text-accent',
      icon: CheckCircle2
    }
  return {
    title: 'Website needs attention',
    description: 'New important problems require attention.',
    className: 'border-danger bg-danger/10 text-danger',
    icon: AlertTriangle
  }
}

function reportFindingStatus(value: string): string {
  if (value === 'persistent') return 'Still open'
  if (value === 'resolved') return 'Fixed'
  return 'New'
}

function reportCategory(value: string): string {
  if (value === 'search') return 'Search visibility'
  if (value === 'performance') return 'Speed basics'
  if (value === 'security') return 'Security basics'
  if (value === 'quality') return 'Page quality'
  if (value === 'availability') return 'Online'
  return 'Accessibility'
}

function reportPriority(value: string): string {
  if (value === 'critical') return 'Urgent'
  if (value === 'high') return 'Important'
  if (value === 'medium') return 'Recommended'
  return 'Optional'
}
