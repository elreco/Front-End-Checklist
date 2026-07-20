import { Check, ExternalLink, Globe2, WandSparkles } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { ProductShell } from '@/components/product-shell'
import { WebsiteRecreationForm } from '@/components/website-recreation-form'
import { listBuilderSites } from '@/lib/builder-data'
import { createPrivateMetadata } from '@/lib/seo'

export const metadata = createPrivateMetadata('My websites')

const notices: Record<string, string> = {
  'site-limit': 'Your plan already has its maximum number of created websites.',
  'monthly-limit':
    'Your monthly creation allowance or protected cost budget is reached. Existing websites stay online.'
}

export default async function WebsitesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [sites, query] = await Promise.all([listBuilderSites(), searchParams])
  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice
  return (
    <ProductShell eyebrow="Website builder" title="My websites">
      {notice && notices[notice] ? (
        <p className="mb-5 border border-warning bg-surface p-4 text-warning" role="status">
          {notices[notice]}
        </p>
      ) : null}
      {sites.length === 0 ? (
        <section className="border border-border border-dashed bg-surface px-6 py-14 text-center sm:px-10 sm:py-20">
          <WandSparkles aria-hidden className="mx-auto h-8 w-8 text-signal" />
          <h2 className="mt-5 font-heading font-semibold text-3xl">Clone your first website</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted leading-7">
            Paste a public address. CodeRocket creates a private, editable version before anything
            can go online.
          </p>
          <WebsiteRecreationForm
            buttonLabel="Create my first version"
            className="mx-auto mt-8"
            idPrefix="websites-empty-clone"
          />
          <ul className="mx-auto mt-7 grid max-w-3xl gap-3 text-left text-sm sm:grid-cols-3">
            {[
              'Visible pages recreated',
              'Important content editable',
              'Publishing stays your choice'
            ].map(benefit => (
              <li className="flex gap-2 border border-border bg-background p-3" key={benefit}>
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <div className="mb-5 flex justify-end">
            <CodeRocketButton asChild>
              <Link href="/create">
                <WandSparkles aria-hidden /> Clone another website
              </Link>
            </CodeRocketButton>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sites.map(site => (
              <article
                className="relative border border-border bg-surface p-5 transition-colors hover:bg-surface-raised"
                key={site.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center border border-border bg-background">
                    <Globe2 aria-hidden className="h-5 w-5 text-signal" />
                  </span>
                  <span
                    className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.1em] ${
                      site.status === 'published'
                        ? 'border-success text-success'
                        : site.status === 'failed'
                          ? 'border-danger text-danger'
                          : 'border-border text-muted'
                    }`}
                  >
                    {site.status === 'published'
                      ? 'Online'
                      : site.status === 'failed'
                        ? 'Needs help'
                        : site.status === 'ready'
                          ? 'Ready'
                          : 'Creating'}
                  </span>
                </div>
                <h2 className="mt-6 font-heading font-semibold text-xl">
                  <Link
                    className='after:absolute after:inset-0 after:content-[""]'
                    href={`/studio/${site.id}`}
                  >
                    {site.name}
                  </Link>
                </h2>
                <p className="mt-2 truncate text-muted text-sm">{site.sourceUrl}</p>
                <p className="mt-5 text-muted text-xs">
                  {site.statusMessage ??
                    (site.sourceMode === 'owned'
                      ? 'Recreated from a site you own'
                      : 'Created from visual inspiration')}
                </p>
                {site.publishedAt ? (
                  <a
                    className="relative z-10 mt-5 inline-flex items-center gap-2 font-mono text-signal text-xs hover:underline"
                    href={`/s/${site.slug}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open website <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}
    </ProductShell>
  )
}
