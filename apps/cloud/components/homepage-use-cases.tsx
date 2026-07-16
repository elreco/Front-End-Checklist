import { BellRing, FileCheck2, GitPullRequest, ShieldCheck } from '@repo/design-system/icons'

const useCases = [
  {
    number: '01',
    icon: BellRing,
    title: 'Catch production drift',
    description:
      'A CMS update accidentally adds noindex to a landing page. The next scheduled audit records a new SEO finding and emails you because it is high priority.',
    result: 'Before: page quietly disappears from search',
    outcome: 'After: actionable alert with page and rule'
  },
  {
    number: '02',
    icon: GitPullRequest,
    title: 'Protect pull requests',
    description:
      'A preview adds an icon-only checkout button without an accessible name. The CLI sends the audit to CodeRocket and the GitHub check fails before merge.',
    result: 'Before: visual review looks fine',
    outcome: 'After: CI blocks the new high-priority issue'
  },
  {
    number: '03',
    icon: FileCheck2,
    title: 'Prove delivery to clients',
    description:
      'After fixes, create a private report showing what was resolved and what remains. Give the client an expiring link, then revoke it when the project closes.',
    result: 'Before: screenshots and spreadsheet notes',
    outcome: 'After: one dated, shareable audit report'
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
            Use CodeRocket between development, production, and client delivery—where a vague
            checklist is not enough and a reproducible decision matters.
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
          <p className="text-muted text-xs uppercase tracking-[.14em]">385 quality-gated rules</p>
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
            The gate follows explicit rules, so a freelancer, an agency, and CI all reach the same
            conclusion.
          </p>
        </div>
        <dl className="divide-y divide-border border-border border-t">
          {[
            [
              'A new critical or high finding appears',
              'The gate fails and the CLI exits with code 1.'
            ],
            ['An existing issue is still present', 'It stays persistent and does not block again.'],
            ['A finding disappears from a reachable page', 'It is recorded as resolved.'],
            [
              'A page cannot be reached',
              'Previous findings stay open; no false resolutions are created.'
            ],
            [
              'The upstream ruleset changes',
              'The run requests a new baseline and does not block CI.'
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
