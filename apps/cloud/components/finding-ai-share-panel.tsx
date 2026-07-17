'use client'

import { Bot, Check, Clipboard, Send, UserRound } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { useEffect, useRef, useState } from 'react'
import type { FindingResolutionCopy } from '@/lib/finding-resolution-copy'

type CopyKind = keyof FindingResolutionCopy

const COPY_SUCCESS: Record<CopyKind, { description: string; title: string }> = {
  assistantTask: {
    title: 'Assistant-ready task copied',
    description: 'Paste it into Codex, Claude, Cursor, or another coding assistant.'
  },
  clientBrief: {
    title: 'Client summary copied',
    description: 'It is ready to paste into an email, message, or client report.'
  },
  developerTask: {
    title: 'Developer task copied',
    description: 'It includes the evidence, implementation steps, and acceptance criteria.'
  },
  simpleExplanation: {
    title: 'Simple explanation copied',
    description: 'It is ready to save or share with a teammate.'
  }
}

/** Present clear copy actions for understanding, sharing, and implementation. */
export function FindingAiSharePanel({
  copy,
  primary = false
}: {
  copy: FindingResolutionCopy
  primary?: boolean
}) {
  const [copied, setCopied] = useState<CopyKind | null>(null)
  const resetTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
    },
    []
  )

  /** Copy one prepared format and confirm the action in context. */
  async function copyText(kind: CopyKind) {
    try {
      await navigator.clipboard.writeText(copy[kind])
      setCopied(kind)
      toast.success(COPY_SUCCESS[kind].title, {
        description: COPY_SUCCESS[kind].description
      })
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(null), 2_000)
    } catch {
      toast.error('Could not copy this text', {
        description: 'Your browser blocked clipboard access. Try again or allow clipboard access.'
      })
    }
  }

  if (primary) {
    return (
      <CodeRocketButton onClick={() => copyText('assistantTask')} type="button">
        {copied === 'assistantTask' ? <Check aria-hidden /> : <Bot aria-hidden />}
        <span aria-live="polite">
          {copied === 'assistantTask' ? 'Copied' : 'Copy for Codex, Claude or Cursor'}
        </span>
      </CodeRocketButton>
    )
  }

  return (
    <section aria-labelledby="share-handoff-title" className="border border-border bg-surface">
      <div className="border-border border-b p-5">
        <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">Ready to use</p>
        <h3 className="mt-2 font-heading font-semibold text-xl" id="share-handoff-title">
          Share or hand it off
        </h3>
        <p className="mt-1 text-muted text-sm leading-6">
          Choose the format that matches what you need to do next.
        </p>
      </div>
      <div className="grid gap-px bg-border lg:grid-cols-3">
        <CopyOption
          buttonLabel="Copy simple explanation"
          copied={copied === 'simpleExplanation'}
          description="Keep a plain-language summary for yourself or a teammate."
          icon={UserRound}
          label="Understand simply"
          onCopy={() => copyText('simpleExplanation')}
        />
        <CopyOption
          buttonLabel="Copy client summary"
          copied={copied === 'clientBrief'}
          description="Share the impact, recommended work, and expected result without technical noise."
          icon={Send}
          label="Present to a client"
          onCopy={() => copyText('clientBrief')}
        />
        <CopyOption
          buttonLabel="Copy developer task"
          copied={copied === 'developerTask'}
          description="Send the verified evidence, implementation steps, and acceptance criteria."
          icon={Bot}
          label="Hand off for a fix"
          onCopy={() => copyText('developerTask')}
        />
      </div>
    </section>
  )
}

/** Render one clearly labelled share or handoff format. */
function CopyOption({
  buttonLabel,
  copied,
  description,
  icon: Icon,
  label,
  onCopy
}: {
  buttonLabel: string
  copied: boolean
  description: string
  icon: typeof Clipboard
  label: string
  onCopy: () => void
}) {
  return (
    <article className="flex min-h-56 flex-col bg-background p-5">
      <Icon aria-hidden className="h-5 w-5 text-signal" />
      <h4 className="mt-4 font-heading font-semibold text-base">{label}</h4>
      <p className="mt-2 flex-1 text-muted text-xs leading-5">{description}</p>
      <CodeRocketButton
        className="mt-5 justify-center"
        onClick={onCopy}
        size="sm"
        type="button"
        variant="outline"
      >
        {copied ? <Check aria-hidden /> : <Clipboard aria-hidden />}
        <span aria-live="polite">{copied ? 'Copied' : buttonLabel}</span>
      </CodeRocketButton>
    </article>
  )
}
