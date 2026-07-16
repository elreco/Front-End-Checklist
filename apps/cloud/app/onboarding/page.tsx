import { Check, Clock3, Globe2, Radar, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput, CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import Link from 'next/link'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { createProject } from './actions'

export const metadata = { title: 'Add a site' }

const outcomes = [
  {
    icon: Radar,
    title: 'We read each public page once',
    description:
      'CodeRocket checks the page structure, content, accessibility, security, and speed basics.'
  },
  {
    icon: ShieldCheck,
    title: 'The first check becomes your reference',
    description:
      'Future checks focus on what changed, so old problems do not create constant noise.'
  },
  {
    icon: Clock3,
    title: 'Monitoring continues automatically',
    description: 'Free sites are checked weekly. Paid plans are checked every day.'
  }
]

export default async function OnboardingPage() {
  const context = await getAppShellContext()
  const limitReached = context.projectCount >= context.limits.projects

  return (
    <ProductShell eyebrow="Guided setup" title="Add a site">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="border border-border bg-surface">
          <div className="border-border border-b p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center border border-border bg-background">
                <Globe2 aria-hidden className="h-5 w-5 text-signal" />
              </span>
              <div>
                <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
                  Step 1 of 3
                </p>
                <h2 className="mt-1 font-heading font-semibold text-2xl">
                  Which website should we watch?
                </h2>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-muted leading-7">
              Start with the live public website your customers use. You do not need to install
              anything or change your website.
            </p>
          </div>

          {limitReached ? (
            <div className="p-5 sm:p-7">
              <div className="border border-accent bg-accent/10 p-5">
                <p className="font-semibold">
                  Your {context.plan} plan is using all available sites.
                </p>
                <p className="mt-2 text-muted text-sm leading-6">
                  Archive an existing site, or choose a plan with more monitored sites.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <CodeRocketButton asChild>
                    <Link href="/pricing">Compare plans</Link>
                  </CodeRocketButton>
                  <CodeRocketButton asChild variant="outline">
                    <Link href="/dashboard#sites">Back to my sites</Link>
                  </CodeRocketButton>
                </div>
              </div>
            </div>
          ) : (
            <form action={createProject} className="space-y-7 p-5 sm:p-7">
              <fieldset className="space-y-5">
                <legend className="font-heading font-semibold text-lg">Site details</legend>
                <label className="block font-semibold text-sm" htmlFor="project-name">
                  A name you will recognize
                  <CodeRocketInput
                    id="project-name"
                    maxLength={120}
                    name="name"
                    placeholder="Example: Acme online store"
                    required
                  />
                  <span className="mt-2 block font-normal text-muted text-xs">
                    This can be a company, client, or project name.
                  </span>
                </label>
                <label className="block font-semibold text-sm" htmlFor="production-url">
                  Public website address
                  <CodeRocketInput
                    autoComplete="url"
                    id="production-url"
                    name="url"
                    placeholder="https://www.example.com"
                    required
                    type="url"
                  />
                  <span className="mt-2 block font-normal text-muted text-xs">
                    Use the secure https:// address visible to visitors.
                  </span>
                </label>
              </fieldset>

              <fieldset className="border-border border-t pt-6">
                <legend className="font-heading font-semibold text-lg">
                  Important pages to watch
                </legend>
                <p className="mt-2 text-muted text-sm leading-6">
                  Add the parts after your domain, one per line. Start with pages that bring in
                  leads, sales, or customer trust.
                </p>
                <label className="mt-4 block font-semibold text-sm" htmlFor="monitored-pages">
                  Page paths
                  <CodeRocketTextarea
                    defaultValue={'/\n/pricing\n/contact'}
                    id="monitored-pages"
                    name="pages"
                    required
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-muted text-xs">
                  <span>Examples: /, /pricing, /contact, /checkout</span>
                  <span>
                    {context.limits.pagesPerProject} pages available on {context.plan}
                  </span>
                </div>
              </fieldset>

              <div className="border border-border bg-background p-4 text-sm">
                <p className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>
                    <strong>No code or payment card required.</strong> The first check starts as
                    soon as the site is added.
                  </span>
                </p>
              </div>
              <CodeRocketButton size="lg" type="submit">
                Add site and start first check
              </CodeRocketButton>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <div className="border border-border bg-surface p-5 sm:p-6">
            <p className="font-mono text-[10px] text-accent uppercase tracking-[.16em]">
              What happens next
            </p>
            <ol className="mt-5 space-y-6">
              {outcomes.map(({ description, icon: Icon, title }, index) => (
                <li className="flex gap-3" key={title}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background">
                    <Icon aria-hidden className="h-4 w-4 text-signal" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm">
                      {index + 1}. {title}
                    </p>
                    <p className="mt-1 text-muted text-xs leading-5">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="border border-border bg-background p-5">
            <p className="font-semibold text-sm">What CodeRocket does not do</p>
            <p className="mt-2 text-muted text-xs leading-5">
              It does not change your site, place orders, submit forms, or run a hidden browser. It
              reads the public HTML safely and reports what it can prove.
            </p>
            <Link
              className="mt-4 inline-flex font-mono text-accent text-xs hover:text-signal"
              href="/docs/audits"
            >
              Read how checks work →
            </Link>
          </div>
        </aside>
      </div>
    </ProductShell>
  )
}
