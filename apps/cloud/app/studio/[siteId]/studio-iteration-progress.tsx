'use client'

import { Check, Circle, Clock3, LoaderCircle, Sparkles } from '@repo/design-system/icons'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  parseStudioIterationProgress,
  type StudioIterationContext,
  type StudioIterationProgress as StudioIterationProgressValue,
  studioIterationGuidance,
  studioIterationIsDelayed,
  studioIterationStepIndex
} from '@/lib/studio-iteration-progress'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  formatStudioElapsed,
  StudioConnectionBadge,
  type StudioConnectionMode
} from './studio-progress-status'

const iterationSteps = [
  'Request saved',
  'Understanding the request',
  'Preparing the changes',
  'Updating the website',
  'Saving the version'
]

/** Keep one Studio change understandable with safe Realtime updates and a polling fallback. */
export function StudioIterationProgress({
  context,
  initialProgress,
  messageId,
  siteId
}: {
  context: StudioIterationContext
  initialProgress: StudioIterationProgressValue
  messageId: string
  siteId: string
}) {
  const router = useRouter()
  const refreshTimer = useRef<number | undefined>(undefined)
  const terminalHandled = useRef(false)
  const [connectionMode, setConnectionMode] = useState<StudioConnectionMode>('connecting')
  const [now, setNow] = useState(0)
  const [progress, setProgress] = useState(initialProgress)

  const syncProgress = useCallback(async () => {
    try {
      const { data, error } = await createSupabaseBrowserClient()
        .from('cr_builder_messages')
        .select(
          'status,progress_stage,progress_current,progress_total,progress_message,progress_updated_at,created_at'
        )
        .eq('id', messageId)
        .eq('site_id', siteId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      const next = parseStudioIterationProgress(data)
      if (!next) throw new Error('Iteration progress was incomplete')
      setProgress(next)
      if (!terminalHandled.current && (next.status === 'completed' || next.status === 'failed')) {
        terminalHandled.current = true
        refreshTimer.current = window.setTimeout(() => router.refresh(), 800)
      }
    } catch {
      setConnectionMode('fallback')
      router.refresh()
    }
  }, [messageId, router, siteId])

  useEffect(() => {
    setNow(Date.now())
    void syncProgress()
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    const polling = window.setInterval(() => void syncProgress(), 6000)
    return () => {
      window.clearInterval(clock)
      window.clearInterval(polling)
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current)
    }
  }, [syncProgress])

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`builder-edit-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cr_builder_messages',
          filter: `id=eq.${messageId}`
        },
        () => void syncProgress()
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setConnectionMode('live')
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionMode('fallback')
      })
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [messageId, syncProgress])

  const elapsedMs = now > 0 ? Math.max(0, now - new Date(progress.createdAt).getTime()) : 0
  const delayed = studioIterationIsDelayed(progress, now)
  const stepIndex = studioIterationStepIndex(progress)
  const pending = progress.status === 'queued' || progress.status === 'working'
  const headline =
    progress.status === 'completed'
      ? 'Your new version is ready'
      : progress.status === 'failed'
        ? 'This change stopped safely'
        : delayed
          ? 'Your change is waiting safely'
          : 'Building your next version'

  return (
    <section
      aria-busy={pending}
      className="mr-7 border border-signal bg-surface p-3 text-xs leading-5"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-signal text-signal">
          {pending ? (
            <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Check aria-hidden className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-sm">{headline}</p>
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-muted">
              <Clock3 aria-hidden className="h-3 w-3" />
              {formatStudioElapsed(elapsedMs)}
            </span>
          </div>
          <p aria-atomic="true" aria-live="polite" className="mt-1 text-foreground" role="status">
            {progress.message}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2.5 border border-border bg-background p-2.5">
        <Sparkles aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
        <div>
          <p className="font-semibold">Right now</p>
          <p className="mt-0.5 text-muted">{studioIterationGuidance(progress, context, delayed)}</p>
        </div>
      </div>

      <ol className="mt-3 space-y-1.5" aria-label="Change progress">
        {iterationSteps.map((label, index) => {
          const complete = index < stepIndex || stepIndex === iterationSteps.length
          const active = index === stepIndex && pending
          return (
            <li
              className={`flex items-center gap-2 font-mono text-[10px] ${
                complete || active ? 'text-foreground' : 'text-muted'
              }`}
              key={label}
            >
              {complete ? (
                <Check aria-hidden className="h-3.5 w-3.5 text-success" />
              ) : active ? (
                <LoaderCircle
                  aria-hidden
                  className="h-3.5 w-3.5 animate-spin text-signal motion-reduce:animate-none"
                />
              ) : (
                <Circle aria-hidden className="h-3.5 w-3.5" />
              )}
              {label}
            </li>
          )
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-border border-t pt-3">
        <StudioConnectionBadge mode={connectionMode} />
        <p className="text-[11px] text-muted">
          Your current version stays safe until this is ready.
        </p>
      </div>
    </section>
  )
}
