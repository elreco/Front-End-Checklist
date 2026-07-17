'use client'

import { type AiAudience, storedAiFindingAnalysisSchema } from '@coderocket/ai/schema'
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileSearch2,
  LoaderCircle
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@repo/design-system/ui/dialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { AnalysisProgress, AnalysisSetup } from './finding-ai-assistant-content'
import { AnalysisResult } from './finding-ai-assistant-result'

const taskSchema = z.object({
  id: z.string(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  audience: z.enum(['site_owner', 'freelancer', 'developer']),
  result: storedAiFindingAnalysisSchema.nullable(),
  error: z.string().nullable(),
  model: z.string(),
  promptVersion: z.string(),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })),
  chargedCredits: z.number(),
  progressStage: z.string(),
  progressMessage: z.string(),
  createdAt: z.string()
})

const responseSchema = z.object({
  configured: z.boolean(),
  task: taskSchema.nullable()
})

type AiTask = z.infer<typeof taskSchema>

/** Explain a deterministic finding without giving AI authority over its resolution state. */
export function FindingAiAssistant({
  findingId,
  findingTitle,
  occurrenceId,
  projectId
}: {
  findingId: string
  findingTitle: string
  occurrenceId: string
  projectId: string
}) {
  const [audience, setAudience] = useState<AiAudience>('site_owner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [task, setTask] = useState<AiTask | null>(null)
  const previousTaskIdRef = useRef<string | null>(null)
  const previousTaskStatusRef = useRef<AiTask['status'] | null>(null)
  const endpoint = useMemo(
    () => `/api/projects/${projectId}/findings/${findingId}/ai-analysis`,
    [findingId, projectId]
  )

  const loadTask = useCallback(async () => {
    const response = await fetch(`${endpoint}?occurrenceId=${encodeURIComponent(occurrenceId)}`)
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) throw new Error(readApiError(body))
    const parsed = responseSchema.parse(body)
    setTask(parsed.task)
    if (parsed.task) setAudience(parsed.task.audience)
    setError(parsed.configured ? '' : 'AI explanations need an OpenAI key on this deployment.')
  }, [endpoint, occurrenceId])

  useEffect(() => {
    setLoading(true)
    loadTask()
      .catch(cause => setError(toMessage(cause)))
      .finally(() => setLoading(false))
  }, [loadTask])

  useEffect(() => {
    if (!(task?.status === 'queued' || task?.status === 'running')) return
    const timer = window.setInterval(() => {
      loadTask().catch(cause => setError(toMessage(cause)))
    }, 2_000)
    return () => window.clearInterval(timer)
  }, [loadTask, task?.status])

  useEffect(() => {
    const currentTaskId = task?.id ?? null
    const currentStatus = task?.status ?? null
    if (currentTaskId !== previousTaskIdRef.current) {
      previousTaskIdRef.current = currentTaskId
      previousTaskStatusRef.current = currentStatus
      return
    }

    const previousStatus = previousTaskStatusRef.current
    if (
      (previousStatus === 'queued' || previousStatus === 'running') &&
      currentStatus === 'succeeded'
    ) {
      toast.success('Fix plan ready', {
        action: { label: 'Review', onClick: () => setOpen(true) },
        description: `“${findingTitle}” is ready to review.`
      })
    }
    if (
      (previousStatus === 'queued' || previousStatus === 'running') &&
      currentStatus === 'failed'
    ) {
      toast.error('Fix plan could not be prepared', {
        description: `Open “${findingTitle}” to try again.`
      })
    }
    previousTaskStatusRef.current = currentStatus
  }, [findingTitle, task?.id, task?.status])

  async function requestAnalysis(retry = false) {
    setError('')
    setLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audience,
          occurrenceId,
          ...(retry ? { retryId: crypto.randomUUID() } : {})
        })
      })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(readApiError(body))
      const parsed = responseSchema.parse(body)
      setTask(parsed.task)
      toast.success('Explanation started', {
        description:
          'You can close this window. This problem will show “Fix plan ready” when it finishes.'
      })
    } catch (cause) {
      const message = toMessage(cause)
      setError(message)
      toast.error('Explanation could not start', { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <CodeRocketButton
          aria-label={`${taskButtonLabel(task?.status)} for ${findingTitle}`}
          className={taskButtonClassName(task?.status)}
          data-ai-status={task?.status ?? 'not-started'}
          size="sm"
          variant={task ? 'outline' : 'secondary'}
        >
          <TaskButtonIcon status={task?.status} />
          <span aria-live="polite">{taskButtonLabel(task?.status)}</span>
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-none bg-surface p-0"
        showClose
      >
        <DialogHeader className="border-border border-b p-6 pr-14">
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] text-accent uppercase tracking-[.14em]">
            <FileSearch2 aria-hidden className="h-4 w-4" /> Evidence-grounded AI
          </div>
          <DialogTitle className="font-heading text-2xl">
            Understand it. Fix it. Check again.
          </DialogTitle>
          <DialogDescription className="max-w-2xl leading-6">
            CodeRocket uses the saved proof and the matching Front-End Checklist rule. AI can
            explain it once in owner, client, and developer views, but only a fresh website check
            can mark the problem fixed.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {task?.status === 'succeeded' && task.result ? (
            <AnalysisResult
              audience={audience}
              loading={loading}
              onAudienceChange={setAudience}
              onUpgrade={() => requestAnalysis(true)}
              task={task}
            />
          ) : task?.status === 'queued' || task?.status === 'running' ? (
            <AnalysisProgress task={task} />
          ) : (
            <AnalysisSetup
              audience={audience}
              error={error || userFacingTaskError(task?.error)}
              loading={loading}
              onAudienceChange={setAudience}
              onSubmit={() => requestAnalysis(task?.status === 'failed')}
              retry={task?.status === 'failed'}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function readApiError(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'error' in value) {
    const error = value.error
    if (typeof error === 'string') return error
  }
  return 'The AI assistant is temporarily unavailable.'
}

function toMessage(value: unknown): string {
  return value instanceof Error ? value.message : 'The AI assistant is temporarily unavailable.'
}

function userFacingTaskError(error: string | null | undefined): string {
  if (error?.includes('stored rule snapshot'))
    return 'This attempt used an outdated rule snapshot. Try again to start a fresh fix plan.'
  return error ? 'The AI assistant is temporarily unavailable. Try again in a moment.' : ''
}

function taskButtonLabel(status: AiTask['status'] | undefined): string {
  if (status === 'queued' || status === 'running') return 'Fix plan in progress'
  if (status === 'succeeded') return 'Fix plan ready'
  if (status === 'failed') return 'Try fix plan again'
  return 'Explain & plan a fix'
}

function taskButtonClassName(status: AiTask['status'] | undefined): string | undefined {
  if (status === 'queued' || status === 'running') return 'border-signal text-signal'
  if (status === 'succeeded') return 'border-success text-success'
  if (status === 'failed') return 'border-danger text-danger'
  return undefined
}

function TaskButtonIcon({ status }: { status: AiTask['status'] | undefined }) {
  if (status === 'queued' || status === 'running') {
    return <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
  }
  if (status === 'succeeded') return <CheckCircle2 aria-hidden className="text-success" />
  if (status === 'failed') return <AlertTriangle aria-hidden className="text-danger" />
  return <BrainCircuit aria-hidden />
}
