import type { PlanId } from '@coderocket/core'
import { ArrowUpRight } from '@repo/design-system/icons'
import { getNextPlan, getPlanLabel } from '@/lib/upgrade'
import { UpgradeLink } from './plan-limit-upsell'

/** Summarize creation credits and expose one contextual next-plan action. */
export function AppPlanPrompt({
  creditLimit,
  creditsRemaining,
  plan,
  siteCount,
  siteLimit
}: {
  creditLimit: number
  creditsRemaining: number
  plan: PlanId
  siteCount: number
  siteLimit: number
}) {
  const nextPlan = getNextPlan(plan)
  const builderIncluded = siteLimit > 0
  return (
    <div className="mt-4 border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[.14em]">
          {getPlanLabel(plan)} plan
        </p>
        <span className="text-muted text-xs">
          {builderIncluded ? `${creditsRemaining}/${creditLimit} credits` : 'Builder locked'}
        </span>
      </div>
      <div
        aria-label="Creation credits remaining"
        aria-valuemax={Math.max(creditLimit, 1)}
        aria-valuemin={0}
        aria-valuenow={creditsRemaining}
        className="mt-2.5 h-1 bg-surface-raised"
        role="progressbar"
      >
        <span
          className="block h-full bg-accent"
          style={{
            width: builderIncluded
              ? `${Math.min(100, (creditsRemaining / Math.max(creditLimit, 1)) * 100)}%`
              : '0%'
          }}
        />
      </div>
      <p className="mt-2.5 text-muted text-xs leading-5">
        {plan === 'agency'
          ? `${siteCount}/${siteLimit} websites · credits are shared across the workspace.`
          : builderIncluded
            ? 'A first useful version costs 20 credits. Manual edits stay free.'
            : 'Unlock your first hosted website with Launch.'}
      </p>
      {nextPlan ? (
        <UpgradeLink
          className="mt-2.5 inline-flex items-center gap-1 font-mono text-accent text-xs hover:text-signal"
          currentPlan={plan}
          source="sidebar_plan"
          targetPlan={nextPlan}
        >
          {plan === 'free' ? 'Unlock website creation' : 'Grow to Studio'}{' '}
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </UpgradeLink>
      ) : null}
    </div>
  )
}
