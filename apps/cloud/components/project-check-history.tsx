import Link from 'next/link'
import { getEnvironmentLabel, getTriggerLabel } from '@/lib/product-language'
import type { ProjectAudit } from '@/lib/project-data'
import { GateBadge } from './product-shell'

/** Render the latest immutable checks for one monitored website. */
export function ProjectCheckHistory({ audits }: { audits: ProjectAudit[] }) {
  return (
    <section aria-labelledby="history-title" className="mt-7 border border-border bg-surface">
      <div className="flex items-center justify-between border-border border-b p-5">
        <div>
          <h2 className="font-heading font-semibold text-xl" id="history-title">
            Recent checks
          </h2>
          <p className="mt-1 text-muted text-xs">The latest activity for this site.</p>
        </div>
        <Link className="font-mono text-accent text-xs hover:text-signal" href="/audits">
          All history
        </Link>
      </div>
      {audits.length === 0 ? (
        <p className="p-5 text-muted text-sm">No completed checks yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {audits.slice(0, 5).map(audit => (
            <li className="flex flex-wrap items-center justify-between gap-4 p-5" key={audit.id}>
              <div>
                <p className="font-semibold text-sm">
                  {getEnvironmentLabel(audit.environment)} · {getTriggerLabel(audit.trigger)}
                </p>
                <p className="mt-1 text-muted text-xs">{audit.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted text-xs">
                  {audit.blockingCount} new {audit.blockingCount === 1 ? 'problem' : 'problems'}
                </span>
                <GateBadge status={audit.gate} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
