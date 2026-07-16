import { BellRing, FileCheck2, ShieldCheck, UserRound } from '@repo/design-system/icons'

const useCases = [
  {
    number: '01',
    icon: UserRound,
    title: 'Watch your own website',
    description:
      'You run a portfolio, newsletter, association, or small shop. Add the pages that matter and receive a short alert only when CodeRocket finds a new important problem.',
    result: 'Before: check several tools when something feels wrong',
    outcome: 'After: one readable list of what needs attention'
  },
  {
    number: '02',
    icon: BellRing,
    title: 'Watch every client site',
    description:
      'You are a freelancer or agency. Keep a daily eye on client sites after delivery, spot a CMS or hosting change, and open the exact page and explanation before the client calls.',
    result: 'Before: reactive maintenance and scattered screenshots',
    outcome: 'After: a monitored portfolio and dated evidence'
  },
  {
    number: '03',
    icon: FileCheck2,
    title: 'Share progress without jargon',
    description:
      'Create a private report that shows what is healthy, what changed, what was fixed, and what could not be checked. The link can expire or be revoked at any time.',
    result: 'Before: a technical export nobody reads',
    outcome: 'After: a client-ready website health report'
  }
]

const categories = [
  'Accessibility',
  'SEO',
  'Performance',
  'Security',
  'HTML',
  'CSS',
  'JavaScript',
  'Images',
  'Privacy',
  'Internationalization',
  'Testing'
]

export function UseCases() {
  return (
    <section className="border-border border-b px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 border-border border-b pb-14 lg:grid-cols-2">
          <h2 className="font-editorial text-5xl leading-[.98] sm:text-7xl">
            Built for the moments
            <br />
            <em>that cost trust.</em>
          </h2>
          <p className="max-w-xl text-lg text-muted leading-8 lg:justify-self-end">
            CodeRocket is useful without GitHub, and grows with you when you need previews or CI.
            The same product serves a single site owner, a freelancer, and an agency portfolio.
          </p>
        </div>
        <div className="divide-y divide-border">
          {useCases.map(({ description, icon: Icon, number, outcome, result, title }) => (
            <article className="grid gap-7 py-12 lg:grid-cols-[100px_.8fr_1.2fr]" key={number}>
              <p className="text-muted text-xs">{number} / 03</p>
              <div>
                <Icon aria-hidden className="h-6 w-6 text-signal" />
                <h3 className="mt-5 font-editorial text-4xl">{title}</h3>
              </div>
              <div>
                <p className="max-w-2xl text-muted leading-7">{description}</p>
                <div className="mt-6 grid gap-px bg-border sm:grid-cols-2">
                  <p className="bg-surface p-4 text-muted text-sm">{result}</p>
                  <p className="bg-surface p-4 text-foreground text-sm">{outcome}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 border border-border p-6 sm:p-8">
          <p className="text-muted text-xs uppercase tracking-[.14em]">
            One maintained source of truth
          </p>
          <p className="mt-3 max-w-3xl text-muted text-sm leading-6">
            The complete Front-End Checklist remains the technical reference. CodeRocket runs the
            checks that can be verified reliably from public HTML and HTTP responses, exposes
            developer checks through GitHub and the CLI, and links manual guidance when human
            judgment is still required.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map(category => (
              <span className="border border-border bg-surface px-3 py-2 text-sm" key={category}>
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function DecisionRules() {
  return (
    <section className="px-5 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <ShieldCheck aria-hidden className="h-7 w-7 text-signal" />
          <h2 className="mt-6 font-editorial text-5xl leading-[.98] sm:text-7xl">
            Predictable by design.
          </h2>
          <p className="mt-6 max-w-lg text-muted leading-7">
            Every result says what CodeRocket could verify. A business owner gets a clear status; a
            developer can open the exact rule and technical evidence.
          </p>
        </div>
        <dl className="divide-y divide-border border-border border-t">
          {[
            [
              'Every requested page is readable and no new important problem appears',
              'The website is healthy for this check.'
            ],
            [
              'A new important problem appears',
              'The website needs attention and an alert can be sent.'
            ],
            [
              'An existing problem is still present',
              'It stays visible without becoming a new alert.'
            ],
            ['A problem disappears from a checked page', 'It is recorded as resolved.'],
            [
              'A page cannot be reached',
              'The check is inconclusive. Previous problems stay open and the CLI returns an operational error.'
            ],
            [
              'The upstream ruleset changes',
              'The run requests a fresh baseline so an upstream update does not create fake alerts.'
            ]
          ].map(([term, detail]) => (
            <div className="grid gap-3 py-6 sm:grid-cols-2" key={term}>
              <dt className="font-semibold">{term}</dt>
              <dd className="text-muted">{detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
