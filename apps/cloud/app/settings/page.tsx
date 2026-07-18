import { BarChart3, Bell, LockKeyhole, Mail, UserRound } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { CookieSettingsButton } from '@/components/google-analytics-consent'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { createPrivateMetadata } from '@/lib/seo'
import { updateProfile } from './actions'

export const metadata = createPrivateMetadata('Account settings')

export default async function SettingsPage() {
  const context = await getAppShellContext()
  return (
    <ProductShell eyebrow="Your account" title="Settings">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="border border-border bg-surface">
          <div className="border-border border-b p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <UserRound aria-hidden className="h-5 w-5 text-signal" />
              <div>
                <h2 className="font-heading font-semibold text-xl">Profile</h2>
                <p className="mt-1 text-muted text-sm">
                  How your account appears inside CodeRocket.
                </p>
              </div>
            </div>
          </div>
          <form action={updateProfile} className="space-y-5 p-5 sm:p-6">
            <label className="block max-w-xl font-semibold text-sm" htmlFor="display-name">
              Display name
              <CodeRocketInput
                defaultValue={context.displayName}
                id="display-name"
                maxLength={80}
                name="displayName"
                required
              />
            </label>
            <div className="max-w-xl">
              <p className="font-semibold text-sm">Sign-in email</p>
              <p className="mt-2 flex min-h-11 items-center border border-border bg-background px-3 text-muted text-sm">
                <Mail aria-hidden className="mr-2 h-4 w-4" />
                {context.email || 'Managed by your sign-in provider'}
              </p>
              <p className="mt-2 text-muted text-xs">
                This email comes from the account you use to sign in.
              </p>
            </div>
            <CodeRocketButton type="submit">Save profile</CodeRocketButton>
          </form>
        </section>

        <aside className="space-y-5">
          <div className="border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <Bell aria-hidden className="h-4 w-4 text-signal" />
              <h2 className="font-heading font-semibold text-lg">Useful alerts only</h2>
            </div>
            <p className="mt-3 text-muted text-sm leading-6">
              New sites alert you only about important problems and repeated check failures. You can
              change or disable these emails from each site’s settings.
            </p>
          </div>
          <div className="border border-border bg-background p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole aria-hidden className="h-4 w-4 text-success" />
              <h2 className="font-heading font-semibold text-lg">Private by default</h2>
            </div>
            <p className="mt-3 text-muted text-sm leading-6">
              Websites and results are visible only to your account. A shared report is created only
              when you ask for one, and its link can expire.
            </p>
          </div>
          <div className="border border-border bg-background p-5">
            <div className="flex items-center gap-2">
              <BarChart3 aria-hidden className="h-4 w-4 text-signal" />
              <h2 className="font-heading font-semibold text-lg">Optional analytics</h2>
            </div>
            <p className="mt-3 text-muted text-sm leading-6">
              Choose whether CodeRocket may use Google Analytics to understand which product pages
              are useful. No account name or email is sent.
            </p>
            <CookieSettingsButton className="mt-4" />
          </div>
        </aside>
      </div>
    </ProductShell>
  )
}
