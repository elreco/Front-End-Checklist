import { PricingCards } from '@/components/pricing-cards'

export const metadata = {
  title: 'Pricing',
  description: 'Simple CodeRocket plans for freelancers and agencies.'
}

export default function PricingPage() {
  return (
    <main className="px-5 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <p className="font-mono text-muted text-xs uppercase tracking-[.2em]">
            — &nbsp; Pricing &nbsp; —
          </p>
          <h1 className="mt-6 font-editorial text-6xl tracking-[-.03em] sm:text-7xl">
            Ship with a clear quality gate.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            No trial, no seats, and no surprise usage billing. Upgrade when your client roster
            grows.
          </p>
        </div>
        <PricingCards />
        <p className="mt-8 text-center font-mono text-muted text-xs">
          Applicable VAT is calculated by Stripe at checkout · paid launch currently gated
        </p>
      </div>
    </main>
  )
}
