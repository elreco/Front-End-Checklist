'use client'

import { MessageSquareText, Monitor } from '@repo/design-system/icons'
import type { ReactNode } from 'react'
import { useState } from 'react'

type MobileStudioView = 'conversation' | 'preview'

/** Keep the prompt and preview in one viewport with an explicit mobile workspace switch. */
export function StudioAppLayout({
  conversation,
  preview
}: {
  conversation: ReactNode
  preview: ReactNode
}) {
  const [mobileView, setMobileView] = useState<MobileStudioView>('preview')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Studio view"
        className="grid shrink-0 grid-cols-2 border-border border-b bg-background lg:hidden"
        role="group"
      >
        <button
          aria-pressed={mobileView === 'conversation'}
          className={`flex min-h-11 items-center justify-center gap-1.5 border-border border-r text-xs ${
            mobileView === 'conversation'
              ? 'bg-surface-raised text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
          onClick={() => setMobileView('conversation')}
          type="button"
        >
          <MessageSquareText aria-hidden className="h-4 w-4" /> Ask CodeRocket
        </button>
        <button
          aria-pressed={mobileView === 'preview'}
          className={`flex min-h-11 items-center justify-center gap-1.5 text-xs ${
            mobileView === 'preview'
              ? 'bg-surface-raised text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
          onClick={() => setMobileView('preview')}
          type="button"
        >
          <Monitor aria-hidden className="h-4 w-4" /> Preview
        </button>
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div
          className={`${mobileView === 'conversation' ? 'flex' : 'hidden'} min-h-0 flex-col border-border bg-surface lg:flex lg:border-r`}
        >
          {conversation}
        </div>
        <div
          className={`${mobileView === 'preview' ? 'flex' : 'hidden'} min-h-0 flex-col bg-background-subtle lg:flex`}
        >
          {preview}
        </div>
      </div>
    </div>
  )
}
