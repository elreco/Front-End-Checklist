'use client'

import {
  Check,
  Globe2,
  KeyRound,
  LoaderCircle,
  MousePointerClick,
  ShieldCheck
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { useFormStatus } from 'react-dom'
import type { BuilderAccessRecovery } from '@/lib/builder-access-recovery'
import { startBuilderBrowserHandoff } from './access-actions'
import { StudioPrivateAccessForm } from './studio-private-access-form'

/** Lead with one human-assisted browser action and keep automatic credentials secondary. */
export function StudioProtectedAccess({
  browserAvailable,
  ownedSource,
  recovery,
  siteId,
  sourceUrl
}: {
  browserAvailable: boolean
  ownedSource: boolean
  recovery: BuilderAccessRecovery
  siteId: string
  sourceUrl: string
}) {
  return (
    <section className="overflow-hidden border border-border bg-surface text-left shadow-sm">
      <div className="border-border border-b bg-background p-5 sm:p-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center border border-signal bg-surface text-signal shadow-sm">
            <KeyRound aria-hidden className="h-5 w-5" />
          </span>
          <p className="mt-5 font-mono text-signal text-xs uppercase tracking-[0.18em]">
            {recovery.eyebrow}
          </p>
          <h2 className="mt-2 font-heading font-semibold text-3xl sm:text-4xl">{recovery.title}</h2>
        </div>
        <p className="mx-auto mt-3 max-w-2xl text-muted leading-7">{recovery.description}</p>

        <ol className="mx-auto mt-7 grid max-w-3xl gap-px border border-border bg-border sm:grid-cols-3">
          <RecoveryStep icon={Globe2} label="Open" text="CodeRocket opens the website for you." />
          <RecoveryStep
            icon={MousePointerClick}
            label="Complete"
            text="You handle the sign-in or quick check."
          />
          <RecoveryStep
            icon={Check}
            label="Continue"
            text="CodeRocket recreates the useful pages."
          />
        </ol>
      </div>

      <form action={startBuilderBrowserHandoff} className="p-5 sm:p-7">
        <input name="siteId" type="hidden" value={siteId} />
        <div className="mx-auto max-w-2xl">
          <details className="mb-4 border border-border bg-background">
            <summary className="cursor-pointer px-4 py-3 font-semibold text-sm hover:bg-surface">
              Open a different page from this website
            </summary>
            <div className="border-border border-t p-4">
              <label className="block font-semibold text-sm" htmlFor="browser-target-page">
                Page to open
              </label>
              <input
                className="mt-2 h-11 w-full border border-border bg-surface px-3 text-sm outline-none focus:border-signal"
                defaultValue={sourceUrl}
                id="browser-target-page"
                name="targetPage"
                required
                type="url"
              />
              <p className="mt-2 text-muted text-xs leading-5">
                It must belong to the same website. A dashboard, product, or landing page often
                works better than a generic sign-in page.
              </p>
            </div>
          </details>
          <label className="flex cursor-pointer items-start gap-3 border border-border bg-background p-4 text-sm">
            <input
              className="mt-1 h-4 w-4 shrink-0 accent-signal"
              disabled={!browserAvailable || !ownedSource}
              name="authorisedAccess"
              required
              type="checkbox"
              value="confirmed"
            />
            <span className="min-w-0">
              <span className="block font-semibold">
                I own this website or I am allowed to access it
              </span>
              <span className="mt-1 block text-muted leading-6">
                Use sample data and a limited test account whenever the website contains private
                customer information.
              </span>
            </span>
          </label>

          <div className="mt-4 flex gap-3 border border-border bg-background p-4">
            <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p className="text-muted text-sm leading-6">
              Nothing is published during this step. The temporary browser, its cookies, and its
              storage are destroyed after the attempt.
            </p>
          </div>

          <OpenSecureBrowserButton
            disabled={!browserAvailable || !ownedSource}
            unavailableReason={
              ownedSource
                ? 'The secure browser is not configured on this installation yet.'
                : 'Secure access is available only when recreating a website you own.'
            }
          />
        </div>
      </form>

      <details className="border-border border-t">
        <summary className="cursor-pointer px-5 py-4 font-semibold text-sm hover:bg-background sm:px-7">
          Other way to sign in
        </summary>
        <div className="border-border border-t p-5 sm:p-7">
          <p className="mb-5 text-muted text-sm leading-6">
            For a simple email-and-password form, CodeRocket can use a dedicated temporary test
            account automatically.
          </p>
          <StudioPrivateAccessForm siteId={siteId} sourceUrl={sourceUrl} />
        </div>
      </details>
      <details className="border-border border-t">
        <summary className="cursor-pointer px-5 py-4 font-semibold text-sm hover:bg-background sm:px-7">
          What if the guided browser is refused?
        </summary>
        <div className="border-border border-t px-5 py-4 text-muted text-sm leading-6 sm:px-7">
          Some websites accept only your normal browser, device, company network, or passkey.
          CodeRocket will stop safely instead of pretending it opened the page. You can still try a
          different public page from the same website.
        </div>
      </details>
    </section>
  )
}

/** Explain why the guided browser can or cannot start and show its pending state. */
function OpenSecureBrowserButton({
  disabled,
  unavailableReason
}: {
  disabled: boolean
  unavailableReason: string
}) {
  const { pending } = useFormStatus()
  return (
    <div className="mt-5">
      <CodeRocketButton
        aria-disabled={pending || disabled}
        disabled={pending || disabled}
        fullWidth
        size="lg"
        type="submit"
      >
        {pending ? (
          <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
        ) : (
          <KeyRound aria-hidden />
        )}
        {pending ? 'Opening the guided browser…' : 'Open the guided browser'}
      </CodeRocketButton>
      {disabled ? (
        <p className="mt-2 text-center text-danger text-xs" role="status">
          {unavailableReason}
        </p>
      ) : (
        <p className="mt-2 text-center text-muted text-xs">
          The timer starts only after the browser is ready.
        </p>
      )}
    </div>
  )
}

/** Present one plain-language recovery step for protected source websites. */
function RecoveryStep({
  icon: Icon,
  label,
  text
}: {
  icon: typeof Globe2
  label: string
  text: string
}) {
  return (
    <li className="flex gap-3 bg-surface p-4 text-left">
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
      <span>
        <span className="block font-semibold text-sm">{label}</span>
        <span className="mt-1 block text-muted text-xs leading-5">{text}</span>
      </span>
    </li>
  )
}
