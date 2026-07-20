'use client'

import {
  Check,
  Clock3,
  FileCheck2,
  Globe2,
  LayoutTemplate,
  LoaderCircle,
  Radio,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  WifiOff
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { StudioProgressActivity, StudioProgressCaptures } from './studio-progress-activity'
import {
  parseStudioImportProgress,
  type StudioImportProgress,
  studioProgressPercent
} from './studio-progress-model'

const creationSteps = [
  { label: 'Getting ready', threshold: 3, icon: Clock3 },
  { label: 'Opening the website', threshold: 15, icon: Globe2 },
  { label: 'Understanding the design', threshold: 38, icon: Sparkles },
  { label: 'Recreating the pages', threshold: 55, icon: LayoutTemplate },
  { label: 'Preparing your preview', threshold: 90, icon: FileCheck2 }
]

type ConnectionMode = 'connecting' | 'live' | 'fallback'

/** Show owner-friendly live recreation progress with Realtime updates and automatic polling backup. */
export function StudioCreationProgress({
  initialMessage,
  initialUpdatedAt,
  siteId,
  sourceUrl
}: {
  initialMessage?: string
  initialUpdatedAt: string
  siteId: string
  sourceUrl: string
}) {
  const router = useRouter()
  const terminalHandled = useRef(false)
  const refreshTimer = useRef<number | undefined>(undefined)
  const [now, setNow] = useState(0)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('connecting')
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
      if (!terminalHandled.current && (next.status === 'ready' || next.status === 'published')) {
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
  const unavailable = pending && !progress.workerAvailable && elapsedMs > 15_000
  const completed = progress.status === 'ready' || progress.status === 'published'
  const failed = progress.status === 'failed'
  const headline = completed
    ? 'Your first version is ready'
    : failed
      ? 'Creation stopped safely'
      : unavailable
        ? 'Your creation is waiting safely'
        : 'Creating your first version'
  const message = completed
    ? 'Opening your private, editable preview…'
    : failed
      ? 'CodeRocket could not finish this website after several attempts. Nothing was published.'
      : unavailable
        ? 'The creation service is not responding yet. Your request is saved and will start automatically.'
        : (progress.message ??
          'CodeRocket is studying the public website and rebuilding it as editable sections.')

  return (
    <section aria-busy={pending} className="border border-border bg-surface">
      <div className="border-border border-b p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ConnectionBadge mode={connectionMode} />
          <span className="flex items-center gap-2 font-mono text-muted text-xs">
            <Clock3 aria-hidden className="h-3.5 w-3.5" />
            {formatElapsed(elapsedMs)}
          </span>
        </div>
        <div className="mt-7 max-w-3xl">
          <div className="flex items-center gap-3">
            {completed ? (
              <span className="flex h-10 w-10 items-center justify-center border border-success text-success">
                <Check aria-hidden className="h-5 w-5" />
              </span>
            ) : failed ? (
              <span className="flex h-10 w-10 items-center justify-center border border-danger text-danger">
                <TriangleAlert aria-hidden className="h-5 w-5" />
              </span>
            ) : unavailable ? (
              <span className="flex h-10 w-10 items-center justify-center border border-warning text-warning">
                <WifiOff aria-hidden className="h-5 w-5" />
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
          {failed ? (
            <CodeRocketButton asChild className="mt-6">
              <Link href={`/create?url=${encodeURIComponent(sourceUrl)}`}>
                <RotateCcw aria-hidden /> Try another public page
              </Link>
            </CodeRocketButton>
          ) : null}
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[.1em]">
            <span>{failed ? 'Stopped safely' : currentStepLabel(percent)}</span>
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

        {failed ? null : <CreationSteps percent={percent} />}
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
        <StudioProgressCaptures events={progress.events} pending={pending} />
        <StudioProgressActivity events={progress.events} pending={pending} />
      </div>

      <p className="border-border border-t px-5 py-4 text-center text-muted text-sm sm:px-6">
        You can leave this page. Creation continues safely in the background.
      </p>
    </section>
  )
}

function CreationSteps({ percent }: { percent: number }) {
  const activeIndex = activeStepIndex(percent)
  return (
    <ol className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-5">
      {creationSteps.map(({ icon: Icon, label }, index) => {
        const complete = index < activeIndex || percent === 100
        const active = index === activeIndex && percent < 100
        return (
          <li
            className={`flex items-center gap-2 bg-background px-3 py-3 font-mono text-[10px] uppercase tracking-[.06em] ${
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
              <Icon aria-hidden className="h-3.5 w-3.5" />
            )}
            {label}
          </li>
        )
      })}
    </ol>
  )
}

function ConnectionBadge({ mode }: { mode: ConnectionMode }) {
  const live = mode === 'live'
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.12em] ${
        live ? 'border-signal text-signal' : 'border-border text-muted'
      }`}
    >
      <Radio
        aria-hidden
        className={`h-3.5 w-3.5 ${live ? 'animate-pulse motion-reduce:animate-none' : ''}`}
      />
      {live ? 'Live creation' : mode === 'connecting' ? 'Connecting' : 'Updating automatically'}
    </span>
  )
}

function currentStepLabel(percent: number): string {
  return creationSteps[activeStepIndex(percent)]?.label ?? creationSteps[0].label
}

function activeStepIndex(percent: number): number {
  return creationSteps.reduce(
    (activeIndex, step, index) => (percent >= step.threshold ? index : activeIndex),
    0
  )
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`
}
