import type { PlanId } from '@coderocket/core'
import { Check, ExternalLink, Globe2, WandSparkles } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { WebsiteRecreationForm } from '@/components/website-recreation-form'
import type { BuilderSiteSummary } from '@/lib/builder-data'

const builderBenefits = [
  'A private first version built from the visible pages',
  'Responsive layout checked for phone, tablet, and computer',
  'Simple fields for changing the important words and actions',
  'Managed hosting when you decide to publish'
]

/** Make website cloning the primary workspace. */
export function BuilderDashboardOverview({
  displayName,
  plan,
  sites
}: {
  displayName: string
  plan: PlanId
  sites: BuilderSiteSummary[]
}) {
  const firstName = displayName.split(/\s+/)[0] || displayName
  const formHelp =
    plan === 'free'
      ? 'Paste the address first. CodeRocket keeps it while you choose a website plan.'
      : 'Private preview first. You choose when the new website goes online.'

  return (
    <div className="space-y-9">
      <section className="relative overflow-hidden border border-border bg-surface p-6 sm:p-9">
        <WandSparkles aria-hidden className="absolute -right-10 -bottom-10 h-64 w-64 text-border" />
        <div className="relative grid gap-9 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div>
            <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
              Website builder · Welcome, {firstName}
            </p>
            <h2 className="mt-4 max-w-4xl font-editorial text-5xl leading-[.92] tracking-[-.04em] sm:text-7xl">
              Clone a website.
              <br />
              <em>Make it yours.</em>
            </h2>
            <p className="mt-5 max-w-3xl text-muted leading-7 sm:text-lg">
              Paste a public address. CodeRocket rebuilds the visible pages into a private, editable
              website—then guides you through the few decisions that still need you.
            </p>
            <WebsiteRecreationForm
              className="mt-8 max-w-4xl"
              helpText={formHelp}
              idPrefix="dashboard-clone"
            />
          </div>

          <aside className="border border-border bg-background p-5 sm:p-6">
            <p className="font-mono text-muted text-xs uppercase tracking-[.14em]">
              What CodeRocket handles
            </p>
            <ul className="mt-5 space-y-4">
              {builderBenefits.map(benefit => (
                <li className="flex gap-3 text-sm leading-6" key={benefit}>
                  <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-success" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-muted text-xs uppercase tracking-[.14em]">
              Your website workspace
            </p>
            <h2 className="mt-1 font-heading font-semibold text-3xl">Created websites</h2>
          </div>
          {sites.length > 0 ? (
            <CodeRocketButton asChild size="sm" variant="outline">
              <Link href="/websites">View all websites</Link>
            </CodeRocketButton>
          ) : null}
        </div>

        {sites.length === 0 ? (
          <div className="border border-border border-dashed bg-surface p-8 sm:p-10">
            <Globe2 aria-hidden className="h-7 w-7 text-signal" />
            <h3 className="mt-5 font-heading font-semibold text-2xl">
              Your first site starts above
            </h3>
            <p className="mt-2 max-w-2xl text-muted leading-7">
              Paste the address of a site you own, or one you want to use as visual inspiration.
              Your private result will appear here when it is ready.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sites.slice(0, 4).map(site => (
              <article
                className="relative border border-border bg-surface p-5 transition-colors hover:bg-surface-raised"
                key={site.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <Globe2 aria-hidden className="h-5 w-5 text-signal" />
                  <span className="border border-border px-2 py-1 font-mono text-[10px] text-muted uppercase tracking-[.1em]">
                    {site.status === 'published' ? 'Online' : site.status}
                  </span>
                </div>
                <h3 className="mt-6 font-heading font-semibold text-lg">
                  <Link
                    className='after:absolute after:inset-0 after:content-[""]'
                    href={`/studio/${site.id}`}
                  >
                    {site.name}
                  </Link>
                </h3>
                <p className="mt-2 truncate text-muted text-sm">{site.sourceUrl}</p>
                <p className="mt-5 text-muted text-xs leading-5">
                  {site.statusMessage ?? 'Open the studio to continue editing.'}
                </p>
                {site.publishedAt ? (
                  <a
                    aria-label={`Open published website for ${site.name}`}
                    className="relative z-10 mt-4 inline-flex items-center gap-2 font-mono text-signal text-xs"
                    href={`/s/${site.slug}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open live site <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
