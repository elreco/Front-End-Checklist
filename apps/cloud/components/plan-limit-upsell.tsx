'use client'

import { ArrowUpRight, Check, Sparkles } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { type ReactNode, useEffect, useRef } from 'react'
import { trackProductEvent } from '@/lib/analytics-browser'
import { buildPricingHref, type PlanId, type UpgradeSource } from '@/lib/upgrade'

interface UpgradeLinkProps {
  children: ReactNode
  className?: string
  currentPlan: PlanId
  preserveContext?: boolean
  source: UpgradeSource
  targetPlan: Exclude<PlanId, 'free'>
}

interface PlanLimitUpsellProps extends Omit<UpgradeLinkProps, 'children'> {
  actionLabel: string
  compact?: boolean
  description: string
  title: string
}

/** Link to a contextual, attributable pricing comparison. */
export function UpgradeLink({
  children,
  className,
  currentPlan,
  preserveContext = false,
  source,
  targetPlan
}: UpgradeLinkProps) {
  const href = buildPricingHref({
    currentPlan,
    recommendedPlan: targetPlan,
    source
  })
  return (
    <Link
      className={className}
      href={href}
      rel={preserveContext ? 'noreferrer' : undefined}
      target={preserveContext ? '_blank' : undefined}
      onClick={() =>
        trackProductEvent('upgrade_clicked', {
          current_plan: currentPlan,
          source,
          target_plan: targetPlan
        })
      }
    >
      {children}
    </Link>
  )
}

/** Present one value-led upgrade at the exact point where a plan limit is reached. */
export function PlanLimitUpsell({
  actionLabel,
  compact = false,
  currentPlan,
  description,
  preserveContext,
  source,
  targetPlan,
  title
}: PlanLimitUpsellProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackProductEvent('upgrade_prompt_viewed', {
      current_plan: currentPlan,
      source,
      target_plan: targetPlan
    })
  }, [currentPlan, source, targetPlan])

  return (
    <div className={`border border-accent bg-accent/10 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-accent bg-background text-accent">
          <Sparkles aria-hidden className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold text-base">{title}</p>
          <p className="mt-1 text-muted text-xs leading-5">{description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CodeRocketButton asChild size="sm">
              <UpgradeLink
                currentPlan={currentPlan}
                preserveContext={preserveContext}
                source={source}
                targetPlan={targetPlan}
              >
                {actionLabel} <ArrowUpRight aria-hidden />
              </UpgradeLink>
            </CodeRocketButton>
            <span className="flex items-center gap-1.5 text-muted text-xs">
              <Check aria-hidden className="h-3.5 w-3.5 text-success" />
              {preserveContext
                ? 'Plans open in a new tab; this selection stays here'
                : 'Your current selection stays here'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
