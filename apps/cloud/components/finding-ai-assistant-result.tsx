'use client'

import type {
  AiFindingAnalysis,
  LegacyAiFindingAnalysis,
  StoredAiFindingAnalysis
} from '@coderocket/ai/schema'
import { Wrench } from '@repo/design-system/icons'
import { buildFindingResolutionCopy } from '@/lib/finding-resolution-copy'
import {
  Diagnosis,
  FreshCheckNotice,
  LikelyFiles,
  References,
  Verification
} from './finding-ai-evidence'
import { ResultMeta } from './finding-ai-result-parts'
import { FindingAiSharePanel } from './finding-ai-share-panel'

interface ResultTask {
  result: StoredAiFindingAnalysis | null
  sources: Array<{ title: string; url: string }>
}

/** Present one clear resolution path with optional share and handoff formats. */
export function AnalysisResult({ findingTitle, task }: { findingTitle: string; task: ResultTask }) {
  const result = task.result
  if (!result) return null
  const copy = buildFindingResolutionCopy({
    findingTitle,
    result,
    sources: task.sources
  })

  return isCurrentAnalysis(result) ? (
    <CurrentAnalysisResult copy={copy} result={result} sources={task.sources} />
  ) : (
    <LegacyAnalysisResult copy={copy} result={result} sources={task.sources} />
  )
}

/** Render a current analysis with the plain-language presentation first. */
function CurrentAnalysisResult({
  copy,
  result,
  sources
}: {
  copy: ReturnType<typeof buildFindingResolutionCopy>
  result: AiFindingAnalysis
  sources: ResultTask['sources']
}) {
  const presentation = result.presentations.site_owner

  return (
    <div className="space-y-6">
      <ResolutionAction copy={copy} difficulty={result.difficulty} />
      <ResultMeta confidence={result.diagnosis.confidence} difficulty={result.difficulty} />
      <section aria-live="polite">
        <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">In short</p>
        <h3 className="mt-2 font-heading font-semibold text-xl">{presentation.summary}</h3>
        <p className="mt-2 text-muted text-sm leading-6">{presentation.whyItMatters}</p>
      </section>

      <section>
        <h3 className="font-heading font-semibold text-lg">What to do</h3>
        <ol className="mt-3 divide-y divide-border border border-border">
          {result.nextSteps.map((step, index) => (
            <li className="grid gap-3 p-4 sm:grid-cols-[2rem_1fr]" key={step.title}>
              <span className="flex h-8 w-8 items-center justify-center border border-accent font-mono text-accent text-xs">
                {index + 1}
              </span>
              <div>
                <h4 className="font-semibold text-sm">{step.title}</h4>
                <p className="mt-1 text-muted text-sm leading-6">{step.guidance.site_owner}</p>
                <Verification>{step.verification}</Verification>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <TechnicalDetails diagnosis={result.diagnosis} files={result.likelyFiles} />
      <FindingAiSharePanel copy={copy} />
      <References sources={sources} />
      <FreshCheckNotice />
    </div>
  )
}

/** Render saved legacy analyses through the same simplified experience. */
function LegacyAnalysisResult({
  copy,
  result,
  sources
}: {
  copy: ReturnType<typeof buildFindingResolutionCopy>
  result: LegacyAiFindingAnalysis
  sources: ResultTask['sources']
}) {
  return (
    <div className="space-y-6">
      <ResolutionAction copy={copy} difficulty={result.difficulty} />
      <ResultMeta confidence={result.diagnosis.confidence} difficulty={result.difficulty} />
      <section>
        <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">In short</p>
        <h3 className="mt-2 font-heading font-semibold text-xl">{result.summary}</h3>
        <p className="mt-2 text-muted text-sm leading-6">{result.whyItMatters}</p>
      </section>
      <section>
        <h3 className="font-heading font-semibold text-lg">What to do</h3>
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
      <TechnicalDetails diagnosis={result.diagnosis} files={result.likelyFiles} />
      <FindingAiSharePanel copy={copy} />
      <References sources={sources} />
      <FreshCheckNotice />
    </div>
  )
}

/** Present the recommended next action and its assistant-ready copy action. */
function ResolutionAction({
  copy,
  difficulty
}: {
  copy: ReturnType<typeof buildFindingResolutionCopy>
  difficulty: 'quick' | 'moderate' | 'advanced'
}) {
  const content = fixabilityContent(difficulty)
  return (
    <section className="border border-accent bg-background p-5">
      <div className="flex items-start gap-3">
        <Wrench aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] text-accent uppercase tracking-[.14em]">
            Recommended next step
          </p>
          <h3 className="mt-2 font-heading font-semibold text-lg">{content.title}</h3>
          <p className="mt-1 max-w-2xl text-muted text-sm leading-6">{content.description}</p>
          <div className="mt-4">
            <FindingAiSharePanel copy={copy} primary />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Keep supporting technical evidence available without dominating the flow. */
function TechnicalDetails({
  diagnosis,
  files
}: {
  diagnosis: AiFindingAnalysis['diagnosis'] | LegacyAiFindingAnalysis['diagnosis']
  files: AiFindingAnalysis['likelyFiles'] | LegacyAiFindingAnalysis['likelyFiles']
}) {
  return (
    <details className="border border-border bg-background">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-sm transition-colors hover:bg-surface-raised">
        See the technical proof
      </summary>
      <div className="space-y-5 border-border border-t p-4">
        <Diagnosis diagnosis={diagnosis} />
        <LikelyFiles files={files} />
      </div>
    </details>
  )
}

/** Explain the amount of implementation help that is likely to be needed. */
function fixabilityContent(difficulty: 'quick' | 'moderate' | 'advanced'): {
  description: string
  title: string
} {
  if (difficulty === 'quick') {
    return {
      title: 'A straightforward change is ready to hand off',
      description:
        'Copy the complete task into a coding assistant or send it to a developer. Review the change, then check the website again.'
    }
  }
  if (difficulty === 'moderate') {
    return {
      title: 'Developer help is recommended',
      description:
        'The task is ready to hand off, but the implementation needs repository context and a human review before it is published.'
    }
  }
  return {
    title: 'Specialist review is recommended',
    description:
      'CodeRocket has prepared the evidence and acceptance criteria. A developer should inspect the wider implementation before changing it.'
  }
}

/** Detect the current stored analysis schema. */
function isCurrentAnalysis(result: StoredAiFindingAnalysis): result is AiFindingAnalysis {
  return 'version' in result && result.version === 2
}
