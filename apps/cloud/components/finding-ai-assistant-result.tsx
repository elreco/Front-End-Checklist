'use client'

import type {
  AiAudience,
  AiFindingAnalysis,
  LegacyAiFindingAnalysis,
  StoredAiFindingAnalysis
} from '@coderocket/ai/schema'
import { LoaderCircle, Sparkles } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { AI_AUDIENCE_OPTIONS, aiAudienceLabel } from './finding-ai-audience'
import {
  Diagnosis,
  FreshCheckNotice,
  LikelyFiles,
  References,
  ResultMeta,
  ShareableBrief,
  Verification
} from './finding-ai-result-parts'

interface ResultTask {
  audience: AiAudience
  result: StoredAiFindingAnalysis | null
  sources: Array<{ title: string; url: string }>
}

/** Present a saved plan with switchable audience views and legacy-plan support. */
export function AnalysisResult({
  audience,
  loading,
  onAudienceChange,
  onUpgrade,
  task
}: {
  audience: AiAudience
  loading: boolean
  onAudienceChange: (audience: AiAudience) => void
  onUpgrade: () => void
  task: ResultTask
}) {
  const result = task.result
  if (!result) return null
  if (!isCurrentAnalysis(result)) {
    return (
      <LegacyAnalysisResult
        audience={task.audience}
        loading={loading}
        onUpgrade={onUpgrade}
        result={result}
        sources={task.sources}
      />
    )
  }
  return (
    <CurrentAnalysisResult
      audience={audience}
      onAudienceChange={onAudienceChange}
      result={result}
      sources={task.sources}
    />
  )
}

function CurrentAnalysisResult({
  audience,
  onAudienceChange,
  result,
  sources
}: {
  audience: AiAudience
  onAudienceChange: (audience: AiAudience) => void
  result: AiFindingAnalysis
  sources: ResultTask['sources']
}) {
  const presentation = result.presentations[audience]
  const audienceLabel = aiAudienceLabel(audience)

  async function copyBrief() {
    await navigator.clipboard.writeText(presentation.brief)
    toast.success(`${audienceLabel} brief copied`, {
      description: 'Paste it into an issue, email, or project task.'
    })
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="plan-view-title" className="border border-border bg-background p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="font-heading font-semibold text-base" id="plan-view-title">
              Choose your view
            </h3>
            <p className="mt-1 text-muted text-xs leading-5">
              Same evidence and fix plan. Switch the wording whenever you need.
            </p>
          </div>
          <span className="mt-2 w-fit border border-border px-2.5 py-1 font-mono text-[10px] text-accent uppercase tracking-[.1em] sm:mt-0">
            3 views included
          </span>
        </div>
        <div aria-label="Fix plan audience" className="mt-4 grid gap-px bg-border sm:grid-cols-3">
          {AI_AUDIENCE_OPTIONS.map(option => (
            <button
              aria-pressed={audience === option.value}
              className={`min-h-12 cursor-pointer bg-surface px-4 py-3 text-left font-semibold text-sm transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                audience === option.value
                  ? 'text-accent shadow-[inset_0_-2px_0_var(--accent)]'
                  : 'text-muted hover:bg-surface-raised hover:text-foreground'
              }`}
              key={option.value}
              onClick={() => onAudienceChange(option.value)}
              type="button"
            >
              {option.shortLabel}
            </button>
          ))}
        </div>
      </section>

      <ResultMeta
        confidence={result.diagnosis.confidence}
        difficulty={result.difficulty}
        viewLabel={`${audienceLabel} view`}
      />
      <section aria-live="polite">
        <h3 className="font-heading font-semibold text-xl">{presentation.summary}</h3>
        <p className="mt-2 text-muted text-sm leading-6">{presentation.whyItMatters}</p>
      </section>
      <Diagnosis diagnosis={result.diagnosis} />

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
                <p className="mt-1 text-muted text-sm leading-6">{step.guidance[audience]}</p>
                <Verification>{step.verification}</Verification>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {audience === 'developer' ? <LikelyFiles files={result.likelyFiles} /> : null}
      <ShareableBrief
        buttonLabel={`Copy ${audienceLabel.toLowerCase()} brief`}
        onCopy={copyBrief}
        text={presentation.brief}
      />
      <References sources={sources} />
      <FreshCheckNotice />
    </div>
  )
}

function LegacyAnalysisResult({
  audience,
  loading,
  onUpgrade,
  result,
  sources
}: {
  audience: AiAudience
  loading: boolean
  onUpgrade: () => void
  result: LegacyAiFindingAnalysis
  sources: ResultTask['sources']
}) {
  async function copyBrief() {
    await navigator.clipboard.writeText(result.brief)
    toast.success('Brief copied', {
      description: 'Paste it into an issue, email, or project task.'
    })
  }

  return (
    <div className="space-y-6">
      <section className="border border-accent bg-background p-4">
        <div className="flex items-start gap-3">
          <Sparkles aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-base">Add all 3 audience views</h3>
            <p className="mt-1 text-muted text-xs leading-5">
              This saved plan only contains the {aiAudienceLabel(audience).toLowerCase()} view.
              Prepare the new format to switch between owner, client, and developer wording.
            </p>
            <p className="mt-2 text-[11px] text-muted leading-5">
              Preparing the upgraded plan creates a new AI result and uses AI credits.
            </p>
            <CodeRocketButton
              className="mt-3"
              disabled={loading}
              onClick={onUpgrade}
              size="sm"
              type="button"
            >
              {loading ? (
                <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles aria-hidden />
              )}
              {loading ? 'Starting…' : 'Add all 3 views'}
            </CodeRocketButton>
          </div>
        </div>
      </section>
      <ResultMeta
        confidence={result.diagnosis.confidence}
        difficulty={result.difficulty}
        viewLabel={`${aiAudienceLabel(audience)} view`}
      />
      <section>
        <h3 className="font-heading font-semibold text-xl">{result.summary}</h3>
        <p className="mt-2 text-muted text-sm leading-6">{result.whyItMatters}</p>
      </section>
      <Diagnosis diagnosis={result.diagnosis} />
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
                <Verification>{step.verification}</Verification>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <LikelyFiles files={result.likelyFiles} />
      <ShareableBrief buttonLabel="Copy brief" onCopy={copyBrief} text={result.brief} />
      <References sources={sources} />
      <FreshCheckNotice />
    </div>
  )
}

function isCurrentAnalysis(result: StoredAiFindingAnalysis): result is AiFindingAnalysis {
  return 'version' in result && result.version === 2
}
