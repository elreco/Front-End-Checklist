import { ArrowRight, Check } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { AuditDemo } from '@/components/homepage-audit-demo'
import { DecisionRules, UseCases } from '@/components/homepage-use-cases'

export function Hero() {
  return (
    <section className="overflow-hidden border-border border-b px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="mx-auto max-w-7xl text-center">
        <div className="inline-flex items-center gap-3 border border-border px-4 py-2 text-muted text-xs uppercase tracking-[.14em]">
          <span className="cr-pulse h-2 w-2 bg-signal" />
          Continuous frontend quality
        </div>
        <h1 className="mx-auto mt-11 max-w-6xl text-white">
          <span className="block font-editorial text-[clamp(3.5rem,5.4vw,6.4rem)] leading-[.9] tracking-[-.04em]">
            Catch frontend regressions
          </span>
          <span className="mt-3 block font-editorial text-[clamp(3.1rem,4.8vw,5.6rem)] italic leading-[.92]">
            before your client does.
          </span>
        </h1>
        <p className="mx-auto mt-9 max-w-3xl text-lg text-muted leading-8">
          CodeRocket monitors your production pages, audits every GitHub preview, and compares only
          what changed. New critical or high-priority issues fail the quality gate; existing issues
          stay visible without blocking every release.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <CodeRocketButton asChild size="lg">
            <Link href="/onboarding">
              Monitor your first site <ArrowRight aria-hidden />
            </Link>
          </CodeRocketButton>
          <CodeRocketButton asChild size="lg" variant="outline">
            <Link href="#live-example">See a real example</Link>
          </CodeRocketButton>
        </div>
        <p className="mt-5 text-muted text-xs uppercase tracking-[.12em]">
          Free · 1 project · 5 pages · no credit card
        </p>
        <HeroSummary />
      </div>
    </section>
  )
}

function HeroSummary() {
  return (
    <div className="mx-auto mt-16 max-w-5xl border-border border-y py-5">
      <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
        {[
          ['BASELINE', 'PRODUCTION'],
          ['PREVIEW', 'PR #184'],
          ['REGRESSIONS', '2 NEW'],
          ['GATE', 'FAILED · EXIT 1']
        ].map(([label, value], index) => (
          <div className="border-border px-4 sm:border-r sm:last:border-r-0" key={label}>
            <p className="text-muted text-xs uppercase tracking-[.12em]">{label}</p>
            <p
              className={`mt-1 font-mono text-sm ${index > 1 ? 'text-danger' : 'text-foreground'}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-muted text-xs">
        Example: checkout redesign · 11 persistent issues remain visible but do not block again.
      </p>
    </div>
  )
}

export function Benefits() {
  return (
    <>
      <section className="border-border border-b px-5 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <p className="text-signal text-xs uppercase tracking-[.18em]">What CodeRocket does</p>
          <div>
            <h2 className="font-editorial text-5xl leading-[.98] tracking-[-.03em] sm:text-7xl">
              A release decision,
              <br />
              <em>not another vanity score.</em>
            </h2>
            <p className="mt-7 max-w-3xl text-lg text-muted leading-8">
              Most audits hand you a long checklist. CodeRocket remembers your production baseline,
              classifies every finding as new, persistent, or resolved, and tells your CI whether
              this specific change is safe to ship.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                '385 frontend rules from the open-source checklist',
                'Production and preview environments kept separate',
                'Versioned rulesets to prevent false regressions',
                'Private, revocable reports for client delivery'
              ].map(item => (
                <li className="flex gap-3 text-sm" key={item}>
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <AuditDemo />
      <UseCases />
      <DecisionRules />
      <FinalCallToAction />
    </>
  )
}

function FinalCallToAction() {
  return (
    <section className="border-border border-t px-5 py-24 text-center sm:py-32">
      <div className="mx-auto max-w-4xl">
        <p className="text-signal text-xs uppercase tracking-[.18em]">Ready for a clear gate?</p>
        <h2 className="mt-6 font-editorial text-6xl leading-[.92] sm:text-8xl">
          Know what changed.
          <br />
          <em>Ship with evidence.</em>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-muted leading-7">
          Add your production URL, choose the pages that matter, and create your first baseline.
        </p>
        <CodeRocketButton asChild className="mt-9" size="lg">
          <Link href="/onboarding">
            Start monitoring for free <ArrowRight aria-hidden />
          </Link>
        </CodeRocketButton>
      </div>
    </section>
  )
}
