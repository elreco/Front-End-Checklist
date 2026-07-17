import { loadRules } from '@frontendchecklist/rules'
import { ArrowRight } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { FaqAccordion } from '@/components/faq-accordion'
import { AuditDemo } from '@/components/homepage-audit-demo'
import { HomepageLevels } from '@/components/homepage-levels'
import { DecisionRules, UseCases } from '@/components/homepage-use-cases'

const ruleCount = loadRules().length
const faqItems = [
  {
    question: 'What does CodeRocket monitor?',
    answer:
      'CodeRocket checks whether selected pages are reachable and reviews practical website basics across search visibility, accessibility, speed, security, and frontend quality. It then compares each complete check with the previous result.'
  },
  {
    question: 'How is this different from a one-time website checker?',
    answer:
      'A one-time checker gives you a snapshot. CodeRocket keeps a trusted baseline, shows which problems are new, still open, or fixed, and alerts you only when an important change appears.'
  },
  {
    question: 'Can CodeRocket check pages behind Cloudflare or a login?',
    answer:
      'Pages that open without sign-in use the cloud checker, whether or not they use Cloudflare. Restricted or preview pages run from GitHub, GitLab, Bitbucket, or another CI environment that already has access. Pages CodeRocket cannot confirm are marked incomplete, never healthy.'
  },
  {
    question: 'Does CodeRocket change my website?',
    answer:
      'No. Checks are read-only. The AI assistant can explain saved evidence and suggest a fix, but it cannot edit a website or mark an issue fixed. A later deterministic check verifies the result.'
  },
  {
    question: 'Who is CodeRocket for?',
    answer:
      'It is designed for website owners who want plain explanations, freelancers responsible for client sites, and agencies that need repeatable checks and shareable reports across a portfolio.'
  }
]

/** Render the homepage value proposition and primary actions. */
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
          Add the pages that matter. Open pages are checked automatically; restricted pages can run
          from a CI environment you control. CodeRocket tells you in plain language what changed and
          what it could not verify.
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

/** Summarize the example monitoring result displayed below the hero. */
function HeroSummary() {
  return (
    <div className="mx-auto mt-16 max-w-5xl border-border border-y py-5">
      <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4">
        {[
          ['PAGES ONLINE', '5 / 5'],
          ['NEW PROBLEMS', '2 IMPORTANT'],
          ['PAGES CHECKED', '5 / 5'],
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

/** Present CodeRocket's core product benefits and supporting homepage sections. */
export function Benefits() {
  const benefits = [
    {
      title: `${ruleCount} maintained rules`,
      description:
        'One documented source covers the frontend basics instead of sending you across separate tools.'
    },
    {
      title: 'One cross-functional health view',
      description:
        'Reachability, search visibility, accessibility, speed, security, and page quality live in the same result.'
    },
    {
      title: 'Coverage you can trust',
      description:
        'Every selected page is either checked or explicitly marked unavailable. Nothing is silently skipped.'
    },
    {
      title: 'The right check for each access level',
      description:
        'Open pages run from the cloud. Restricted pages run from a CI environment that already has access.'
    },
    {
      title: 'Reports built to share',
      description:
        'Private, revocable links keep clients and collaborators informed without exposing the workspace.'
    }
  ]

  return (
    <>
      <section className="border-border border-b px-5 py-20 sm:py-28" id="what-coderocket-does">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="lg:pr-8">
            <p className="text-signal text-xs uppercase tracking-[.18em]">What CodeRocket does</p>
            <h2 className="mt-6 font-editorial text-5xl leading-[.98] tracking-[-.03em] sm:text-6xl xl:text-7xl">
              One clear health report,
              <br />
              <em>not five technical dashboards.</em>
            </h2>
            <p className="mt-7 max-w-xl text-lg text-muted leading-8">
              CodeRocket turns hundreds of maintained website rules and safe page checks into a
              short list of actions. You see what is new, what still needs work, what was fixed, and
              which pages could not be checked.
            </p>
          </div>
          <ol className="border-border border-t">
            {benefits.map(({ description, title }, index) => (
              <li
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-border border-b py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-5"
                key={title}
              >
                <span className="font-mono text-signal text-xs">0{index + 1}</span>
                <div>
                  <h3 className="font-heading font-semibold text-lg">{title}</h3>
                  <p className="mt-2 max-w-xl text-muted text-sm leading-6">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <AuditDemo />
      <HomepageLevels />
      <UseCases />
      <DecisionRules />
      <HomepageFaq />
      <FinalCallToAction />
    </>
  )
}

/** Answer the most common questions about monitoring and restricted access. */
function HomepageFaq() {
  return (
    <section className="border-border border-t px-5 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.75fr_1.25fr]">
        <div>
          <p className="text-signal text-xs uppercase tracking-[.18em]">Common questions</p>
          <h2 className="mt-5 font-editorial text-5xl leading-[.98] tracking-[-.03em] sm:text-6xl">
            Website monitoring,
            <br />
            <em>without the mystery.</em>
          </h2>
        </div>
        <FaqAccordion items={faqItems} />
      </div>
    </section>
  )
}

/** Close the homepage with a focused first-check call to action. */
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
          Add your website, tell CodeRocket how it can be reached, and choose up to five important
          pages for the first comparison.
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
