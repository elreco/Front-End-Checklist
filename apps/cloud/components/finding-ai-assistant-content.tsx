'use client'

import type { AiAudience } from '@coderocket/ai/schema'
import { ArrowRight, LoaderCircle, ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { AI_AUDIENCE_OPTIONS } from './finding-ai-audience'

interface AnalysisTask {
  progressMessage: string
  progressStage: string
  status: 'failed' | 'queued' | 'running' | 'succeeded'
}

/** Let the user choose which included audience view should open first. */
export function AnalysisSetup({
  audience,
  error,
  loading,
  onAudienceChange,
  onSubmit,
  retry
}: {
  audience: AiAudience
  error: string
  loading: boolean
  onAudienceChange: (audience: AiAudience) => void
  onSubmit: () => void
  retry: boolean
}) {
  return (
    <div>
      <h3 className="font-heading font-semibold text-lg">Which view should open first?</h3>
      <p className="mt-1 text-muted text-sm leading-6">
        Every fix plan includes all 3 views. You can switch at any time after it is ready.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {AI_AUDIENCE_OPTIONS.map(option => (
          <button
            aria-pressed={audience === option.value}
            className={`min-h-28 cursor-pointer border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
              audience === option.value
                ? 'border-accent bg-accent/10'
                : 'border-border bg-background hover:border-signal'
            }`}
            key={option.value}
            onClick={() => onAudienceChange(option.value)}
            type="button"
          >
            <span className="font-semibold text-sm">{option.label}</span>
            <span className="mt-2 block text-muted text-xs leading-5">{option.detail}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-3 border border-border bg-background p-4">
        <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <p className="text-muted text-xs leading-5">
          Website text is treated as untrusted data, common credentials are removed, and the model
          receives no tool that can edit your site or repository.
        </p>
      </div>
      {error ? <p className="mt-4 text-danger text-sm">{error}</p> : null}
      <div className="mt-6 flex justify-end">
        <CodeRocketButton disabled={loading} onClick={onSubmit} type="button">
          {loading ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <ArrowRight aria-hidden />
          )}
          {loading ? 'Starting…' : retry ? 'Try again' : 'Prepare my fix plan'}
        </CodeRocketButton>
      </div>
    </div>
  )
}

/** Explain background progress while the user remains free to close the dialog. */
export function AnalysisProgress({ task }: { task: AnalysisTask }) {
  const activeStep = task.status === 'queued' ? 0 : task.progressStage === 'starting' ? 1 : 2
  const steps = [
    'Waiting for the secure worker',
    'Reading the proof and official rule',
    'Preparing practical steps and checks'
  ]
  return (
    <div className="py-8">
      <LoaderCircle aria-hidden className="h-8 w-8 animate-spin text-accent" />
      <h3 className="mt-5 font-heading font-semibold text-xl">Preparing your fix plan</h3>
      <p className="mt-2 text-muted text-sm">{task.progressMessage}</p>
      <p className="mt-1 text-muted text-xs">
        You can close this window. This problem’s button will show “Fix plan ready”, and CodeRocket
        will notify you when it finishes.
      </p>
      <ol className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-3">
        {steps.map((step, index) => (
          <li className="bg-background p-4" key={step}>
            <span
              className={`font-mono text-[10px] uppercase tracking-[.12em] ${index <= activeStep ? 'text-signal' : 'text-muted'}`}
            >
              {index < activeStep ? 'Done' : index === activeStep ? 'Now' : 'Next'}
            </span>
            <p className="mt-2 text-sm leading-5">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
