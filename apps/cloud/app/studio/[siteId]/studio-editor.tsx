import { Save } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput, CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { updateBuilderSite } from './actions'

/** Expose the highest-value website changes as normal fields, with connections reduced to URLs. */
export function StudioEditor({
  selectedPath,
  site
}: {
  selectedPath: string
  site: BuilderSiteDetail
}) {
  const selectedPage = site.document?.pages?.find(page => page.path === selectedPath)
  const selectedSections = selectedPage?.sections ?? site.document?.sections
  const firstSection = selectedSections?.[0]
  if (!site.document || !firstSection) return null
  const primaryAction = firstSection.links[0]
  return (
    <aside className="border border-border bg-surface">
      <div className="border-border border-b p-5">
        <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">Simple editor</p>
        <h2 className="mt-2 font-heading font-semibold text-xl">The essentials</h2>
        <p className="mt-2 text-muted text-sm leading-6">
          These changes create a new version. Your current version remains recoverable.
        </p>
      </div>
      <form action={updateBuilderSite} className="space-y-5 p-5">
        <input name="siteId" type="hidden" value={site.id} />
        <input name="pagePath" type="hidden" value={selectedPath} />
        <label className="block font-semibold text-sm" htmlFor="identity-name">
          Business or project name
          <CodeRocketInput
            defaultValue={site.document.identity.name}
            id="identity-name"
            maxLength={120}
            name="identityName"
            required
          />
        </label>
        <label className="block font-semibold text-sm" htmlFor="site-heading">
          Main headline
          <CodeRocketInput
            defaultValue={firstSection.heading}
            id="site-heading"
            maxLength={180}
            name="heading"
            required
          />
        </label>
        <label className="block font-semibold text-sm" htmlFor="site-body">
          Short explanation
          <CodeRocketTextarea
            className="min-h-28"
            defaultValue={firstSection.body}
            id="site-body"
            maxLength={1200}
            name="body"
          />
        </label>
        <div className="border-border border-t pt-5">
          <p className="font-heading font-semibold">Main action</p>
          <p className="mt-1 text-muted text-xs leading-5">
            Paste a Stripe payment link, Calendly link, contact page, or any secure destination.
            There are no API keys to configure.
          </p>
          <label className="mt-4 block font-semibold text-sm" htmlFor="cta-label">
            Button wording
            <CodeRocketInput
              defaultValue={primaryAction?.label ?? 'Contact us'}
              id="cta-label"
              maxLength={80}
              name="ctaLabel"
            />
          </label>
          <label className="mt-4 block font-semibold text-sm" htmlFor="cta-url">
            Button destination
            <CodeRocketInput
              defaultValue={primaryAction?.href}
              id="cta-url"
              name="ctaUrl"
              placeholder="https://buy.stripe.com/..."
              type="url"
            />
          </label>
        </div>
        <CodeRocketButton fullWidth type="submit" variant="outline">
          <Save aria-hidden /> Save a new version
        </CodeRocketButton>
      </form>
    </aside>
  )
}
