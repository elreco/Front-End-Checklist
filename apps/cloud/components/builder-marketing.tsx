import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Globe2,
  MousePointerClick,
  Rocket,
  ShieldCheck,
  Sparkles
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { FaqAccordion } from '@/components/faq-accordion'
import { WebsiteRecreationForm } from '@/components/website-recreation-form'

const steps = [
  {
    number: '01',
    title: 'Paste the website address',
    body: 'CodeRocket studies the visible pages, words, images, typography, spacing, and layouts on phone, tablet, and computer. You never need to explain the technology behind it.'
  },
  {
    number: '02',
    title: 'Confirm how we may use it',
    body: 'Tell us whether the site is yours or only inspiration. CodeRocket infers the rest from the site, and you can edit everything important before publishing.'
  },
  {
    number: '03',
    title: 'Review and publish',
    body: 'Change the important words in a simple editor, preview the result, and publish a safe version when you are happy.'
  }
]

const faqItems = [
  {
    question: 'How close will the recreated website be?',
    answer:
      'CodeRocket compares the visible computer and phone layouts, then rebuilds their design system with safe components. You review the private result before publishing. Highly interactive applications or protected content may still need a small manual adjustment.'
  },
  {
    question: 'Does CodeRocket copy every piece of source code?',
    answer:
      'No. It studies the rendered website and rebuilds it with safe CodeRocket sections. It does not store or run the original JavaScript, private data, tracking secrets, or server code.'
  },
  {
    question: 'Can I use any website as inspiration?',
    answer:
      'Yes, but inspiration mode deliberately removes the source logo, images, and wording. If you own the site or have permission, choose the ownership option to preserve its visible identity and content.'
  },
  {
    question: 'Do I need to connect a database?',
    answer:
      'Not for a normal brochure, portfolio, booking, or payment-link website. Start with simple links to Stripe, Calendly, or your preferred booking service. Technical connections stay optional.'
  },
  {
    question: 'Where is my website hosted?',
    answer:
      'CodeRocket runs on Fly.io and publishes generated websites through the same controlled platform. It does not depend on Vercel. Custom domains and asset delivery can be connected without exposing infrastructure settings in the normal journey.'
  },
  {
    question: 'Does the existing website monitoring product still exist?',
    answer:
      'Yes. Website health remains available as a separate tool for automatic checks, change detection, accessibility, search visibility, security, and performance.'
  }
]

/** Main marketing journey for the novice-first website recreation product. */
export function BuilderMarketing() {
  return (
    <>
      <section className="overflow-hidden border-border border-b px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-7xl text-center">
          <div className="inline-flex items-center gap-3 border border-border bg-surface px-4 py-2 font-mono text-muted text-xs uppercase tracking-[.14em]">
            <Sparkles aria-hidden className="h-4 w-4 text-signal" />
            The no-code website cloner
          </div>
          <h1 className="mx-auto mt-10 max-w-6xl">
            <span className="block font-editorial text-[clamp(3.7rem,6.5vw,7.4rem)] leading-[.86] tracking-[-.05em]">
              Clone a website.
            </span>
            <span className="mt-3 block font-editorial text-[clamp(3.2rem,5.5vw,6.2rem)] text-signal italic leading-[.9]">
              Make it yours.
            </span>
          </h1>
          <p className="mx-auto mt-9 max-w-3xl text-lg text-muted leading-8 sm:text-xl">
            Paste a public website address. CodeRocket rebuilds the visible pages as a safe,
            editable site you can change and publish—without seeing code or configuring a server.
          </p>
          <WebsiteRecreationForm className="mx-auto mt-9" idPrefix="landing-clone" />
          <BuilderPreview />
        </div>
      </section>

      <section className="border-border border-b px-5 py-20 sm:py-28" id="how-it-works">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
            Three simple steps
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <h2 className="font-editorial text-5xl leading-[.95] tracking-[-.035em] sm:text-7xl">
              From an existing site
              <br />
              <em>to your next one.</em>
            </h2>
            <ol className="border-border border-t">
              {steps.map(step => (
                <li
                  className="grid gap-4 border-border border-b py-7 sm:grid-cols-[3rem_1fr]"
                  key={step.number}
                >
                  <span className="font-mono text-signal text-xs">{step.number}</span>
                  <div>
                    <h3 className="font-heading font-semibold text-xl">{step.title}</h3>
                    <p className="mt-2 max-w-2xl text-muted leading-7">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="border-border border-b bg-surface px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-3">
            <OutcomeCard
              body="Edit the headline, description, and main action in normal form fields. Every save creates a recoverable version."
              icon={MousePointerClick}
              title="An editor, not a coding screen"
            />
            <OutcomeCard
              body="Use a Stripe payment link, Calendly, or another booking URL. More complex connections appear only when the site truly needs them."
              icon={CreditCard}
              title="Useful connections without setup"
            />
            <OutcomeCard
              body="Generated pages use a controlled component system. The original site's scripts and secrets never become part of the published version."
              icon={ShieldCheck}
              title="Safe by construction"
            />
          </div>
          <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
            {[
              [Globe2, 'One hosted website', 'included with Launch'],
              [CalendarDays, 'Bookings and payments', 'through simple links'],
              [Rocket, 'Your own domain', 'connect it when you are ready']
            ].map(([Icon, title, detail]) => {
              const ItemIcon = Icon
              return (
                <div className="bg-background p-6" key={String(title)}>
                  <ItemIcon aria-hidden className="h-5 w-5 text-signal" />
                  <p className="mt-4 font-heading font-semibold">{String(title)}</p>
                  <p className="mt-1 text-muted text-sm">{String(detail)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-border border-b px-5 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
              Clear boundaries
            </p>
            <h2 className="mt-6 font-editorial text-5xl leading-[.95] tracking-[-.03em] sm:text-6xl">
              Powerful underneath.
              <br />
              <em>Calm on the surface.</em>
            </h2>
          </div>
          <FaqAccordion items={faqItems} />
        </div>
      </section>

      <section className="px-5 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-4xl">
          <Rocket aria-hidden className="mx-auto h-8 w-8 text-signal" />
          <h2 className="mt-7 font-editorial text-6xl leading-[.9] tracking-[-.04em] sm:text-8xl">
            Your starting point
            <br />
            <em>already exists.</em>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-muted leading-7">
            Paste its address. CodeRocket will turn the visible page into a version you can
            understand, change, and publish.
          </p>
          <CodeRocketButton asChild className="mt-9" size="lg">
            <Link href="/create">
              Clone a website <ArrowRight aria-hidden />
            </Link>
          </CodeRocketButton>
        </div>
      </section>
    </>
  )
}

function BuilderPreview() {
  return (
    <div className="mx-auto mt-16 max-w-5xl border border-border bg-surface p-2 text-left shadow-2xl">
      <div className="flex items-center gap-2 border-border border-b px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-danger" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning" />
        <span className="h-2.5 w-2.5 rounded-full bg-success" />
        <span className="ml-3 flex-1 bg-background px-4 py-2 font-mono text-muted text-xs">
          your-new-website.coderocket.app
        </span>
      </div>
      <div className="grid min-h-[25rem] overflow-hidden bg-background md:grid-cols-[.72fr_1.28fr]">
        <aside className="border-border border-r p-6">
          <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">Your website</p>
          <h2 className="mt-4 font-heading font-semibold text-xl">A first version is ready</h2>
          <ul className="mt-7 space-y-3 text-sm">
            {['Identity found', '6 sections recreated', 'Mobile layout ready'].map(item => (
              <li className="flex items-center gap-2 text-muted" key={item}>
                <Check aria-hidden className="h-4 w-4 text-success" /> {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 border border-border bg-surface-raised p-4">
            <p className="font-mono text-muted text-xs">MAIN ACTION</p>
            <p className="mt-2 font-heading font-semibold">Book an appointment</p>
          </div>
        </aside>
        <div className="flex flex-col justify-between bg-[#f4f1e8] p-8 text-[#181711] sm:p-12">
          <p className="font-heading font-semibold">Northstar Studio</p>
          <div className="py-14">
            <p className="font-mono text-[#6f6655] text-xs uppercase tracking-[.18em]">
              Independent creative studio
            </p>
            <p className="mt-5 max-w-md font-editorial text-5xl leading-[.92]">
              Ideas that make
              <br />
              people move.
            </p>
            <span className="mt-7 inline-flex bg-[#181711] px-5 py-3 text-[#f4f1e8] text-sm">
              See our work
            </span>
          </div>
          <p className="text-[#6f6655] text-sm">Preview · not published</p>
        </div>
      </div>
    </div>
  )
}

function OutcomeCard({
  body,
  icon: Icon,
  title
}: {
  body: string
  icon: typeof ShieldCheck
  title: string
}) {
  return (
    <article className="border border-border bg-background p-7 sm:p-9">
      <Icon aria-hidden className="h-6 w-6 text-signal" />
      <h3 className="mt-7 font-heading font-semibold text-2xl">{title}</h3>
      <p className="mt-3 text-muted leading-7">{body}</p>
    </article>
  )
}
