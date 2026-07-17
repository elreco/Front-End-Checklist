'use client'

import type { PlanId } from '@coderocket/core'
import { Check } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackProductEvent } from '@/lib/analytics-browser'
import { formatLocalizedPrice, LOCALIZED_PRICING, type PricingCurrency } from '@/lib/pricing'
import type { PricingUpgradeContext } from '@/lib/upgrade'

const plans: Array<{
  description: string
  features: string[]
  id: PlanId
  name: string
}> = [
  {
    id: 'free',
    name: 'Free',
    description: 'Know when your main website needs attention.',
    features: [
      '1 website · 5 important pages',
      'Weekly automatic health check',
      '10 extra checks started by you or CI / month',
      'At least 3 guided resolutions / month · sharing and handoff included',
      '30-day history and private reports'
    ]
  },
  {
    id: 'solo',
    name: 'Personal',
    description: 'For independent owners and freelancers.',
    features: [
      '3 websites · 25 pages each',
      'Daily automatic health checks',
      '100 extra checks started by you or CI / month',
      'At least 100 guided resolutions · client and developer handoff included',
      '90-day history and email alerts'
    ]
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies maintaining client portfolios.',
    features: [
      '50 websites · 50 pages each',
      'Daily automatic health checks',
      '500 extra checks started by you or CI / month',
      'At least 600 guided resolutions · sharing and handoff included',
      '365-day history',
      'Reports without secondary branding'
    ]
  }
]

interface PricingCardsProps extends PricingUpgradeContext {
  currency: PricingCurrency
}

/** Render the available CodeRocket plans and their purchase actions. */
export function PricingCards({
  currency,
  currentPlan,
  recommendedPlan,
  source
}: PricingCardsProps) {
  const localizedPricing = LOCALIZED_PRICING[currency]
  const trackedView = useRef(false)

  useEffect(() => {
    if (!source || trackedView.current) return
    trackedView.current = true
    trackProductEvent('pricing_viewed', {
      current_plan: currentPlan ?? 'unknown',
      recommended_plan: recommendedPlan ?? 'unknown',
      source
    })
  }, [currentPlan, recommendedPlan, source])

  return (
    <div className="grid border-border border-t border-l lg:grid-cols-3">
      {plans.map(plan => {
        const isCurrent = plan.id === currentPlan
        const isFeatured = recommendedPlan ? plan.id === recommendedPlan : plan.id === 'solo'
        const price =
          plan.id === 'free'
            ? formatLocalizedPrice(0, currency)
            : formatLocalizedPrice(
                plan.id === 'solo' ? localizedPricing.personal : localizedPricing.agency,
                currency
              )
        const features =
          plan.id === 'free'
            ? plan.features
            : [
                ...plan.features.slice(0, 4),
                `Token-based AI overage after included credits · ${formatLocalizedPrice(
                  plan.id === 'solo'
                    ? localizedPricing.personalAiCap
                    : localizedPricing.agencyAiCap,
                  currency
                )} monthly cap`,
                ...plan.features.slice(4)
              ]
        return (
          <article
            className={`relative flex flex-col border-border border-r border-b bg-background p-7 sm:p-9 ${isFeatured ? 'after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-accent' : ''}`}
            key={plan.id}
          >
            <p
              className={`mb-5 font-mono text-xs uppercase tracking-[.18em] ${isCurrent || isFeatured ? 'text-accent' : 'text-muted'}`}
            >
              {isCurrent
                ? 'Your current plan'
                : isFeatured && recommendedPlan
                  ? 'Recommended for your needs'
                  : plan.id === 'solo'
                    ? 'Most popular'
                    : 'Monthly plan'}
            </p>
            <h2 className="font-editorial text-4xl">{plan.name}</h2>
            <p className="mt-2 text-muted">{plan.description}</p>
            <p className="mt-8 font-bold font-heading text-4xl">
              {price}
              <span className="font-normal font-sans text-muted text-sm"> / month</span>
            </p>
            <ul className="my-9 flex-1 space-y-3">
              {features.map(feature => (
                <li className="flex gap-3 text-sm" key={feature}>
                  <Check aria-hidden className="h-5 w-5 shrink-0 text-signal" />
                  {feature}
                </li>
              ))}
            </ul>
            {isCurrent ? (
              <CodeRocketButton disabled fullWidth variant="outline">
                Current plan
              </CodeRocketButton>
            ) : plan.id === 'free' ? (
              <CodeRocketButton asChild fullWidth variant="outline">
                <Link href="/onboarding">Start free</Link>
              </CodeRocketButton>
            ) : (
              <form
                action="/api/stripe/checkout"
                method="post"
                onSubmit={() =>
                  trackProductEvent('checkout_started', {
                    current_plan: currentPlan ?? 'unknown',
                    source: source ?? 'pricing',
                    target_plan: plan.id
                  })
                }
              >
                <input name="plan" type="hidden" value={plan.id} />
                {source ? <input name="source" type="hidden" value={source} /> : null}
                <CodeRocketButton fullWidth type="submit">
                  Choose {plan.name}
                </CodeRocketButton>
              </form>
            )}
          </article>
        )
      })}
    </div>
  )
}
