'use client'

import type { AiAudience, AiFindingAnalysis } from '@coderocket/ai/schema'
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  FileCode2,
  LoaderCircle,
  ShieldCheck
} from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'

interface AnalysisTask {
  progressMessage: string
  progressStage: string
  result: AiFindingAnalysis | null
  sources: Array<{ title: string; url: string }>
  status: 'failed' | 'queued' | 'running' | 'succeeded'
}

const audienceOptions: Array<{ value: AiAudience; label: string; detail: string }> = [
  {
    value: 'site_owner',
    label: 'For me',
    detail: 'Plain language and a clear next action.'
  },
  {
    value: 'freelancer',
    label: 'For a client',
    detail: 'A client-ready explanation and delivery plan.'
  },
  {
    value: 'developer',
    label: 'For a developer',
    detail: 'Technical diagnosis, likely files, and checks.'
  }
]

/** Let the user choose how an evidence-grounded explanation should be written. */
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
      <h3 className="font-heading font-semibold text-lg">Who should this help?</h3>
      <p className="mt-1 text-muted text-sm">The proof stays the same. Only the wording changes.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {audienceOptions.map(option => (
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

/** Present the saved explanation and its verification steps. */
export function AnalysisResult({ task }: { task: AnalysisTask }) {
  const result = task.result
  if (!result) return null

  async function copyBrief() {
    await navigator.clipboard.writeText(result?.brief ?? '')
    toast.success('Brief copied', {
      description: 'Paste it into an issue, email, or project task.'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{difficultyLabel(result.difficulty)}</Badge>
        <Badge variant="outline">{result.diagnosis.confidence} confidence</Badge>
        <span className="font-mono text-[10px] text-muted uppercase tracking-[.12em]">
          Checked against saved proof
        </span>
      </div>

      <section>
        <h3 className="font-heading font-semibold text-xl">{result.summary}</h3>
        <p className="mt-2 text-muted text-sm leading-6">{result.whyItMatters}</p>
      </section>

      <section className="grid gap-px border border-border bg-border sm:grid-cols-2">
        <div className="bg-background p-4">
          <p className="font-mono text-[10px] text-danger uppercase tracking-[.12em]">
            What we saw
          </p>
          <p className="mt-2 text-sm leading-6">{result.diagnosis.observed}</p>
        </div>
        <div className="bg-background p-4">
          <p className="font-mono text-[10px] text-success uppercase tracking-[.12em]">
            What should happen
          </p>
          <p className="mt-2 text-sm leading-6">{result.diagnosis.expected}</p>
        </div>
      </section>

      <section>
        <h3 className="font-heading font-semibold text-lg">Fix plan</h3>
        <ol className="mt-3 divide-y divide-border border border-border">
          {result.nextSteps.map((step, index) => (
            <li className="grid gap-3 p-4 sm:grid-cols-[2rem_1fr]" key={step.title}>
              <span className="flex h-8 w-8 items-center justify-center border border-accent font-mono text-accent text-xs">
                {index + 1}
              </span>
              <div>
                <h4 className="font-semibold text-sm">{step.title}</h4>
                <p className="mt-1 text-muted text-sm leading-6">{step.explanation}</p>
                <p className="mt-2 flex items-start gap-2 text-xs leading-5">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>
                    <strong>How to verify:</strong> {step.verification}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {result.likelyFiles.length > 0 ? (
        <section>
          <h3 className="flex items-center gap-2 font-heading font-semibold text-lg">
            <FileCode2 aria-hidden className="h-5 w-5 text-signal" /> Where to look
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.likelyFiles.map(file => (
              <li className="border border-border bg-background p-4" key={file.pattern}>
                <code className="break-all text-xs">{file.pattern}</code>
                <p className="mt-2 text-muted text-xs leading-5">{file.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading font-semibold text-lg">Shareable brief</h3>
          <CodeRocketButton onClick={copyBrief} size="sm" type="button" variant="ghost">
            <Clipboard aria-hidden /> Copy
          </CodeRocketButton>
        </div>
        <p className="mt-3 text-sm leading-6">{result.brief}</p>
      </section>

      {task.sources.length > 0 ? (
        <section>
          <h3 className="font-heading font-semibold text-sm">Official references</h3>
          <ul className="mt-2 space-y-2">
            {task.sources.map(source => (
              <li key={source.url}>
                <a
                  className="font-mono text-signal text-xs underline-offset-4 hover:underline"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex items-start gap-3 border border-success bg-success/10 p-4">
        <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <p className="text-sm leading-6">
          After the change, run a fresh CodeRocket check. The AI result never closes this problem by
          itself.
        </p>
      </div>
    </div>
  )
}

function difficultyLabel(value: 'quick' | 'moderate' | 'advanced'): string {
  if (value === 'quick') return 'Quick change'
  if (value === 'moderate') return 'Some work'
  return 'Advanced change'
}
