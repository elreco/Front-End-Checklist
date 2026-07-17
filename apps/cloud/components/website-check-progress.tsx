'use client'

import type { CheckProgressStage } from '@coderocket/core'
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  GitCompareArrows,
  Globe2,
  LoaderCircle,
  Radio,
  Square,
  TriangleAlert,
  WifiOff
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@repo/design-system/ui/dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { ProjectCheckProgress } from '@/lib/project-data'

interface LiveCheckProgress extends ProjectCheckProgress {
  workerAvailable?: boolean
}

const steps = [
  { label: 'Getting ready', icon: Radio },
  { label: 'Checking pages', icon: Globe2 },
  { label: 'Finding changes', icon: GitCompareArrows },
  { label: 'Updating results', icon: FileCheck2 }
]

/** Show durable near-real-time progress for one asynchronous website check. */
export function WebsiteCheckProgress({
  initial,
  projectId,
  siteUrl
}: {
  initial: ProjectCheckProgress
  projectId: string
  siteUrl: string
}) {
  const router = useRouter()
  const [progress, setProgress] = useState<LiveCheckProgress>(initial)
  const [now, setNow] = useState(0)
  const [connectionIssue, setConnectionIssue] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const terminalHandled = useRef(false)

  useEffect(() => {
    setNow(Date.now())
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      let delay = 2000
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/check-status?job=${encodeURIComponent(initial.id)}`,
          { cache: 'no-store' }
        )
        if (!response.ok) throw new Error('Progress request failed')
        const next = parseProgress(await response.json(), initial)
        if (stopped || !next) return
        setProgress(next)
        setConnectionIssue(false)
        if (
          next.status === 'succeeded' ||
          next.status === 'failed' ||
          next.status === 'cancelled'
        ) {
          if (!terminalHandled.current) {
            terminalHandled.current = true
            if (next.status === 'succeeded')
              toast.success('Website check complete', {
                description: 'The latest results are now available on this page.'
              })
            else if (next.status === 'failed')
              toast.error('Website check could not finish', {
                description: 'The check stopped after three attempts. Start it again when ready.'
              })
            else
              toast.info('Website check cancelled', {
                description: 'Your previous saved results have not changed.'
              })
            router.refresh()
          }
          return
        }
      } catch {
        if (!stopped) {
          setConnectionIssue(true)
          delay = 4000
        }
      }
      if (!stopped) timer = setTimeout(poll, delay)
    }

    void poll()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [initial, projectId, router])

  const elapsedMs = now > 0 ? Math.max(0, now - new Date(progress.createdAt).getTime()) : 0
  const unavailable =
    progress.workerAvailable === false &&
    (progress.status === 'queued' || progress.status === 'leased') &&
    elapsedMs > 15_000
  const percent = progressPercent(progress)
  const activeStep = activeStepIndex(progress.stage)
  const canCancel =
    (progress.status === 'queued' || progress.status === 'leased') &&
    progress.stage !== 'saving' &&
    progress.stage !== 'completed'
  const statusMessage = unavailable
    ? 'The checking service is not responding. Your request is safe in the queue.'
    : connectionIssue
      ? 'Reconnecting to live progress…'
      : progress.message

  const cancelCheck = async () => {
    setCancelling(true)
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/check-status?job=${encodeURIComponent(progress.id)}`,
        { method: 'DELETE' }
      )
      const result: unknown = await response.json()
      if (!response.ok) {
        const message =
          isRecord(result) && typeof result.error === 'string'
            ? result.error
            : 'The website check could not be cancelled.'
        throw new Error(message)
      }
      terminalHandled.current = true
      setProgress(current => ({
        ...current,
        status: 'cancelled',
        stage: 'completed',
        message: 'Check cancelled by you.',
        updatedAt: new Date().toISOString()
      }))
      setCancelDialogOpen(false)
      toast.success('Website check cancelled', {
        description: 'Your previous saved results have not changed.'
      })
      router.refresh()
    } catch (error) {
      toast.error('Could not cancel this check', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div
      aria-busy={progress.status === 'queued' || progress.status === 'leased'}
      className="min-w-0"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 border border-signal px-2.5 py-1 font-mono text-[10px] text-signal uppercase tracking-[.1em]">
              <span className="h-1.5 w-1.5 animate-pulse bg-signal motion-reduce:animate-none" />
              Live website check
            </span>
            <span className="font-mono text-muted text-xs">
              Running for {formatElapsed(elapsedMs)}
            </span>
          </div>
          <h2 className="mt-4 font-heading font-semibold text-2xl">
            {unavailable ? 'Your check is waiting safely' : 'Your website is being checked'}
          </h2>
          <p className="mt-2 max-w-3xl text-muted leading-7">
            CodeRocket opens each public page safely, checks the important website basics, then
            compares the result with the previous complete check.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canCancel ? (
            <CodeRocketButton
              className="border-danger text-danger hover:border-danger hover:bg-danger/10"
              onClick={() => setCancelDialogOpen(true)}
              size="sm"
              variant="outline"
            >
              <Square aria-hidden /> Cancel check
            </CodeRocketButton>
          ) : null}
          <CodeRocketButton asChild size="sm" variant="outline">
            <a href={siteUrl} rel="noreferrer" target="_blank">
              Visit site <ExternalLink aria-hidden />
            </a>
          </CodeRocketButton>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[.08em]">
          <span>{stageLabel(progress.stage)}</span>
          <span className="text-muted">{Math.round(percent)}%</span>
        </div>
        <div
          aria-label="Website check progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(percent)}
          className="mt-2 h-1.5 overflow-hidden bg-surface-raised"
          role="progressbar"
        >
          <span
            className="block h-full bg-signal transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-4">
        {steps.map(({ icon: Icon, label }, index) => {
          const complete = index < activeStep || progress.stage === 'completed'
          const active = index === activeStep && progress.stage !== 'completed'
          return (
            <li
              className={`flex items-center gap-3 bg-background px-4 py-3 font-mono text-xs ${
                active || complete ? 'text-foreground' : 'text-muted'
              }`}
              key={label}
            >
              {complete ? (
                <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
              ) : active ? (
                <LoaderCircle
                  aria-hidden
                  className="h-4 w-4 animate-spin text-signal motion-reduce:animate-none"
                />
              ) : (
                <Icon aria-hidden className="h-4 w-4" />
              )}
              {label}
            </li>
          )
        })}
      </ol>

      <div
        className={`mt-4 flex flex-col justify-between gap-3 border px-4 py-3 sm:flex-row sm:items-center ${
          unavailable ? 'border-warning bg-warning/10' : 'border-border bg-background'
        }`}
      >
        <div className="flex items-start gap-3">
          {unavailable ? (
            <WifiOff aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          ) : progress.stage === 'retrying' ? (
            <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          ) : (
            <LoaderCircle
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-signal motion-reduce:animate-none"
            />
          )}
          <p aria-live="polite" className="text-sm" role="status">
            {statusMessage}
          </p>
        </div>
        <span className="shrink-0 font-mono text-muted text-xs">
          {progress.current}/{progress.total} pages
        </span>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md" showClose={!cancelling}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Cancel this website check?</DialogTitle>
            <DialogDescription className="leading-6">
              CodeRocket will stop the current check. Your previous checks and saved results will
              stay exactly as they are.
            </DialogDescription>
          </DialogHeader>
          <div className="border border-border bg-background px-4 py-3 text-muted text-sm leading-6">
            If a page is already being read, that request may finish, but its result will not be
            saved.
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <CodeRocketButton disabled={cancelling} variant="outline">
                Keep checking
              </CodeRocketButton>
            </DialogClose>
            <CodeRocketButton disabled={cancelling} onClick={cancelCheck} variant="danger">
              {cancelling ? (
                <LoaderCircle aria-hidden className="animate-spin" />
              ) : (
                <Square aria-hidden />
              )}
              {cancelling ? 'Cancelling…' : 'Cancel check'}
            </CodeRocketButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function activeStepIndex(stage: CheckProgressStage): number {
  if (stage === 'checking_pages') return 1
  if (stage === 'comparing') return 2
  if (stage === 'saving' || stage === 'completed') return 3
  return 0
}

function progressPercent(progress: LiveCheckProgress): number {
  if (progress.status === 'cancelled') return 0
  if (progress.stage === 'completed' || progress.status === 'succeeded') return 100
  if (progress.stage === 'saving') return 92
  if (progress.stage === 'comparing') return 80
  if (progress.stage === 'checking_pages')
    return 12 + (progress.current / Math.max(1, progress.total)) * 62
  if (progress.stage === 'starting') return 8
  return 3
}

function stageLabel(stage: CheckProgressStage): string {
  if (stage === 'checking_pages') return 'Checking each selected page'
  if (stage === 'comparing') return 'Looking for changes'
  if (stage === 'saving') return 'Updating your dashboard'
  if (stage === 'retrying') return 'Trying again automatically'
  if (stage === 'completed') return 'Complete'
  if (stage === 'starting') return 'Preparing a safe check'
  return 'Waiting to start'
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseProgress(value: unknown, fallback: ProjectCheckProgress): LiveCheckProgress | null {
  if (!isRecord(value) || typeof value.status !== 'string') return null
  const status =
    value.status === 'leased' ||
    value.status === 'succeeded' ||
    value.status === 'failed' ||
    value.status === 'cancelled'
      ? value.status
      : 'queued'
  return {
    id: typeof value.id === 'string' ? value.id : fallback.id,
    status,
    stage: parseStage(value.stage),
    current: typeof value.current === 'number' ? value.current : fallback.current,
    total: typeof value.total === 'number' && value.total > 0 ? value.total : fallback.total,
    message: typeof value.message === 'string' ? value.message : fallback.message,
    attempts: typeof value.attempts === 'number' ? value.attempts : fallback.attempts,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : fallback.createdAt,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : fallback.updatedAt,
    workerAvailable: typeof value.workerAvailable === 'boolean' ? value.workerAvailable : undefined
  }
}

function parseStage(value: unknown): CheckProgressStage {
  return value === 'starting' ||
    value === 'checking_pages' ||
    value === 'comparing' ||
    value === 'saving' ||
    value === 'retrying' ||
    value === 'completed'
    ? value
    : 'queued'
}
