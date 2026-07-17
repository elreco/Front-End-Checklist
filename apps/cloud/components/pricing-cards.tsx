import { Check } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    description: 'Know when your main website needs attention.',
    features: [
      '1 website · 5 important pages',
      'Weekly automatic health check',
      '10 extra checks started by you or GitHub / month',
      'At least 3 evidence-grounded AI fix plans / month',
      '30-day history and private reports'
    ]
  },
  {
    id: 'solo',
    name: 'Personal',
    price: '€12',
    description: 'For independent owners and freelancers.',
    features: [
      '3 websites · 25 pages each',
      'Daily automatic health checks',
      '100 extra checks started by you or GitHub / month',
      'At least 100 AI fix plans with owner, client, or developer wording',
      '90-day history and email alerts'
    ]
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '€99',
    description: 'For agencies maintaining client portfolios.',
    features: [
      '50 websites · 50 pages each',
      'Daily automatic health checks',
      '500 extra checks started by you or GitHub / month',
      'At least 600 AI fix plans across client sites',
      '365-day history',
      'Reports without secondary branding'
    ]
  }
]

export function PricingCards() {
  return (
    <div className="grid border-border border-t border-l lg:grid-cols-3">
      {plans.map(plan => (
        <article
          className={`relative flex flex-col border-border border-r border-b bg-background p-7 sm:p-9 ${plan.id === 'solo' ? 'after:absolute after:inset-x-0 after:top-0 after:h-1 after:bg-accent' : ''}`}
          key={plan.id}
        >
          <p
            className={`mb-5 font-mono text-xs uppercase tracking-[.18em] ${plan.id === 'solo' ? 'text-accent' : 'text-muted'}`}
          >
            {plan.id === 'solo' ? 'Most popular' : 'Monthly plan'}
          </p>
          <h2 className="font-editorial text-4xl">{plan.name}</h2>
          <p className="mt-2 text-muted">{plan.description}</p>
          <p className="mt-8 font-bold font-heading text-4xl">
            {plan.price}
            <span className="font-normal font-sans text-muted text-sm"> / month</span>
          </p>
          <ul className="my-9 flex-1 space-y-3">
            {plan.features.map(feature => (
              <li className="flex gap-3 text-sm" key={feature}>
                <Check aria-hidden className="h-5 w-5 shrink-0 text-signal" />
                {feature}
              </li>
            ))}
          </ul>
          {plan.id === 'free' ? (
            <CodeRocketButton asChild fullWidth variant="outline">
              <Link href="/onboarding">Start free</Link>
            </CodeRocketButton>
          ) : (
            <form action="/api/stripe/checkout" method="post">
              <input name="plan" type="hidden" value={plan.id} />
              <CodeRocketButton fullWidth type="submit">
                Choose {plan.name}
              </CodeRocketButton>
            </form>
          )}
        </article>
      ))}
    </div>
  )
}
