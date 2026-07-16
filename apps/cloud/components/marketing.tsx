import { loadRules } from '@frontendchecklist/rules'
import { ArrowRight, Check } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { AuditDemo } from '@/components/homepage-audit-demo'
import { DecisionRules, UseCases } from '@/components/homepage-use-cases'

const ruleCount = loadRules().length

export function Hero() {
  return (
    <section className="overflow-hidden border-border border-b px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="mx-auto max-w-7xl text-center">
        <div className="inline-flex items-center gap-3 border border-border px-4 py-2 text-muted text-xs uppercase tracking-[.14em]">
          <span className="cr-pulse h-2 w-2 bg-signal" />
          Website health monitoring
        </div>
        <h1 className="mx-auto mt-11 max-w-6xl text-white">
          <span className="block font-editorial text-[clamp(3.5rem,5.4vw,6.4rem)] leading-[.9] tracking-[-.04em]">
            Know when your website
          </span>
          <span className="mt-3 block font-editorial text-[clamp(3.1rem,4.8vw,5.6rem)] italic leading-[.92]">
            needs attention.
          </span>
        </h1>
        <p className="mx-auto mt-9 max-w-3xl text-lg text-muted leading-8">
          Add the pages that matter. CodeRocket checks whether they are reachable, reviews search,
          accessibility, performance, security, and frontend quality, then tells you what changed in
          plain language.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <CodeRocketButton asChild size="lg">
            <Link href="/onboarding">
              Check my website free <ArrowRight aria-hidden />
            </Link>
          </CodeRocketButton>
          <CodeRocketButton asChild size="lg" variant="outline">
            <Link href="#live-example">See what gets checked</Link>
          </CodeRocketButton>
        </div>
        <p className="mt-5 text-muted text-xs uppercase tracking-[.12em]">
          Free · 1 website · 5 important pages · no credit card
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
          ['PAGES ONLINE', '5 / 5'],
          ['NEW PROBLEMS', '2 IMPORTANT'],
          ['CHECK COVERAGE', '5 / 5'],
          ['HEALTH', 'NEEDS ATTENTION']
        ].map(([label, value], index) => (
          <div className="border-border px-4 sm:border-r sm:last:border-r-0" key={label}>
            <p className="text-muted text-xs uppercase tracking-[.12em]">{label}</p>
            <p
              className={`mt-1 font-mono text-sm ${index === 1 || index === 3 ? 'text-danger' : 'text-foreground'}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-muted text-xs">
        Example: a small online shop · existing issues stay visible, but only new problems trigger
        an alert.
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
              One clear health report,
              <br />
              <em>not five technical dashboards.</em>
            </h2>
            <p className="mt-7 max-w-3xl text-lg text-muted leading-8">
              CodeRocket turns hundreds of maintained frontend rules and simple HTTP checks into a
              short list of actions. You see what is new, what still needs work, what was fixed, and
              which pages could not be checked.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                `${ruleCount} maintained rules from Front-End Checklist`,
                'Availability, search, accessibility, performance, and security',
                'Clear coverage: every page checked or explicitly unavailable',
                'Private, revocable reports for clients and collaborators'
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
        <p className="text-signal text-xs uppercase tracking-[.18em]">Your first check is free</p>
        <h2 className="mt-6 font-editorial text-6xl leading-[.92] sm:text-8xl">
          Stop wondering.
          <br />
          <em>Know what needs attention.</em>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-muted leading-7">
          Add your public HTTPS address, choose up to five important pages, and get a readable
          baseline you can compare over time.
        </p>
        <CodeRocketButton asChild className="mt-9" size="lg">
          <Link href="/onboarding">
            Check my website <ArrowRight aria-hidden />
          </Link>
        </CodeRocketButton>
      </div>
    </section>
  )
}
