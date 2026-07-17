'use client'

import type { AiFindingAnalysis, LegacyAiFindingAnalysis } from '@coderocket/ai/schema'
import { CheckCircle2, Clipboard, FileCode2 } from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'

/** Show plan difficulty, confidence, and the active presentation. */
export function ResultMeta({
  confidence,
  difficulty,
  viewLabel
}: {
  confidence: 'high' | 'medium' | 'low'
  difficulty: 'quick' | 'moderate' | 'advanced'
  viewLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">{difficultyLabel(difficulty)}</Badge>
      <Badge variant="outline">{confidence} confidence</Badge>
      <span className="font-mono text-[10px] text-muted uppercase tracking-[.12em]">
        {viewLabel} · checked against saved proof
      </span>
    </div>
  )
}

/** Display the immutable observed and expected evidence behind every view. */
export function Diagnosis({
  diagnosis
}: {
  diagnosis: AiFindingAnalysis['diagnosis'] | LegacyAiFindingAnalysis['diagnosis']
}) {
  return (
    <section className="grid gap-px border border-border bg-border sm:grid-cols-2">
      <div className="bg-background p-4">
        <p className="font-mono text-[10px] text-danger uppercase tracking-[.12em]">What we saw</p>
        <p className="mt-2 text-sm leading-6">{diagnosis.observed}</p>
      </div>
      <div className="bg-background p-4">
        <p className="font-mono text-[10px] text-success uppercase tracking-[.12em]">
          What should happen
        </p>
        <p className="mt-2 text-sm leading-6">{diagnosis.expected}</p>
      </div>
    </section>
  )
}

/** Pair every action with its deterministic follow-up check. */
export function Verification({ children }: { children: string }) {
  return (
    <p className="mt-2 flex items-start gap-2 text-xs leading-5">
      <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <span>
        <strong>How to verify:</strong> {children}
      </span>
    </p>
  )
}

/** Show evidence-supported file hints when technical detail is useful. */
export function LikelyFiles({
  files
}: {
  files: AiFindingAnalysis['likelyFiles'] | LegacyAiFindingAnalysis['likelyFiles']
}) {
  if (files.length === 0) return null
  return (
    <section>
      <h3 className="flex items-center gap-2 font-heading font-semibold text-lg">
        <FileCode2 aria-hidden className="h-5 w-5 text-signal" /> Where to look
      </h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {files.map(file => (
          <li className="border border-border bg-background p-4" key={file.pattern}>
            <code className="break-all text-xs">{file.pattern}</code>
            <p className="mt-2 text-muted text-xs leading-5">{file.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Render audience-specific copy with a contextual clipboard action. */
export function ShareableBrief({
  buttonLabel,
  onCopy,
  text
}: {
  buttonLabel: string
  onCopy: () => void
  text: string
}) {
  return (
    <section className="border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading font-semibold text-lg">Shareable brief</h3>
        <CodeRocketButton onClick={onCopy} size="sm" type="button" variant="ghost">
          <Clipboard aria-hidden /> {buttonLabel}
        </CodeRocketButton>
      </div>
      <p className="mt-3 text-sm leading-6">{text}</p>
    </section>
  )
}

/** Link the authoritative sources stored with the generated plan. */
export function References({ sources }: { sources: Array<{ title: string; url: string }> }) {
  if (sources.length === 0) return null
  return (
    <section>
      <h3 className="font-heading font-semibold text-sm">Official references</h3>
      <ul className="mt-2 space-y-2">
        {sources.map(source => (
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
  )
}

/** Remind users that only a fresh deterministic check can resolve the finding. */
export function FreshCheckNotice() {
  return (
    <div className="flex items-start gap-3 border border-success bg-background p-4">
      <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <p className="text-sm leading-6">
        After the change, run a fresh CodeRocket check. The AI result never closes this problem by
        itself.
      </p>
    </div>
  )
}

function difficultyLabel(value: 'quick' | 'moderate' | 'advanced'): string {
  if (value === 'quick') return 'Quick change'
  if (value === 'moderate') return 'Some work'
  return 'Advanced change'
}
