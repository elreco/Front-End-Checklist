import { ArrowRight, Check, ExternalLink, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { deriveWebsiteName } from '@/lib/website-draft'
import { createBuilderSite } from './actions'

/** Ask only for the source details and permission that cannot be inferred safely from a URL. */
export function SiteCreationForm({ initialUrl }: { initialUrl: string }) {
  return (
    <form action={createBuilderSite} className="divide-y divide-border">
      <section className="p-5 sm:p-7">
        <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">1 · The source</p>
        <h2 className="mt-3 font-heading font-semibold text-2xl">
          Which website or app should we study?
        </h2>
        <p className="mt-2 max-w-2xl text-muted leading-7">
          Paste the first screen you want to recreate. If it needs a sign-in, CodeRocket will ask
          you for a temporary test account on the next step. It never copies the original server or
          database.
        </p>
        <label className="mt-6 block max-w-2xl font-semibold text-sm" htmlFor="builder-url">
          Website address
          <CodeRocketInput
            autoComplete="url"
            defaultValue={initialUrl}
            id="builder-url"
            name="url"
            placeholder="https://www.example.com"
            required
            type="url"
          />
        </label>
        <details className="mt-4 max-w-2xl border border-border bg-background">
          <summary className="cursor-pointer p-4 font-semibold text-sm hover:bg-surface-raised">
            Change the website name — optional
          </summary>
          <div className="border-border border-t p-4">
            <label className="font-semibold text-sm" htmlFor="builder-name">
              Website name
              <CodeRocketInput
                defaultValue={deriveWebsiteName(initialUrl)}
                id="builder-name"
                maxLength={120}
                name="name"
                placeholder="Your business"
              />
            </label>
          </div>
        </details>
      </section>

      <section className="p-5 sm:p-7">
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">Website use permission</legend>
          <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">2 · Permission</p>
          <h2 className="mt-3 font-heading font-semibold text-2xl">How may we use this site?</h2>
          <p className="mt-2 max-w-2xl text-muted leading-7">
            This changes what CodeRocket keeps. The recommended option is for a site you own or have
            permission to migrate.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="relative cursor-pointer border border-border bg-background p-5 has-[:checked]:border-signal has-[:checked]:bg-surface-raised">
              <input
                className="peer sr-only"
                defaultChecked
                name="sourceMode"
                type="radio"
                value="owned"
              />
              <span className="flex items-start gap-3">
                <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span>
                  <span className="block font-heading font-semibold">It is mine</span>
                  <span className="mt-1 block text-muted text-sm leading-6">
                    Keep its visible wording, images, identity, and general structure.
                  </span>
                </span>
              </span>
            </label>
            <label className="relative cursor-pointer border border-border bg-background p-5 has-[:checked]:border-signal has-[:checked]:bg-surface-raised">
              <input className="peer sr-only" name="sourceMode" type="radio" value="inspiration" />
              <span className="flex items-start gap-3">
                <ExternalLink aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
                <span>
                  <span className="block font-heading font-semibold">It is inspiration</span>
                  <span className="mt-1 block text-muted text-sm leading-6">
                    Keep only broad visual direction. Replace its logo, images, and wording.
                  </span>
                </span>
              </span>
            </label>
          </div>
        </fieldset>
        <div className="mt-7 flex flex-col gap-4 border border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
            <div>
              <p className="font-semibold text-sm">Nothing goes online automatically</p>
              <p className="mt-1 text-muted text-sm">
                You will review an editable preview before publishing.
              </p>
            </div>
          </div>
          <CodeRocketButton className="shrink-0" size="lg" type="submit">
            Create my first version <ArrowRight aria-hidden />
          </CodeRocketButton>
        </div>
      </section>
    </form>
  )
}
