'use client'

import {
  Check,
  Clock3,
  LoaderCircle,
  Sparkles,
  Square,
  TriangleAlert
} from '@repo/design-system/icons'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { RetrySiteImportForm } from './retry-site-import-form'
import { StudioProgressActivity, StudioProgressCaptures } from './studio-progress-activity'
import {
  parseStudioImportProgress,
  type StudioImportProgress,
  studioProgressGuidance,
  studioProgressPercent,
  studioQueueIsDelayed
} from './studio-progress-model'
import {
  currentStudioStepLabel,
  formatStudioElapsed,
  StudioConnectionBadge,
  type StudioConnectionMode,
  StudioCreationSteps
} from './studio-progress-status'
import { StudioStopGeneration } from './studio-stop-generation'

/** Show owner-friendly live recreation progress with Realtime updates and automatic polling backup. */
export function StudioCreationProgress({
  initialMessage,
  initialUpdatedAt,
  sourceType = 'website',
  siteId
}: {
  initialMessage?: string
  initialUpdatedAt: string
  sourceType?: 'figma' | 'website'
  siteId: string
}) {
  const router = useRouter()
  const terminalHandled = useRef(false)
  const refreshTimer = useRef<number | undefined>(undefined)
  const [now, setNow] = useState(0)
  const [connectionMode, setConnectionMode] = useState<StudioConnectionMode>('connecting')
  const [progress, setProgress] = useState<StudioImportProgress>(() => ({
    status: 'queued',
    message: initialMessage,
    stage: 'queued',
    current: 0,
    total: 0,
    createdAt: initialUpdatedAt,
    updatedAt: initialUpdatedAt,
    attempts: 0,
    workerAvailable: true,
    events: []
  }))

  const syncProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/studio/${encodeURIComponent(siteId)}/progress`, {
        cache: 'no-store'
      })
      if (!response.ok) throw new Error('Progress request failed')
      const next = parseStudioImportProgress(await response.json())
      if (!next) throw new Error('Progress response was incomplete')
      setProgress(next)
      if (
        !terminalHandled.current &&
        (next.status === 'ready' || next.status === 'published' || next.status === 'cancelled')
      ) {
        terminalHandled.current = true
        refreshTimer.current = window.setTimeout(() => router.refresh(), 1400)
      }
    } catch {
      setConnectionMode('fallback')
    }
  }, [router, siteId])

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
      .channel(`builder-import-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cr_builder_import_events',
          filter: `site_id=eq.${siteId}`
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
  }, [siteId, syncProgress])

  const percent = studioProgressPercent(progress)
  const elapsedMs = now > 0 ? Math.max(0, now - new Date(progress.createdAt).getTime()) : 0
  const pending = progress.status === 'queued' || progress.status === 'analyzing'
  const queueDelayed = studioQueueIsDelayed(progress, now)
  const completed = progress.status === 'ready' || progress.status === 'published'
  const failed = progress.status === 'failed'
  const cancelled = progress.status === 'cancelled'
  const headline = completed
    ? 'Your first version is ready'
    : cancelled
      ? 'Creation stopped'
      : failed
        ? 'Creation stopped safely'
        : queueDelayed
          ? sourceType === 'figma'
            ? 'Your Figma design is in the queue'
            : 'Your website is in the queue'
          : 'Building your first version'
  const message = completed
    ? 'Opening your private, editable preview…'
    : cancelled
      ? 'Nothing was published. Your reserved creation credits were returned.'
      : failed
        ? 'CodeRocket could not finish this website after several attempts. Nothing was published.'
        : queueDelayed
          ? 'CodeRocket is temporarily busy. Your request is saved and will start automatically.'
          : (progress.message ?? sourceType === 'figma')
            ? 'CodeRocket is reading the selected Figma screens and rebuilding them as editable sections.'
            : 'CodeRocket is studying the public website and rebuilding it as editable sections.'
  const guidance = studioProgressGuidance(progress, elapsedMs, sourceType)

  return (
    <section aria-busy={pending} className="border border-border bg-surface">
      <div className="border-border border-b p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StudioConnectionBadge mode={connectionMode} />
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="flex items-center gap-2 font-mono text-muted text-xs">
              <Clock3 aria-hidden className="h-3.5 w-3.5" />
              Working for {formatStudioElapsed(elapsedMs)}
            </span>
            {pending ? <StudioStopGeneration mode="creation" siteId={siteId} /> : null}
          </div>
        </div>
        <div className="mt-7 max-w-3xl">
          <div className="flex items-center gap-3">
            {completed ? (
              <span className="flex h-10 w-10 items-center justify-center border border-success text-success">
                <Check aria-hidden className="h-5 w-5" />
              </span>
            ) : cancelled ? (
              <span className="flex h-10 w-10 items-center justify-center border border-signal text-signal">
                <Square aria-hidden className="h-5 w-5" />
              </span>
            ) : failed ? (
              <span className="flex h-10 w-10 items-center justify-center border border-danger text-danger">
                <TriangleAlert aria-hidden className="h-5 w-5" />
              </span>
            ) : queueDelayed ? (
              <span className="flex h-10 w-10 items-center justify-center border border-signal text-signal">
                <Clock3 aria-hidden className="h-5 w-5" />
              </span>
            ) : (
              <span className="flex h-10 w-10 items-center justify-center border border-signal text-signal">
                <LoaderCircle
                  aria-hidden
                  className="h-5 w-5 animate-spin motion-reduce:animate-none"
                />
              </span>
            )}
            <h2 className="font-heading font-semibold text-3xl sm:text-4xl">{headline}</h2>
          </div>
          <p aria-live="polite" className="mt-4 text-muted leading-7">
            {message}
          </p>
          {pending ? (
            <div className="mt-5 flex gap-3 border border-border bg-background p-3">
              <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
              <div>
                <p className="font-semibold text-sm">Right now</p>
                <p className="mt-1 text-muted text-sm leading-6">{guidance}</p>
              </div>
            </div>
          ) : null}
          {failed ? <RetrySiteImportForm className="mt-6" siteId={siteId} /> : null}
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[.1em]">
            <span>
              {cancelled
                ? 'Stopped by you'
                : failed
                  ? 'Stopped safely'
                  : currentStudioStepLabel(percent, sourceType)}
            </span>
            <span className="text-muted">{percent}%</span>
          </div>
          <div
            aria-label="Website creation progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percent}
            className="mt-2 h-1.5 overflow-hidden bg-surface-raised"
            role="progressbar"
          >
            <span
              className={`block h-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                failed ? 'bg-danger' : 'bg-signal'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {failed || cancelled ? null : (
          <StudioCreationSteps percent={percent} sourceType={sourceType} />
        )}
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
        <StudioProgressCaptures
          events={progress.events}
          pending={pending}
          sourceType={sourceType}
        />
        <StudioProgressActivity events={progress.events} pending={pending} />
      </div>

      <p className="border-border border-t px-5 py-4 text-center text-muted text-sm sm:px-6">
        {cancelled
          ? 'Creation has stopped. You can start again whenever you are ready.'
          : 'You can leave this page. Creation continues safely in the background.'}
      </p>
    </section>
  )
}
