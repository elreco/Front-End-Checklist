import {
  BellRing,
  BrainCircuit,
  FileCheck2,
  ShieldCheck,
  UserRound
} from '@repo/design-system/icons'

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
      'You are a freelancer or agency. Keep an eye on client sites after delivery, spot an unexpected website change, and open the exact page and explanation before the client calls.',
    result: 'Before: reactive maintenance and scattered screenshots',
    outcome: 'After: a monitored portfolio and dated evidence'
  },
  {
    number: '03',
    icon: BrainCircuit,
    title: 'Turn proof into a fix plan',
    description:
      'Open a verified problem and choose who needs help. The AI assistant reads the saved evidence and matching Front-End Checklist rule, then prepares clear steps and checks without changing your site.',
    result: 'Before: copy a technical warning into a generic chatbot',
    outcome: 'After: a grounded plan that a fresh check can verify'
  },
  {
    number: '04',
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
  'Languages & regions',
  'Testing'
]

/** Present the main jobs CodeRocket supports for owners and agencies. */
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
            Pages that open without sign-in work with no installation. Restricted pages can be
            checked from GitHub, GitLab, Bitbucket, or your own CI.
          </p>
        </div>
        <div className="divide-y divide-border">
          {useCases.map(({ description, icon: Icon, number, outcome, result, title }) => (
            <article className="grid gap-7 py-12 lg:grid-cols-[100px_.8fr_1.2fr]" key={number}>
              <p className="text-muted text-xs">{number} / 04</p>
              <div>
                <Icon aria-hidden className="h-6 w-6 text-signal" />
                <h3 className="mt-5 font-editorial text-4xl">{title}</h3>
              </div>
              <div>
                <p className="max-w-2xl text-muted leading-7">{description}</p>
                <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2">
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
            The complete Front-End Checklist remains the technical reference. CodeRocket
            automatically runs only the checks it can prove from the page it was allowed to read.
            When access or a human decision is needed, it says so instead of guessing.
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

/** Explain the deterministic rules used to classify each check result. */
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
              'Nothing new needs your attention.'
            ],
            [
              'A new important problem appears',
              'The result says “Needs attention” and an alert can be sent.'
            ],
            [
              'An existing problem is still present',
              'It stays in the open list without creating another alert.'
            ],
            ['A problem disappears from a checked page', 'It is recorded as fixed.'],
            [
              'A page cannot be reached',
              'The check is marked incomplete. Previous problems stay open.'
            ],
            [
              'The technical rule reference changes',
              'CodeRocket saves a fresh starting point instead of creating false alerts.'
            ],
            [
              'You ask the AI assistant for help',
              'It explains the saved proof and prepares a fix plan. Only a fresh deterministic check can call the problem fixed.'
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
