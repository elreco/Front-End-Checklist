import { Check } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    description: 'A reliable baseline for one site.',
    features: [
      '1 project · 5 pages',
      'Weekly production audit',
      '10 manual or CI runs / month',
      '30-day history'
    ]
  },
  {
    id: 'solo',
    name: 'Solo',
    price: '€19',
    description: 'For freelancers shipping every week.',
    features: [
      '5 projects · 10 pages each',
      'Daily production audits',
      '100 manual or CI runs / month',
      '90-day history'
    ]
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '€59',
    description: 'For teams delivering client work.',
    features: [
      '25 projects · 25 pages each',
      'Daily production audits',
      '500 manual or CI runs / month',
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
