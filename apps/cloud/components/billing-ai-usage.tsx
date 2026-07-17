import type { PlanId } from '@coderocket/core'
import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CircleDollarSign,
  Gauge
} from '@repo/design-system/icons'
import { type BillingAccountData, billingConnectionState, summarizeAiUsage } from '@/lib/billing'
import {
  formatAiCredits,
  formatAiSpending,
  formatBillingDate,
  microeurosToEuros
} from '@/lib/billing-format'
import { AiSpendingControls } from './ai-spending-controls'

/** Present included AI usage, metered spending, warnings, and the account budget control. */
export function BillingAiUsage({ account, plan }: { account: BillingAccountData; plan: PlanId }) {
  const usage = summarizeAiUsage(account.usage)
  const connection = billingConnectionState(plan, account)
  const canManage = connection === 'connected'
  const disabledReason =
    connection === 'free'
      ? 'Paid overage becomes available after you upgrade. The Free plan always stops at its included credits.'
      : connection === 'test'
        ? 'This test subscription is not connected to Stripe. Paid overage stays disabled until the account is connected.'
        : undefined

  return (
    <section aria-labelledby="ai-usage-title" className="border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-border border-b p-5 sm:p-6">
        <div>
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            AI usage & spending
          </p>
          <h2 className="mt-2 font-heading font-semibold text-2xl" id="ai-usage-title">
            Know what is included and what can be billed
          </h2>
          <p className="mt-2 max-w-3xl text-muted text-sm leading-6">
            Included credits are used first. Additional usage is always opt-in and stops at the
            monthly euro budget you choose.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 border px-3 py-1 font-mono text-xs ${usage.overageEnabled ? 'border-accent text-accent' : 'border-border text-muted'}`}
        >
          <CircleDollarSign aria-hidden className="h-3.5 w-3.5" />
          Paid overage {usage.overageEnabled ? 'on' : 'off'}
        </span>
      </div>

      <div className="grid gap-px border-border border-b bg-border sm:grid-cols-2 xl:grid-cols-4">
        <UsageFact
          icon={BrainCircuit}
          label="Included credits"
          value={formatAiCredits(usage.includedCredits)}
        />
        <UsageFact
          icon={Gauge}
          label="Credits consumed"
          value={formatAiCredits(usage.consumedCredits)}
        />
        <UsageFact
          icon={BrainCircuit}
          label="Full analyses remaining"
          value={`At least ${usage.estimatedAnalysesRemaining}`}
        />
        <UsageFact
          icon={CalendarClock}
          label="Usage resets"
          value={formatBillingDate(usage.periodEndsAt)}
        />
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {usage.alert ? (
          <div
            className={`flex gap-3 border p-4 ${usage.alert.tone === 'danger' ? 'border-danger bg-danger/10 text-danger' : 'border-warning bg-warning/10 text-warning'}`}
            role="status"
          >
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{usage.alert.title}</p>
              <p className="mt-1 text-sm leading-6">{usage.alert.description}</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <UsageProgress
              detail={`${formatAiCredits(usage.consumedCredits)} consumed · ${formatAiCredits(usage.reservedCredits)} currently reserved`}
              endLabel={usage.overageEnabled ? '100% paid usage' : '100% stop'}
              label="Included credit usage"
              percent={usage.includedUsagePercent}
            />
            {usage.overageEnabled ? (
              <UsageProgress
                detail={`${formatAiSpending(usage.billedOverageMicroeur)} recorded of ${formatAiSpending(usage.overageCapMicroeur)} this month`}
                endLabel="100% stop"
                label="Additional spending"
                percent={usage.overageUsagePercent}
              />
            ) : (
              <div className="border border-border bg-background p-4">
                <p className="font-semibold text-sm">Additional spending is disabled</p>
                <p className="mt-2 text-muted text-sm leading-6">
                  Analyses stop after the included credits are committed. Your maximum additional
                  charge is €0.00.
                </p>
              </div>
            )}
            <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
              <div className="bg-background p-4">
                <p className="text-muted text-xs">Included credits available</p>
                <p className="mt-2 font-heading font-semibold text-xl">
                  {formatAiCredits(usage.remainingIncludedCredits)}
                </p>
              </div>
              <div className="bg-background p-4">
                <p className="text-muted text-xs">Additional usage recorded</p>
                <p className="mt-2 font-heading font-semibold text-xl">
                  {formatAiSpending(usage.billedOverageMicroeur)}
                </p>
                <p className="mt-1 text-muted text-xs">
                  {usage.billedOverageMicroeur > 0
                    ? 'Added to the next Stripe invoice.'
                    : connection === 'connected'
                      ? 'No additional usage has been recorded.'
                      : 'No paid usage is enabled.'}
                </p>
              </div>
            </div>
            <p className="text-muted text-xs leading-5">
              A full guided resolution reserves up to 1,000 credits; shorter completed responses
              often use less. Warnings appear here at 80%, and new paid analyses stop at 100% of
              your budget.
            </p>
          </div>

          <AiSpendingControls
            canManage={canManage}
            currentBudgetEuros={
              usage.overageEnabled ? microeurosToEuros(usage.overageCapMicroeur) : 0
            }
            disabledReason={disabledReason}
          />
        </div>
      </div>
    </section>
  )
}

/** Render one compact AI billing metric. */
function UsageFact({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Gauge
  label: string
  value: string
}) {
  return (
    <div className="bg-surface p-5">
      <Icon aria-hidden className="h-4 w-4 text-signal" />
      <p className="mt-4 text-muted text-xs">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

/** Render a usage bar with visible 80% warning and 100% outcome markers. */
function UsageProgress({
  detail,
  endLabel,
  label,
  percent
}: {
  detail: string
  endLabel: string
  label: string
  percent: number
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">{label}</p>
          <p className="mt-1 text-muted text-xs">{detail}</p>
        </div>
        <span className="font-mono text-muted text-xs">{percent}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="relative mt-3 h-2 bg-surface-raised"
        role="progressbar"
      >
        <span className="block h-full bg-signal" style={{ width: `${percent}%` }} />
        <span
          aria-hidden
          className="absolute top-[-3px] bottom-[-3px] left-[80%] border-warning border-l"
        />
      </div>
      <div className="mt-2 flex justify-end gap-[14%] font-mono text-[10px] text-muted">
        <span>80% warning</span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}
