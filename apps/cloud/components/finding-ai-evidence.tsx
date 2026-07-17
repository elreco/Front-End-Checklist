'use client'

import type { AiFindingAnalysis, LegacyAiFindingAnalysis } from '@coderocket/ai/schema'
import { CheckCircle2, FileCode2 } from '@repo/design-system/icons'

/** Display the immutable observed and expected evidence behind the guidance. */
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

/** Pair an action with its deterministic follow-up check. */
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

/** Link the authoritative sources stored with the generated guidance. */
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

/** Remind users that only a fresh deterministic check resolves the finding. */
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
