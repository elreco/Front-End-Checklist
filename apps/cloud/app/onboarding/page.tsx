import { Clock3, Radar, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { UpgradeLink } from '@/components/plan-limit-upsell'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { getPlanLabel } from '@/lib/product-language'
import { createPrivateMetadata } from '@/lib/seo'
import { getNextPlan } from '@/lib/upgrade'
import { deriveWebsiteName, normalizeWebsiteDraft } from '@/lib/website-draft'
import { OnboardingForm } from './onboarding-form'

export const metadata = createPrivateMetadata('Add a site')

const outcomes = [
  {
    icon: Radar,
    title: 'The right access method is used',
    description:
      'CodeRocket tries the public cloud first, then recommends a guided connection only if a page is blocked.'
  },
  {
    icon: ShieldCheck,
    title: 'The first result is saved',
    description: 'This becomes the starting point used to spot future changes.'
  },
  {
    icon: Clock3,
    title: 'Monitoring continues',
    description: 'Free sites are checked weekly. Paid plans are checked every day.'
  }
]

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawSiteUrl = Array.isArray(params.url) ? params.url[0] : params.url
  const initialSiteUrl = normalizeWebsiteDraft(rawSiteUrl ?? '') ?? ''
  const context = await getAppShellContext()
  const limitReached = context.projectCount >= context.limits.projects
  const nextPlan = getNextPlan(context.plan)

  return (
    <ProductShell eyebrow="Guided setup" title="Add a website">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="border border-border bg-surface">
          {limitReached ? (
            <div className="p-5 sm:p-7">
              <div className="border border-accent bg-accent/10 p-5">
                <p className="font-heading font-semibold text-xl">Your website limit is reached</p>
                <p className="mt-2 text-muted text-sm leading-6">
                  Your {getPlanLabel(context.plan)} plan includes {context.limits.projects}{' '}
                  {context.limits.projects === 1 ? 'website' : 'websites'}. Archive one, or choose a
                  plan with more room.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {nextPlan ? (
                    <CodeRocketButton asChild>
                      <UpgradeLink
                        currentPlan={context.plan}
                        source="site_limit"
                        targetPlan={nextPlan}
                      >
                        Unlock more websites
                      </UpgradeLink>
                    </CodeRocketButton>
                  ) : null}
                  <CodeRocketButton asChild variant="outline">
                    <Link href="/dashboard#sites">Back to my websites</Link>
                  </CodeRocketButton>
                </div>
              </div>
            </div>
          ) : (
            <OnboardingForm
              initialSiteName={deriveWebsiteName(initialSiteUrl)}
              initialSiteUrl={initialSiteUrl}
              pagesPerProject={context.limits.pagesPerProject}
              plan={context.plan}
              planName={getPlanLabel(context.plan)}
            />
          )}
        </section>

        <aside className="space-y-4">
          <div className="border border-border bg-surface p-5 sm:p-6">
            <p className="font-mono text-[10px] text-accent uppercase tracking-[.16em]">
              What happens after setup
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
            <p className="font-semibold text-sm">Safe by design</p>
            <p className="mt-2 text-muted text-xs leading-5">
              CodeRocket does not change your site, place orders, or submit forms. It reports the
              pages it checked and clearly marks anything it could not reach.
            </p>
            <Link
              className="mt-4 inline-flex font-mono text-accent text-xs hover:text-signal"
              href="/docs/audits"
            >
              See exactly how checks work →
            </Link>
          </div>
        </aside>
      </div>
    </ProductShell>
  )
}
