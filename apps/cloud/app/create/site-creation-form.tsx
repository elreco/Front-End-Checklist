import {
  Check,
  ExternalLink,
  Globe2,
  Images,
  KeyRound,
  ShieldCheck
} from '@repo/design-system/icons'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { deriveWebsiteName } from '@/lib/website-draft'
import { createBuilderSite } from './actions'
import { SiteCreationInstruction } from './site-creation-instruction'
import { SiteCreationSubmit } from './site-creation-submit'

/** Ask only for the source details and permission that cannot be inferred safely from a URL. */
export function SiteCreationForm({ initialUrl }: { initialUrl: string }) {
  return (
    <form action={createBuilderSite} className="divide-y divide-border">
      <section className="p-5 sm:p-7">
        <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
          1 · Starting point
        </p>
        <h2 className="mt-3 font-heading font-semibold text-2xl">
          What should CodeRocket start from?
        </h2>
        <p className="mt-2 max-w-2xl text-muted leading-7">
          Choose the clearest example of what you want. CodeRocket turns it into one editable
          project that you can change by asking.
        </p>

        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative border border-signal bg-surface-raised p-5">
              <input name="sourceType" type="hidden" value="url" />
              <span className="flex items-start gap-3">
                <Globe2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-semibold">An existing website</span>
                    <span className="bg-signal px-2 py-0.5 font-mono text-[10px] text-signal-foreground uppercase tracking-[.1em]">
                      Recommended
                    </span>
                  </span>
                  <span className="mt-2 block text-muted text-sm leading-6">
                    Start from a public page or an app you are allowed to open.
                  </span>
                </span>
              </span>
            </div>
            <div aria-disabled className="border border-border bg-background p-5 text-muted">
              <span className="flex items-start gap-3">
                <Images aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-heading font-semibold text-foreground">
                      Images or a Figma design
                    </span>
                    <span className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[.1em]">
                      Coming next
                    </span>
                  </span>
                  <span className="mt-2 block text-sm leading-6">
                    Screenshots and shared designs will enter the same simple journey.
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <label className="mt-6 block max-w-2xl font-semibold text-sm" htmlFor="builder-url">
          Paste the page to copy
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
        <p className="mt-2 max-w-2xl text-muted text-xs leading-5">
          Start with the most useful page. CodeRocket will find a small set of other useful page
          types instead of copying every repeated address.
        </p>

        <SiteCreationInstruction />

        <details className="mt-4 max-w-2xl border border-border bg-background">
          <summary className="cursor-pointer p-4 font-semibold text-sm hover:bg-surface-raised">
            Choose a different project name — optional
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
        <details className="mt-4 max-w-2xl border border-border bg-background">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold text-sm hover:bg-surface-raised [&::-webkit-details-marker]:hidden">
            <KeyRound aria-hidden className="h-5 w-5 shrink-0 text-signal" />
            The page opens only after signing in
          </summary>
          <div className="border-border border-t p-4 text-muted text-sm leading-6">
            <p>
              Paste the private page above. If CodeRocket cannot open it, the Studio will let you
              sign in yourself inside a temporary private browser.
            </p>
            <p className="mt-3">
              Use a test account with sample content whenever possible. Do not use an administrator
              account or include real personal or payment data.
            </p>
            <p className="mt-3 text-xs">
              CodeRocket cannot bypass a CAPTCHA, verification request, VPN, or access rule. It
              pauses and clearly asks you to continue when your help is required.
            </p>
          </div>
        </details>
      </section>

      <section className="p-5 sm:p-7">
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">Website use permission</legend>
          <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">2 · Permission</p>
          <h2 className="mt-3 font-heading font-semibold text-2xl">One quick permission</h2>
          <p className="mt-2 max-w-2xl text-muted leading-7">
            This tells CodeRocket whether it may keep the visible identity and content, or should
            create an original alternative.
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
                  <span className="block font-heading font-semibold">I can reuse this website</span>
                  <span className="mt-1 block text-muted text-sm leading-6">
                    I own it or have permission to keep its visible wording, images, and identity.
                  </span>
                </span>
              </span>
            </label>
            <label className="relative cursor-pointer border border-border bg-background p-5 has-[:checked]:border-signal has-[:checked]:bg-surface-raised">
              <input className="peer sr-only" name="sourceMode" type="radio" value="inspiration" />
              <span className="flex items-start gap-3">
                <ExternalLink aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
                <span>
                  <span className="block font-heading font-semibold">Use it as inspiration</span>
                  <span className="mt-1 block text-muted text-sm leading-6">
                    Keep the broad direction, but replace its logo, images, and wording.
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
          <SiteCreationSubmit />
        </div>
      </section>
    </form>
  )
}
