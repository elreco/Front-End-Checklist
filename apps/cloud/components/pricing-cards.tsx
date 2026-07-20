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
  outcome: string
}> = [
  {
    id: 'free',
    name: 'Free',
    outcome: 'Explore how your new website could work',
    description: 'Explore the product before asking CodeRocket to create or host anything.',
    features: [
      'Explore the complete website-creation demo',
      'Start from a public website or Figma design',
      'Review the guided cloning journey',
      'No payment card required'
    ]
  },
  {
    id: 'solo',
    name: 'Launch',
    outcome: 'Create and publish one professional website',
    description: 'For a business, project, shop, portfolio, or SaaS that needs one main website.',
    features: [
      'Clone, edit, host, and publish 1 website',
      'Start from up to 5 useful page types, then add more by asking',
      'First month includes the first version plus at least 13 guided changes',
      'Change text, links, and colours yourself without using credits',
      '20,000 hosted visits each month',
      'Safe versions, managed data, payments, and scheduling connections'
    ]
  },
  {
    id: 'agency',
    name: 'Studio',
    outcome: 'Manage several websites from one workspace',
    description: 'For studios, agencies, and teams maintaining a small portfolio of projects.',
    features: [
      'Clone, edit, host, and publish up to 10 websites',
      '600 creation credits shared across every project each month',
      'Use the allowance for first versions, changes, pages, products, and data',
      '250,000 hosted visits each month across the workspace',
      'Safe versions, managed data, payments, and scheduling connections',
      'Keep client projects together in one workspace'
    ]
  }
]

interface PricingCardsProps extends PricingUpgradeContext {
  currency: PricingCurrency
  websiteDraft?: string
}

/** Render the available CodeRocket plans and their purchase actions. */
export function PricingCards({
  currency,
  currentPlan,
  recommendedPlan,
  source,
  websiteDraft
}: PricingCardsProps) {
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
        const pricing = LOCALIZED_PRICING[currency]
        const isCurrent = plan.id === currentPlan
        const isFeatured = recommendedPlan ? plan.id === recommendedPlan : plan.id === 'solo'
        const price =
          plan.id === 'free'
            ? formatLocalizedPrice(0, currency)
            : formatLocalizedPrice(plan.id === 'solo' ? pricing.launch : pricing.studio, currency)
        const features = plan.features
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
            <p className="mt-3 font-heading font-semibold text-lg">{plan.outcome}</p>
            <p className="mt-2 text-muted text-sm leading-6">{plan.description}</p>
            <p className="mt-8 font-bold font-heading text-4xl">
              {price}
              <span className="font-normal font-sans text-muted text-sm"> / month</span>
            </p>
            {plan.id === 'free' ? null : (
              <p className="mt-2 text-muted text-xs">
                Billed monthly in {currency} · cancel anytime in your billing portal
              </p>
            )}
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
                <Link href="/create">Explore website creation</Link>
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
                <input name="currency" type="hidden" value={currency} />
                {source ? <input name="source" type="hidden" value={source} /> : null}
                {websiteDraft ? <input name="website" type="hidden" value={websiteDraft} /> : null}
                <CodeRocketButton fullWidth type="submit">
                  {plan.id === 'solo' ? 'Create one website' : 'Choose Studio'}
                </CodeRocketButton>
              </form>
            )}
          </article>
        )
      })}
    </div>
  )
}
