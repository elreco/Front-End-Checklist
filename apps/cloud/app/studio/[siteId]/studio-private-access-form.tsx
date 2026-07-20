'use client'

import { KeyRound, LoaderCircle, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { useFormStatus } from 'react-dom'
import { connectBuilderTestAccount } from './access-actions'

/** Guide a non-developer through a bounded, revocable private-app connection. */
export function StudioPrivateAccessForm({
  siteId,
  sourceUrl
}: {
  siteId: string
  sourceUrl: string
}) {
  const loginUrl = new URL('/login', sourceUrl).toString()
  return (
    <form
      action={connectBuilderTestAccount}
      className="border border-signal bg-background text-left"
    >
      <input name="siteId" type="hidden" value={siteId} />
      <div className="border-border border-b p-5 sm:p-6">
        <p className="flex items-center gap-2 font-mono text-signal text-xs uppercase tracking-[.14em]">
          <KeyRound aria-hidden className="h-4 w-4" /> Private app
        </p>
        <h3 className="mt-3 font-heading font-semibold text-2xl">
          Let CodeRocket open the signed-in screens
        </h3>
        <p className="mt-2 text-muted text-sm leading-6">
          Create a temporary test account with sample data. CodeRocket signs in inside an isolated
          browser, studies the main screens, then removes the stored password after this attempt.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-5 sm:p-6">
        <label className="min-w-0 font-semibold text-sm" htmlFor="private-page">
          First private screen
          <CodeRocketInput
            autoComplete="url"
            defaultValue={sourceUrl}
            id="private-page"
            name="privatePage"
            required
            type="url"
          />
          <span className="mt-1.5 block font-normal text-muted text-xs leading-5">
            For example, your dashboard or project list after signing in.
          </span>
        </label>
        <label className="min-w-0 font-semibold text-sm" htmlFor="private-login-page">
          Sign-in page
          <CodeRocketInput
            autoComplete="url"
            defaultValue={loginUrl}
            id="private-login-page"
            name="loginPage"
            required
            type="url"
          />
        </label>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <label className="min-w-0 font-semibold text-sm" htmlFor="private-username">
            Test email or username
            <CodeRocketInput
              autoComplete="username"
              id="private-username"
              maxLength={1024}
              name="username"
              required
            />
          </label>
          <label className="min-w-0 font-semibold text-sm" htmlFor="private-password">
            Test password
            <CodeRocketInput
              autoComplete="new-password"
              id="private-password"
              maxLength={4096}
              name="password"
              required
              type="password"
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 border border-border bg-surface p-4 text-sm">
          <input
            className="mt-1 h-4 w-4 shrink-0 accent-signal"
            name="safeAccount"
            required
            type="checkbox"
            value="confirmed"
          />
          <span className="min-w-0">
            <span className="block font-semibold">This is a test account with sample data</span>
            <span className="mt-1 block text-muted leading-6">
              It does not contain real customers, private messages, payment details, API keys, or
              production permissions.
            </span>
          </span>
        </label>

        <div className="flex gap-3 border border-border bg-surface p-4">
          <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="text-muted text-sm leading-6">
            Temporary computer and phone screenshots may be studied by the visual assistant and are
            removed after 24 hours. SSO, MFA, CAPTCHA, passkeys, VPNs, and identity-provider
            redirects are not bypassed.
          </p>
        </div>
        <ConnectPrivateAppButton />
      </div>
    </form>
  )
}

/** Keep the private-app submission state clear while credentials are encrypted. */
function ConnectPrivateAppButton() {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton aria-disabled={pending} disabled={pending} fullWidth size="lg" type="submit">
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <KeyRound aria-hidden />
      )}
      {pending ? 'Connecting the test account…' : 'Connect test account and continue'}
    </CodeRocketButton>
  )
}
