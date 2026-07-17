'use client'

import { Check, Copy } from '@repo/design-system/icons'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Writes text with a compatibility fallback for restricted embedded browsers. */
async function writeText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    return
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = value
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.append(textArea)
    textArea.select()
    const copied = document.execCommand('copy')
    textArea.remove()
    if (!copied) throw new Error('Copy command was rejected')
  }
}

/** Copies a documentation example and keeps feedback inside the code toolbar. */
export function DocsCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  const copy = useCallback(async () => {
    try {
      await writeText(value)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [value])

  return (
    <button
      aria-label={copied ? 'Code copied' : 'Copy code'}
      className="inline-flex min-h-11 items-center gap-2 border-border border-l px-3 font-mono text-[10px] text-muted uppercase tracking-[.1em] transition-colors hover:bg-surface-raised hover:text-foreground"
      onClick={copy}
      type="button"
    >
      {copied ? (
        <Check aria-hidden className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy aria-hidden className="h-3.5 w-3.5" />
      )}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
