'use client'

import {
  Check,
  Clock3,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  X
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { BuilderBrowserHandoff } from '@/lib/builder-browser-handoff-data'
import { cancelBuilderBrowserHandoff, confirmBuilderBrowserHandoff } from './actions'

/** Give the owner a full-height interactive browser and one obvious continuation action. */
export function StudioBrowserHandoff({
  handoff,
  siteId
}: {
  handoff?: BuilderBrowserHandoff
  siteId: string
}) {
  const router = useRouter()
  const [now, setNow] = useState(() => Date.now())
  const expiresAt = useMemo(() => Date.parse(handoff?.expiresAt ?? ''), [handoff?.expiresAt])
  const remainingSeconds = Number.isFinite(expiresAt)
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0
  const ready = handoff?.status === 'ready' && Boolean(handoff.liveUrl) && remainingSeconds > 0

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (remainingSeconds > 0) return
    const refresh = window.setTimeout(() => router.refresh(), 1500)
    return () => window.clearTimeout(refresh)
  }, [remainingSeconds, router])

  if (!ready)
    return (
      <section className="flex h-full items-center justify-center overflow-y-auto p-4 sm:p-6">
        <div className="max-w-xl border border-border bg-surface p-6 text-center">
          <Clock3 aria-hidden className="mx-auto h-8 w-8 text-signal" />
          <h2 className="mt-4 font-heading font-semibold text-2xl">
            The private browser is closing
          </h2>
          <p className="mt-2 text-muted leading-7">
            CodeRocket is ending this temporary session safely. You will be able to start another
            one if the website still needs your help.
          </p>
          <form action={cancelBuilderBrowserHandoff} className="mt-5">
            <input name="siteId" type="hidden" value={siteId} />
            <StopBrowserButton label="Return to access options" />
          </form>
        </div>
      </section>
    )

  const host = new URL(handoff.targetUrl).hostname
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-border border-b bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 font-semibold text-sm">
            <ShieldCheck aria-hidden className="h-4 w-4 text-success" />
            <span className="truncate">Private browser for {host}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-muted text-xs">
            <Clock3 aria-hidden className="h-3.5 w-3.5" />
            {formatRemainingTime(remainingSeconds)} remaining
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={cancelBuilderBrowserHandoff}>
            <input name="siteId" type="hidden" value={siteId} />
            <StopBrowserButton />
          </form>
          <CodeRocketButton asChild size="sm" variant="outline">
            <a href={handoff.liveUrl} rel="noreferrer" target="_blank">
              Larger window <ExternalLink aria-hidden />
            </a>
          </CodeRocketButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-[#171717] p-2 sm:p-3">
        <iframe
          allow="clipboard-read; clipboard-write"
          className="h-full w-full border border-border bg-white"
          referrerPolicy="no-referrer"
          sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
          src={handoff.liveUrl}
          title={`Private browser for ${host}`}
        />
      </div>

      <div className="shrink-0 border-border border-t bg-surface p-3 sm:px-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-sm leading-6">
            Complete the check or sign-in. If another tab opens, finish there and return to the
            website before continuing.
          </p>
          <form action={confirmBuilderBrowserHandoff} className="w-full shrink-0 sm:w-auto">
            <input name="siteId" type="hidden" value={siteId} />
            <ContinueButton />
          </form>
        </div>
      </div>
    </section>
  )
}

function StopBrowserButton({ label = 'Stop' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton
      aria-disabled={pending}
      disabled={pending}
      size="sm"
      type="submit"
      variant="ghost"
    >
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <X aria-hidden />
      )}
      {pending ? 'Closing…' : label}
    </CodeRocketButton>
  )
}

function ContinueButton() {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton
      aria-disabled={pending}
      className="w-full sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <Check aria-hidden />
      )}
      {pending ? 'Continuing…' : 'I’m ready — continue'}
    </CodeRocketButton>
  )
}

function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${String(remaining).padStart(2, '0')}`
}
