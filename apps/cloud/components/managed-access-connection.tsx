'use client'

import { Check, Copy, LoaderCircle, Network, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { useRouter } from 'next/navigation'
import { type FormEvent, useMemo, useState } from 'react'
import {
  diagnoseAccessBarrier,
  type ManagedAccessKind,
  type ProjectManagedAccess
} from '@/lib/managed-access'
import type { ProjectPageCheck } from '@/lib/project-data-types'
import {
  buildManagedAccessPayload,
  getManagedAccessMethodTitle,
  getRecommendedManagedAccessKind,
  managedAccessKindIsPageSession,
  managedAccessMethodOptions
} from './managed-access-connection-helpers'
import { ManagedAccessFields } from './managed-access-fields'
import { ManagedAccessStatus } from './managed-access-status'

/** Connect simple protected-site access directly to the cloud checker, without CI by default. */
export function ManagedAccessConnection({
  authenticatedPages,
  connection,
  latestPages,
  projectId,
  siteUrl
}: {
  authenticatedPages: string[]
  connection?: ProjectManagedAccess
  latestPages: ProjectPageCheck[]
  projectId: string
  siteUrl: string
}) {
  const router = useRouter()
  const barrier = diagnoseAccessBarrier(latestPages)
  const recommendedKind = getRecommendedManagedAccessKind(barrier)
  const [kind, setKind] = useState<ManagedAccessKind | null>(recommendedKind)
  const [busy, setBusy] = useState(false)
  const [addingLayer, setAddingLayer] = useState(false)
  const [showMethods, setShowMethods] = useState(!recommendedKind)
  const scope = managedAccessKindIsPageSession(kind) ? 'authenticated' : 'all'
  const protectedPaths = useMemo(
    () =>
      authenticatedPages.length > 0
        ? authenticatedPages
        : latestPages.filter(page => !page.reachable).map(page => page.path),
    [authenticatedPages, latestPages]
  )
  const suggestedLoginPage = useMemo(
    () =>
      latestPages
        .flatMap(page => page.error?.match(/sign-in screen at (\/[^\s]*)/i)?.[1] ?? [])
        .at(0),
    [latestPages]
  )
  const requestText = useMemo(
    () =>
      `Could you help connect protected-page access for ${siteUrl} in CodeRocket? Please create a dedicated, revocable automation credential or install the secure runner. Do not send a personal password or normal browser session.`,
    [siteUrl]
  )

  if (connection && !addingLayer)
    return (
      <ManagedAccessStatus
        connection={connection}
        onChange={replace => {
          setAddingLayer(true)
          setKind(replace ? (recommendedKind ?? connection.kind) : null)
          setShowMethods(!replace || !recommendedKind)
        }}
        projectId={projectId}
      />
    )

  if (barrier === 'private_network' || barrier === 'interactive_challenge')
    return (
      <section className="border border-signal bg-background p-5">
        <div className="flex items-start gap-3">
          <Network aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
          <div>
            <p className="font-semibold">Run the check where the site already opens</p>
            <p className="mt-1 text-muted text-sm leading-6">
              This site needs a private network, VPN, client certificate, CAPTCHA, or interactive
              browser session. A cloud credential cannot safely reproduce that access. Open the
              developer options below to install the secure runner once.
            </p>
          </div>
        </div>
        <CopyHelpRequest busy={busy} requestText={requestText} setBusy={setBusy} />
      </section>
    )

  /** Verify and persist the selected connection without retaining form secrets in client state. */
  async function submitConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!kind) return
    setBusy(true)
    const formData = new FormData(event.currentTarget)
    const payload = buildManagedAccessPayload(kind, scope, formData, protectedPaths)
    const response = await fetch(`/api/projects/${projectId}/managed-access`, {
      body: JSON.stringify(payload),
      headers: { 'content-type': 'application/json' },
      method: 'POST'
    })
    const body = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) {
      toast.error('The protected page is still blocked', {
        description:
          typeof body.error === 'string' ? body.error : 'Check the access details and try again.'
      })
      return
    }
    toast.success(body.status === 'configured' ? 'Test account saved' : 'Page access connected', {
      description:
        body.status === 'configured'
          ? 'CodeRocket is signing in and checking the protected pages now.'
          : body.queued
            ? 'A fresh website check has started automatically.'
            : 'The connection is ready for the next check.'
    })
    router.refresh()
  }

  return (
    <section className="border border-signal bg-background p-5">
      <p className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
        Recommended · connect once
      </p>
      <h3 className="mt-2 font-heading font-semibold text-lg">
        {kind ? getManagedAccessMethodTitle(kind) : 'How is this site protected?'}
      </h3>
      <p className="mt-2 text-muted text-sm leading-6">
        {kind === 'browser_login'
          ? 'Enter a dedicated test account. CodeRocket will open the normal sign-in page, then check only the pages marked as signed in.'
          : 'CodeRocket tests the connection before saving it. The access value is encrypted, restricted to this website, and can be revoked here at any time.'}
      </p>

      {showMethods || !kind ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {managedAccessMethodOptions.map(option => {
            const Icon = option.icon
            const selected = option.kind === kind
            return (
              <button
                className={`flex items-start gap-3 border p-3 text-left transition-colors ${
                  selected
                    ? 'border-signal bg-signal/10'
                    : 'border-border bg-surface hover:border-signal'
                }`}
                key={option.kind}
                onClick={() => {
                  setKind(option.kind)
                  setShowMethods(false)
                }}
                type="button"
              >
                <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                <span>
                  <span className="block font-semibold text-sm">{option.label}</span>
                  <span className="mt-1 block text-muted text-xs leading-5">{option.summary}</span>
                </span>
                {selected ? <Check aria-hidden className="ml-auto h-4 w-4 text-success" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {kind ? (
        <form className="mt-5 space-y-4" onSubmit={submitConnection}>
          <ManagedAccessFields
            kind={kind}
            siteUrl={siteUrl}
            suggestedLoginPage={suggestedLoginPage}
          />
          {kind === 'session_cookie' ? (
            <div className="flex flex-wrap gap-2">
              <CodeRocketButton
                onClick={() => setKind('bearer_token')}
                size="sm"
                type="button"
                variant="ghost"
              >
                I have an access token instead
              </CodeRocketButton>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <CodeRocketButton disabled={busy} type="submit">
              {busy ? (
                <LoaderCircle aria-hidden className="animate-spin" />
              ) : (
                <ShieldCheck aria-hidden />
              )}
              {busy
                ? kind === 'browser_login'
                  ? 'Starting secure check…'
                  : 'Testing access…'
                : kind === 'browser_login'
                  ? 'Save and check sign-in'
                  : 'Test and connect'}
            </CodeRocketButton>
            <CodeRocketButton
              onClick={() => setShowMethods(value => !value)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {showMethods ? 'Hide other methods' : 'Use another method'}
            </CodeRocketButton>
          </div>
        </form>
      ) : null}
      <CopyHelpRequest busy={busy} requestText={requestText} setBusy={setBusy} />
    </section>
  )
}

/** Offer a secret-free handoff when the current user does not manage website access. */
function CopyHelpRequest({
  busy,
  requestText,
  setBusy
}: {
  busy: boolean
  requestText: string
  setBusy: (busy: boolean) => void
}) {
  return (
    <CodeRocketButton
      className="mt-3"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await navigator.clipboard.writeText(requestText)
          toast.success('Help request copied')
        } catch {
          toast.error('The help request could not be copied')
        } finally {
          setBusy(false)
        }
      }}
      size="sm"
      type="button"
      variant="ghost"
    >
      <Copy aria-hidden /> I do not have these details
    </CodeRocketButton>
  )
}
