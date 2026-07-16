import { CalendarClock, Check, CreditCard, Gauge, Globe2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'

export default async function BillingPage() {
  const context = await getAppShellContext()
  const benefits = [
    `${context.limits.projects} monitored ${context.limits.projects === 1 ? 'site' : 'sites'}`,
    `${context.limits.pagesPerProject} pages per site`,
    `${context.limits.schedule} automatic checks`,
    `${context.limits.retentionDays} days of history`,
    `${context.limits.onDemandRunsPerMonth} checks started by you or GitHub each month`
  ]
  return (
    <ProductShell eyebrow="Your subscription" title="Plan & billing">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="border border-border bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-4 border-border border-b p-5 sm:p-6">
            <div>
              <p className="font-mono text-[10px] text-accent uppercase tracking-[.16em]">
                Current plan
              </p>
              <h2 className="mt-2 font-heading font-semibold text-3xl capitalize">
                {context.plan === 'solo' ? 'Personal' : context.plan}
              </h2>
              <p className="mt-2 text-muted">
                Your limits and included features are applied automatically.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 border border-success bg-success/10 px-3 py-1 font-mono text-success text-xs">
              <Check aria-hidden className="h-3.5 w-3.5" /> Active
            </span>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-3">
            <PlanFact
              icon={Globe2}
              label="Sites used"
              value={`${context.projectCount} / ${context.limits.projects}`}
            />
            <PlanFact
              icon={CalendarClock}
              label="Automatic checks"
              value={context.limits.schedule}
            />
            <PlanFact
              icon={Gauge}
              label="History kept"
              value={`${context.limits.retentionDays} days`}
            />
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="font-heading font-semibold text-lg">Included in your plan</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {benefits.map(benefit => (
                <li className="flex items-start gap-2 text-sm" key={benefit}>
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              {context.plan !== 'agency' ? (
                <CodeRocketButton asChild>
                  <Link href="/pricing">Compare and upgrade</Link>
                </CodeRocketButton>
              ) : null}
              {context.hasBillingAccount ? (
                <form action="/api/stripe/portal" method="post">
                  <CodeRocketButton type="submit" variant="outline">
                    <CreditCard aria-hidden /> Open secure billing portal
                  </CodeRocketButton>
                </form>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="border border-border bg-background p-5 sm:p-6">
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            Why upgrade?
          </p>
          <h2 className="mt-3 font-heading font-semibold text-xl">
            Match monitoring to your workload
          </h2>
          <p className="mt-3 text-muted text-sm leading-6">
            Personal is designed for an owner or freelancer monitoring up to three websites every
            day. Agency scales to 50 client sites, a full year of history, and reports without
            secondary branding.
          </p>
          <div className="mt-5 border border-border bg-surface p-4">
            <p className="font-semibold text-sm">Billing stays predictable</p>
            <p className="mt-2 text-muted text-xs leading-5">
              Monthly plans, no trial countdown. Tax details and invoices are handled in Stripe’s
              secure checkout and customer portal.
            </p>
          </div>
        </aside>
      </div>
    </ProductShell>
  )
}

function PlanFact({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Globe2
  label: string
  value: string
}) {
  return (
    <div className="bg-surface p-5">
      <Icon aria-hidden className="h-4 w-4 text-signal" />
      <p className="mt-4 text-muted text-xs">{label}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  )
}
