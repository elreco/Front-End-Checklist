'use client'

import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Send,
  ShieldCheck,
  UserRound
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'

interface AnalysisTask {
  progressMessage: string
  progressStage: string
  status: 'failed' | 'queued' | 'running' | 'succeeded'
}

/** Explain the useful outputs before starting one grounded analysis. */
export function AnalysisSetup({
  error,
  loading,
  onSubmit,
  retry
}: {
  error: string
  loading: boolean
  onSubmit: () => void
  retry: boolean
}) {
  return (
    <div>
      <h3 className="font-heading font-semibold text-lg">Get a clear way forward</h3>
      <p className="mt-1 text-muted text-sm leading-6">
        CodeRocket explains the saved proof in plain language, prepares practical steps, and makes
        the result easy to share or hand off.
      </p>
      <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-3">
        <SetupOutcome
          description="Start with a short explanation of the problem and its impact."
          icon={UserRound}
          title="Understand simply"
        />
        <SetupOutcome
          description="Copy a client-ready summary without technical noise."
          icon={Send}
          title="Share clearly"
        />
        <SetupOutcome
          description="Copy a structured task for a developer or coding assistant."
          icon={CheckCircle2}
          title="Hand off the fix"
        />
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
          {loading ? 'Starting…' : retry ? 'Try again' : 'Explain this problem'}
        </CodeRocketButton>
      </div>
    </div>
  )
}

/** Summarize one useful output before the analysis starts. */
function SetupOutcome({
  description,
  icon: Icon,
  title
}: {
  description: string
  icon: typeof UserRound
  title: string
}) {
  return (
    <div className="bg-background p-4">
      <Icon aria-hidden className="h-5 w-5 text-signal" />
      <p className="mt-3 font-semibold text-sm">{title}</p>
      <p className="mt-1 text-muted text-xs leading-5">{description}</p>
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
      <h3 className="mt-5 font-heading font-semibold text-xl">Preparing clear guidance</h3>
      <p className="mt-2 text-muted text-sm">{task.progressMessage}</p>
      <p className="mt-1 text-muted text-xs">
        You can close this window. This problem’s button will show “Guidance ready”, and CodeRocket
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
