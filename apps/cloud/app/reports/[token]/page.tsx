import { createHash } from 'node:crypto'
import { createServiceClient } from '@coderocket/db'
import { CodeRocketLogo } from '@repo/design-system/coderocket-logo'
import { CheckCircle2, ShieldCheck, XCircle } from '@repo/design-system/icons'
import { notFound } from 'next/navigation'

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
      'id,gate_status,ruleset_version,new_count,persistent_count,resolved_count,completed_at,cr_projects(name,production_url)'
    )
    .eq('id', link.audit_id)
    .single()
  if (!audit) notFound()
  const project = audit.cr_projects?.[0]
  const passed = audit.gate_status === 'passed' || audit.gate_status === 'needs_baseline'
  const GateIcon = passed ? CheckCircle2 : XCircle
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex items-center justify-between border-border border-b pb-6">
        <CodeRocketLogo className="h-8 w-8" wordmarkClassName="text-lg" />
        <span className="inline-flex items-center gap-2 text-muted text-sm">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Private report
        </span>
      </div>
      <div className="py-12">
        <p className="font-mono text-accent text-xs uppercase tracking-[.18em]">
          Client delivery report
        </p>
        <h1 className="mt-3 font-editorial text-6xl">{project?.name ?? 'Frontend audit'}</h1>
        <p className="mt-3 text-muted">
          {project?.production_url} ·{' '}
          {audit.completed_at
            ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
                new Date(audit.completed_at)
              )
            : 'Completed audit'}{' '}
          · {audit.ruleset_version}
        </p>
        <div
          className={`mt-8 flex items-center gap-3 border p-5 ${passed ? 'border-success bg-success/10 text-success' : 'border-danger bg-danger/10 text-danger'}`}
        >
          <GateIcon aria-hidden className="h-7 w-7" />
          <div>
            <p className="font-bold font-heading text-xl">
              Quality gate {passed ? 'passed' : 'failed'}
            </p>
            <p className="mt-1 text-sm">
              {passed
                ? 'No new critical or high-priority regressions.'
                : 'New blocking regressions require attention.'}
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['New', audit.new_count],
            ['Persistent', audit.persistent_count],
            ['Resolved', audit.resolved_count]
          ].map(([label, value]) => (
            <div className="border border-border bg-surface p-5" key={label}>
              <p className="text-muted text-sm">{label}</p>
              <p className="mt-2 font-bold font-heading text-3xl">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
