'use client'

import type { SiteDocument } from '@coderocket/core'
import { Monitor, Smartphone, Tablet } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { useState } from 'react'
import { SiteDocumentPreview } from '@/components/site-document-preview'

type PreviewViewport = 'desktop' | 'tablet' | 'mobile'

const previewWidths: Record<PreviewViewport, number | string> = {
  desktop: '100%',
  tablet: 768,
  mobile: 390
}

/** Let an owner review the recreated responsive layouts without exposing browser dimensions. */
export function StudioPreview({ document }: { document: SiteDocument }) {
  const [viewport, setViewport] = useState<PreviewViewport>('desktop')
  return (
    <div>
      <p className="border-border border-b bg-background p-3 text-muted text-xs sm:hidden">
        Phone preview
      </p>
      <div
        aria-label="Preview size"
        className="hidden flex-wrap items-center gap-2 border-border border-b bg-background p-3 sm:flex"
        role="group"
      >
        <span className="mr-1 text-muted text-xs">Preview:</span>
        <CodeRocketButton
          aria-pressed={viewport === 'desktop'}
          onClick={() => setViewport('desktop')}
          size="sm"
          type="button"
          variant={viewport === 'desktop' ? 'primary' : 'outline'}
        >
          <Monitor aria-hidden /> Computer
        </CodeRocketButton>
        <CodeRocketButton
          aria-pressed={viewport === 'tablet'}
          onClick={() => setViewport('tablet')}
          size="sm"
          type="button"
          variant={viewport === 'tablet' ? 'primary' : 'outline'}
        >
          <Tablet aria-hidden /> Tablet
        </CodeRocketButton>
        <CodeRocketButton
          aria-pressed={viewport === 'mobile'}
          onClick={() => setViewport('mobile')}
          size="sm"
          type="button"
          variant={viewport === 'mobile' ? 'primary' : 'outline'}
        >
          <Smartphone aria-hidden /> Phone
        </CodeRocketButton>
      </div>
      <div className="overflow-x-auto bg-background-subtle p-3 sm:p-5">
        <div
          className="mx-auto overflow-hidden border border-border bg-background transition-[width] duration-200 motion-reduce:transition-none"
          data-preview-frame
          style={{ maxWidth: '100%', width: previewWidths[viewport] }}
        >
          <SiteDocumentPreview document={document} />
        </div>
      </div>
    </div>
  )
}
