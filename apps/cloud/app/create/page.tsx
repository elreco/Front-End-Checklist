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
  'invalid-instruction': 'Keep the optional request between 2 and 2,000 characters.',
  'create-failed': 'The website could not be started. Nothing was charged; please try again.',
  'invalid-figma-url': 'Paste a valid Figma design link and inspect it again.',
  'invalid-figma-screens': 'Choose between one and five Figma screens.',
  'figma-unavailable':
    'Figma connection is not configured on this installation yet. No design was read.',
  'figma-connection-failed':
    'Figma could not be connected. Try again and allow read access to file content.',
  'figma-connected': 'Figma is connected. Inspect the design and choose the screens to recreate.',
  'figma-file-unavailable':
    'The connected Figma account could not open this design. Check its sharing access and try again.'
}
const positiveNotices = new Set(['figma-connected'])

export default async function CreateWebsitePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawUrl = Array.isArray(params.url) ? params.url[0] : params.url
  const rawFigmaUrl = Array.isArray(params.figmaUrl) ? params.figmaUrl[0] : params.figmaUrl
  const rawSource = Array.isArray(params.source) ? params.source[0] : params.source
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice
  const initialUrl = normalizeWebsiteDraft(rawUrl ?? '') ?? ''
  const initialFigmaUrl = rawFigmaUrl?.startsWith('https://') ? rawFigmaUrl.slice(0, 2_048) : ''
  const initialSource = rawSource === 'figma' ? 'figma' : 'url'
  const context = await getAppShellContext()
  const builderLimits = getBuilderPlanEntitlements(context.plan)

  return (
    <ProductShell eyebrow="Start from a real example" title="Create your website">
      {notice && notices[notice] ? (
        <p
          className={`mb-5 border bg-surface p-4 ${
            positiveNotices.has(notice)
              ? 'border-success text-success'
              : 'border-danger text-danger'
          }`}
          role={positiveNotices.has(notice) ? 'status' : 'alert'}
        >
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
                The free account lets you explore the creation journey, but it never starts paid
                generation or hosting work in the background. Launch includes one hosted website,
                bounded recreation costs, and a hard monthly spending ceiling.
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
            <SiteCreationForm
              initialFigmaUrl={initialFigmaUrl}
              initialSource={initialSource}
              initialUrl={initialUrl}
            />
          )}
        </section>
        <aside className="space-y-4">
          <div className="border border-border bg-surface p-5 sm:p-6">
            <WandSparkles aria-hidden className="h-5 w-5 text-signal" />
            <h2 className="mt-4 font-heading font-semibold text-lg">What happens next</h2>
            <ul className="mt-4 space-y-3 text-muted text-sm leading-6">
              <li>1. CodeRocket studies the useful design and content patterns.</li>
              <li>2. It creates one private project with reusable pages and sections.</li>
              <li>3. You ask for changes in normal words and review each version.</li>
            </ul>
          </div>
          <div className="border border-border bg-background p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-semibold text-sm">Safe recreation</p>
                <p className="mt-2 text-muted text-xs leading-5">
                  Nothing is published automatically. Source scripts, tracking secrets, passwords,
                  private data, and the original database are never copied into your project.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </ProductShell>
  )
}
