import { AlertTriangle, Check, Globe2, Radar } from '@repo/design-system/icons'

const steps = [
  {
    label: 'Reach the page',
    detail: 'HTTPS, redirects, response status, and Cloudflare challenge'
  },
  {
    label: 'Read the public HTML',
    detail: 'One safe fetch · 2 MB limit · no browser or tracking script'
  },
  {
    label: 'Run health checks',
    detail: 'Search · accessibility · performance · security · quality'
  },
  {
    label: 'Explain what changed',
    detail: '2 new · 11 already known · 7 resolved · 5/5 pages checked'
  }
]

const findings = [
  {
    tone: 'text-danger',
    status: 'NEW · IMPORTANT',
    title: 'Checkout button has no accessible name',
    rule: 'Accessibility · /checkout'
  },
  {
    tone: 'text-danger',
    status: 'NEW · IMPORTANT',
    title: 'Secure transport header is missing',
    rule: 'Security · /checkout'
  },
  {
    tone: 'text-muted',
    status: 'ALREADY KNOWN',
    title: 'Product image dimensions are not explicit',
    rule: 'Performance · /products'
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
              A real check, from address to action list.
            </h2>
          </div>
          <p className="max-w-xl text-lg text-muted leading-8 lg:justify-self-end">
            CodeRocket checks only public HTTPS pages. It validates every redirect, records how many
            pages were actually readable, and never labels an incomplete check as healthy. Existing
            problems remain visible without creating the same alert every day.
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
                <Globe2 aria-hidden className="h-4 w-4" /> ACME STORE · DAILY CHECK
              </span>
              <span className="flex items-center gap-2 text-signal">
                <span className="cr-pulse h-1.5 w-1.5 bg-signal" /> auditing
              </span>
            </div>
            <div className="relative p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3 border border-border bg-surface px-4 py-3 text-muted text-sm">
                <Radar aria-hidden className="h-4 w-4 text-signal" />
                https://shop.acme.test/checkout
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
                  <p className="font-semibold text-danger">Website needs attention</p>
                  <p className="mt-1 text-muted text-xs">
                    2 new important problems · 5/5 pages checked
                  </p>
                </div>
                <span className="border border-danger px-3 py-1 text-danger text-xs">
                  OPEN REPORT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
