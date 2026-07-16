import { AlertTriangle, Check, GitPullRequest, Radar } from '@repo/design-system/icons'

const steps = [
  {
    label: 'Production baseline',
    detail: '12 pages · ruleset 2026.07 · last successful run'
  },
  {
    label: 'Preview audit',
    detail: 'PR #184 · commit 8e41ac · /checkout changed'
  },
  {
    label: 'Regression diff',
    detail: '2 new · 11 persistent · 7 resolved'
  },
  {
    label: 'GitHub quality gate',
    detail: 'Failed · 2 new high-priority findings'
  }
]

const findings = [
  {
    tone: 'text-danger',
    status: 'NEW · HIGH',
    title: 'Checkout button has no accessible name',
    rule: '/checkout · button-name'
  },
  {
    tone: 'text-danger',
    status: 'NEW · HIGH',
    title: 'Email field is missing a visible label',
    rule: '/checkout · form-labels'
  },
  {
    tone: 'text-muted',
    status: 'PERSISTENT · MEDIUM',
    title: 'Product image dimensions are not explicit',
    rule: '/products · image-dimensions'
  }
]

export function AuditDemo() {
  return (
    <section className="border-border border-b px-5 py-20 sm:py-28" id="live-example">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="text-signal text-xs uppercase tracking-[.18em]">Concrete example</p>
            <h2 className="mt-5 max-w-2xl font-editorial text-5xl leading-[.98] sm:text-7xl">
              A checkout preview introduces two regressions.
            </h2>
          </div>
          <p className="max-w-xl text-lg text-muted leading-8 lg:justify-self-end">
            CodeRocket fetches the preview HTML once, runs the same ruleset as production, and
            compares stable fingerprints by page path and rule. Existing debt remains visible but
            does not become a “new” failure.
          </p>
        </div>
        <div className="mt-14 grid border border-border lg:grid-cols-[.72fr_1.28fr]">
          <ol className="divide-y divide-border bg-surface">
            {steps.map((step, index) => (
              <li className="flex gap-4 p-6" key={step.label}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-border text-xs">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{step.label}</p>
                  <p className="mt-1 text-muted text-sm leading-6">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="relative overflow-hidden border-border border-t bg-background lg:border-t-0 lg:border-l">
            <div className="cr-scan-line pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-signal shadow-[0_0_18px_2px_#22d3ee]" />
            <div className="flex items-center justify-between border-border border-b px-5 py-4 text-xs uppercase tracking-[.12em]">
              <span className="flex items-center gap-2 text-muted">
                <GitPullRequest aria-hidden className="h-4 w-4" /> PR #184 · checkout redesign
              </span>
              <span className="flex items-center gap-2 text-signal">
                <span className="cr-pulse h-1.5 w-1.5 bg-signal" /> auditing
              </span>
            </div>
            <div className="relative p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3 border border-border bg-surface px-4 py-3 text-muted text-sm">
                <Radar aria-hidden className="h-4 w-4 text-signal" />
                https://preview-184.acme.dev/checkout
              </div>
              <div className="space-y-3">
                {findings.map((finding, index) => (
                  <article
                    className={`cr-reveal border border-border bg-surface p-4 ${index === 1 ? 'cr-reveal-delay-1' : index === 2 ? 'cr-reveal-delay-2' : ''}`}
                    key={finding.rule}
                  >
                    <div className="flex items-start gap-3">
                      {index < 2 ? (
                        <AlertTriangle
                          aria-hidden
                          className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                        />
                      ) : (
                        <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-xs ${finding.tone}`}>{finding.status}</p>
                        <h3 className="mt-1 font-semibold">{finding.title}</h3>
                        <p className="mt-1 text-muted text-xs">{finding.rule}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-danger border-l-2 bg-danger/10 p-4">
                <div>
                  <p className="font-semibold text-danger">Quality gate failed</p>
                  <p className="mt-1 text-muted text-xs">2 new blocking regressions</p>
                </div>
                <span className="border border-danger px-3 py-1 text-danger text-xs">
                  CI EXIT 1
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
