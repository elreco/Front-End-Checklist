import { Bell, LockKeyhole, Mail, UserRound } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { updateProfile } from './actions'

const notices: Record<string, string> = {
  saved: 'Your profile was updated.',
  'save-failed': 'Your profile could not be updated. Please try again.',
  'invalid-name': 'Enter a display name between 1 and 80 characters.'
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string }>
}) {
  const [context, search] = await Promise.all([getAppShellContext(), searchParams])
  const notice = search.notice ? notices[search.notice] : undefined
  return (
    <ProductShell eyebrow="Your account" title="Settings">
      {notice ? (
        <p aria-live="polite" className="mb-6 border border-signal bg-surface p-4 text-sm">
          {notice}
        </p>
      ) : null}
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
                Your historical CodeRocket identity remains the source of truth for sign-in.
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
              CodeRocket emails you only when a new critical or high-priority problem appears, or
              when a check repeatedly fails to run.
            </p>
          </div>
          <div className="border border-border bg-background p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole aria-hidden className="h-4 w-4 text-success" />
              <h2 className="font-heading font-semibold text-lg">Private by default</h2>
            </div>
            <p className="mt-3 text-muted text-sm leading-6">
              Projects and results are visible only to your account. Client report links are created
              explicitly and can expire.
            </p>
          </div>
        </aside>
      </div>
    </ProductShell>
  )
}
