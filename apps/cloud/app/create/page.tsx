import { getBuilderPlanEntitlements } from '@coderocket/core'
import { CreditCard, ShieldCheck, WandSparkles } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { createPrivateMetadata } from '@/lib/seo'
import { normalizeWebsiteDraft } from '@/lib/website-draft'
import { SiteCreationForm } from './site-creation-form'

export const metadata = createPrivateMetadata('Create a website')

const notices: Record<string, string> = {
  'invalid-url': 'Enter a valid public website address.',
  'unreachable-url':
    'CodeRocket could not safely reach this address. Check it and try a public HTTPS page.',
  'invalid-name': 'Use a website name between 1 and 120 characters.',
  'create-failed': 'The website could not be started. Nothing was charged; please try again.'
}

export default async function CreateWebsitePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawUrl = Array.isArray(params.url) ? params.url[0] : params.url
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice
  const initialUrl = normalizeWebsiteDraft(rawUrl ?? '') ?? ''
  const context = await getAppShellContext()
  const builderLimits = getBuilderPlanEntitlements(context.plan)

  return (
    <ProductShell eyebrow="No-code website builder" title="Create a website">
      {notice && notices[notice] ? (
        <p className="mb-5 border border-danger bg-surface p-4 text-danger" role="alert">
          {notices[notice]}
        </p>
      ) : null}
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="border border-border bg-surface">
          {builderLimits.sites === 0 ? (
            <div className="p-6 sm:p-9">
              <CreditCard aria-hidden className="h-7 w-7 text-signal" />
              <h2 className="mt-5 font-heading font-semibold text-3xl">
                Website creation starts with Launch
              </h2>
              <p className="mt-3 max-w-2xl text-muted leading-7">
                The free account keeps website monitoring free, but it never starts paid AI or
                hosting work in the background. Launch includes one hosted website, bounded
                recreation costs, and a hard monthly spending ceiling.
              </p>
              {initialUrl ? (
                <p className="mt-5 border border-border bg-background p-4 text-sm">
                  Your source is saved in this link:{' '}
                  <span className="break-all text-muted">{initialUrl}</span>
                </p>
              ) : null}
              <CodeRocketButton asChild className="mt-6" size="lg">
                <Link
                  href={`/pricing?current=free&recommended=solo&source=website_creation${initialUrl ? `&url=${encodeURIComponent(initialUrl)}` : ''}`}
                >
                  See the Launch plan
                </Link>
              </CodeRocketButton>
            </div>
          ) : (
            <SiteCreationForm initialUrl={initialUrl} />
          )}
        </section>
        <aside className="space-y-4">
          <div className="border border-border bg-surface p-5 sm:p-6">
            <WandSparkles aria-hidden className="h-5 w-5 text-signal" />
            <h2 className="mt-4 font-heading font-semibold text-lg">CodeRocket handles</h2>
            <ul className="mt-4 space-y-3 text-muted text-sm leading-6">
              <li>• Visible sections, wording, links, and images</li>
              <li>• Colours and a responsive starting layout</li>
              <li>• Safe version history and a hosted preview</li>
              <li>• A clear main action for your visitors</li>
            </ul>
          </div>
          <div className="border border-border bg-background p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-semibold text-sm">Safe recreation</p>
                <p className="mt-2 text-muted text-xs leading-5">
                  The published result is rebuilt from controlled sections. Source scripts, tracking
                  secrets, forms, and account data are not copied.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </ProductShell>
  )
}
