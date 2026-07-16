import { ArrowRight } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { EmptyState, GateBadge, ProductShell } from '@/components/product-shell'
import { getAuditHistory } from '@/lib/audit-history-data'

export const metadata = { title: 'Check history' }

export default async function AuditsPage() {
  const runs = await getAuditHistory()
  return (
    <ProductShell eyebrow="Every website check" title="Check history">
      <section className="mb-6 grid gap-px bg-border sm:grid-cols-3">
        <HistoryFact label="What is recorded" value="Every completed check" />
        <HistoryFact label="What triggers an alert" value="Only new, important problems" />
        <HistoryFact label="What stays private" value="All results, until you share" />
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-border border-b bg-background text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Site</th>
                  <th className="px-5 py-3 font-semibold">Checked version</th>
                  <th className="px-5 py-3 font-semibold">Started by</th>
                  <th className="px-5 py-3 font-semibold">Result</th>
                  <th className="px-5 py-3 font-semibold">New important</th>
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
                    <td className="px-5 py-4">
                      {run.environment === 'preview' ? 'Test version' : 'Live website'}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {run.trigger === 'scheduled'
                        ? 'Automatic schedule'
                        : run.trigger === 'manual'
                          ? 'You'
                          : 'GitHub'}
                    </td>
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

function HistoryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-5">
      <p className="font-mono text-[10px] text-muted uppercase tracking-[.12em]">{label}</p>
      <p className="mt-2 font-semibold text-sm">{value}</p>
    </div>
  )
}
