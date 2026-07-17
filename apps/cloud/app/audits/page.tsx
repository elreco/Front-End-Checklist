import { ArrowRight } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { EmptyState, GateBadge, ProductShell } from '@/components/product-shell'
import { type AuditHistoryItem, getAuditHistory } from '@/lib/audit-history-data'
import { getEnvironmentLabel, getTriggerLabel } from '@/lib/product-language'
import { createPrivateMetadata } from '@/lib/seo'

export const metadata = createPrivateMetadata('Check history')

export default async function AuditsPage() {
  const runs = await getAuditHistory()
  return (
    <ProductShell eyebrow="Every website check" title="Check history">
      <section className="mb-6 grid gap-px border border-border bg-border sm:grid-cols-3">
        <HistoryFact label="Saved here" value="Every complete check" />
        <HistoryFact label="Creates an alert" value="Only a new important problem" />
        <HistoryFact label="Private by default" value="Everything, until you share it" />
      </section>

      {runs.length === 0 ? (
        <EmptyState title="No checks have finished yet">
          <p>
            Add a site to start its first reference check. Later changes will appear here in order.
          </p>
          <CodeRocketButton asChild className="mt-5" variant="link">
            <Link href="/onboarding">
              Add a site <ArrowRight aria-hidden />
            </Link>
          </CodeRocketButton>
        </EmptyState>
      ) : (
        <section
          aria-labelledby="history-table-title"
          className="overflow-hidden border border-border bg-surface"
        >
          <div className="border-border border-b p-5">
            <h2 className="font-heading font-semibold text-xl" id="history-table-title">
              Latest activity
            </h2>
            <p className="mt-1 text-muted text-sm">
              Up to the 100 most recent checks across your sites.
            </p>
          </div>
          <div className="divide-y divide-border md:hidden">
            {runs.map(run => (
              <HistoryCard key={run.id} run={run} />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-border border-b bg-background text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Site</th>
                  <th className="px-5 py-3 font-semibold">Website version</th>
                  <th className="px-5 py-3 font-semibold">How it started</th>
                  <th className="px-5 py-3 font-semibold">Result</th>
                  <th className="px-5 py-3 font-semibold">New problems</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map(run => (
                  <tr className="hover:bg-surface-raised" key={run.id}>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold hover:text-signal"
                        href={`/projects/${run.projectId}`}
                      >
                        {run.projectName}
                      </Link>
                    </td>
                    <td className="px-5 py-4">{getEnvironmentLabel(run.environment)}</td>
                    <td className="px-5 py-4 text-muted">{getTriggerLabel(run.trigger)}</td>
                    <td className="px-5 py-4">
                      {run.status === 'failed' ? (
                        <span className="font-mono text-danger text-xs">Could not finish</span>
                      ) : (
                        <GateBadge status={run.gate} />
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold">{run.blockingCount}</td>
                    <td className="px-5 py-4 text-muted text-xs">{run.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </ProductShell>
  )
}

function HistoryCard({ run }: { run: AuditHistoryItem }) {
  return (
    <article className="relative p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">
            <Link
              className="after:absolute after:inset-0 after:content-['']"
              href={`/projects/${run.projectId}`}
            >
              {run.projectName}
            </Link>
          </h3>
          <p className="mt-1 text-muted text-xs">
            {getEnvironmentLabel(run.environment)} · {getTriggerLabel(run.trigger)}
          </p>
        </div>
        {run.status === 'failed' ? (
          <span className="font-mono text-danger text-xs">Could not finish</span>
        ) : (
          <GateBadge status={run.gate} />
        )}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-border border-t pt-3 text-xs">
        <span className="text-muted">{run.date}</span>
        <span className={run.blockingCount > 0 ? 'text-danger' : 'text-muted'}>
          {run.blockingCount} new {run.blockingCount === 1 ? 'problem' : 'problems'}
        </span>
      </div>
    </article>
  )
}

function HistoryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-5">
      <p className="font-mono text-[10px] text-muted uppercase tracking-[.12em]">{label}</p>
      <p className="mt-2 font-semibold text-sm">{value}</p>
    </div>
  )
}
