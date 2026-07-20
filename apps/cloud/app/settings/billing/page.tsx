import type { PlanId } from '@coderocket/core'
import {
  AlertTriangle,
  Check,
  CreditCard,
  Gauge,
  Globe2
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { UpgradeLink } from '@/components/plan-limit-upsell'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { type BillingAccountData, billingConnectionState } from '@/lib/billing'
import { getBillingAccountData } from '@/lib/billing-data'
import { formatBillingDate } from '@/lib/billing-format'
import { createPrivateMetadata } from '@/lib/seo'
import { getNextPlan, getPlanLabel } from '@/lib/upgrade'

export const metadata = createPrivateMetadata('Plan & billing')

export default async function BillingPage() {
  const context = await getAppShellContext()
  const account = await getBillingAccountData(context.plan)
  const nextPlan = getNextPlan(context.plan)
  const benefits =
    context.plan === 'free'
      ? [
          'Explore the website-creation demo',
          'Plan a clone from a public website or Figma file',
          'No payment card required'
        ]
      : [
          `${context.builderLimits.sites} created and hosted ${context.builderLimits.sites === 1 ? 'website' : 'websites'}`,
          `${context.builderLimits.creationCreditsPerMonth} creation credits each month`,
          `${context.builderLimits.hostedVisitsPerMonth.toLocaleString('en-GB')} hosted visits each month`,
          `First versions start from up to ${context.builderLimits.pagesPerImport} useful page types`,
          'Safe versions, managed data, payments, and scheduling connections'
        ]

  return (
    <ProductShell eyebrow="Your subscription" title="Plan & billing">
      <div className="space-y-7">
        <section className="border border-border bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-4 border-border border-b p-5 sm:p-6">
            <div>
              <p className="font-mono text-[10px] text-accent uppercase tracking-[.16em]">
                Current plan
              </p>
              <h2 className="mt-2 font-heading font-semibold text-3xl">
                {getPlanLabel(context.plan)}
              </h2>
              <p className="mt-2 text-muted">
                Everything included in your plan is active automatically.
              </p>
            </div>
            <PlanStatus account={account} plan={context.plan} />
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-3">
            <PlanFact
              icon={Globe2}
              label="Websites used"
              value={`${context.builderSiteCount} / ${context.builderLimits.sites}`}
            />
            <PlanFact
              icon={Gauge}
              label="Creation credits"
              value={`${context.builderCreditsRemaining} / ${context.builderLimits.creationCreditsPerMonth}`}
            />
            <PlanFact
              icon={Gauge}
              label="Hosted visits"
              value={context.builderLimits.hostedVisitsPerMonth.toLocaleString('en-GB')}
            />
          </div>
          <div className="p-5 sm:p-6">
            <h3 className="font-heading font-semibold text-lg">Included in your plan</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {benefits.map(benefit => (
                <li className="flex items-start gap-2 text-sm" key={benefit}>
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {benefit}
                </li>
              ))}
            </ul>
            {nextPlan ? (
              <CodeRocketButton asChild className="mt-6">
                <UpgradeLink currentPlan={context.plan} source="billing" targetPlan={nextPlan}>
                  {context.plan === 'free' ? 'Compare paid plans' : 'Upgrade to Studio'}
                </UpgradeLink>
              </CodeRocketButton>
            ) : null}
          </div>
        </section>
        <ManageBilling account={account} plan={context.plan} />
      </div>
    </ProductShell>
  )
}

/** Always expose the correct Stripe or checkout action for the current account state. */
function ManageBilling({ account, plan }: { account: BillingAccountData; plan: PlanId }) {
  const connection = billingConnectionState(plan, account)
  return (
    <section
      aria-labelledby="manage-billing-title"
      className="border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] text-accent uppercase tracking-[.16em]">
            Manage billing
          </p>
          <h2 className="mt-2 font-heading font-semibold text-2xl" id="manage-billing-title">
            Payment method, invoices, and subscription
          </h2>
          {connection === 'connected' ? (
            <p className="mt-2 text-muted text-sm leading-6">
              Open Stripe’s secure portal to update your payment method, download invoices, or
              manage the subscription.
              {account.subscriptionPeriodEndsAt
                ? ` Current period ends ${formatBillingDate(account.subscriptionPeriodEndsAt)}.`
                : ''}
            </p>
          ) : connection === 'free' ? (
            <p className="mt-2 text-muted text-sm leading-6">
              No payment method is required on the Free plan. You can add one securely during a paid
              plan upgrade.
            </p>
          ) : (
            <div className="mt-3 flex gap-3 border border-warning bg-warning/10 p-4 text-warning">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold text-sm">
                  This test subscription is not connected to Stripe.
                </p>
                <p className="mt-1 text-sm leading-6">
                  The billing portal remains unavailable until checkout creates a Stripe customer
                  for this account.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0">
          {connection === 'connected' ? (
            <form action="/api/stripe/portal" method="post">
              <CodeRocketButton size="lg" type="submit">
                <CreditCard aria-hidden /> Open secure billing portal
              </CodeRocketButton>
            </form>
          ) : (
            <CodeRocketButton asChild size="lg" variant="outline">
              <Link href="/pricing">
                <CreditCard aria-hidden />
                {connection === 'free'
                  ? 'See plans and payment options'
                  : 'Connect through checkout'}
              </Link>
            </CodeRocketButton>
          )}
        </div>
      </div>
    </section>
  )
}

/** Summarize free, connected, test, and payment-issue subscription states. */
function PlanStatus({ account, plan }: { account: BillingAccountData; plan: PlanId }) {
  const connection = billingConnectionState(plan, account)
  if (connection === 'test')
    return (
      <span className="inline-flex items-center gap-1.5 border border-warning bg-warning/10 px-3 py-1 font-mono text-warning text-xs">
        <AlertTriangle aria-hidden className="h-3.5 w-3.5" /> Test plan
      </span>
    )
  const paymentIssue = account.subscriptionStatus === 'past_due'
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-xs ${paymentIssue ? 'border-danger bg-danger/10 text-danger' : 'border-success bg-success/10 text-success'}`}
    >
      {paymentIssue ? (
        <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
      ) : (
        <Check aria-hidden className="h-3.5 w-3.5" />
      )}
      {paymentIssue
        ? 'Payment issue'
        : account.cancelAtPeriodEnd
          ? 'Cancels at period end'
          : plan === 'free'
            ? 'Free'
            : 'Active'}
    </span>
  )
}

/** Render one compact fact about the current billing plan. */
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
