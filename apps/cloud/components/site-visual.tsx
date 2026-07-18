'use client'

import { Globe2 } from '@repo/design-system/icons'
import { useState } from 'react'

const sizeClasses = {
  card: 'h-28 w-full border-x-0 border-t-0',
  detail: 'h-20 w-32 sm:h-24 sm:w-40',
  row: 'h-14 w-20'
}

const imageDimensions = {
  card: { height: 112, width: 640 },
  detail: { height: 96, width: 160 },
  row: { height: 56, width: 80 }
}

/** Show a discovered social preview image with a stable branded fallback. */
export function SiteVisual({
  imageUrl,
  name,
  size
}: {
  imageUrl?: string
  name: string
  size: keyof typeof sizeClasses
}) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const dimensions = imageDimensions[size]
  const fallbackLabel = failedUrl ? 'Preview unavailable' : 'No preview image found'

  return (
    <div
      aria-hidden
      className={`relative shrink-0 overflow-hidden border border-border bg-surface-raised ${sizeClasses[size]}`}
      title={!imageUrl || failedUrl ? fallbackLabel : undefined}
    >
      {imageUrl && failedUrl !== imageUrl ? (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          fetchPriority={size === 'detail' ? 'high' : undefined}
          height={dimensions.height}
          loading={size === 'detail' ? 'eager' : 'lazy'}
          onError={() => setFailedUrl(imageUrl)}
          referrerPolicy="no-referrer"
          role="presentation"
          src={imageUrl}
          width={dimensions.width}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(135deg,var(--cr-surface-raised),var(--cr-background))] px-2 text-center">
          <span className="flex items-center justify-center">
            <Globe2 aria-hidden className="h-5 w-5 text-signal" />
            <span className="ml-2 font-heading font-semibold text-foreground-subtle text-sm">
              {getInitials(name)}
            </span>
          </span>
          {size === 'row' ? null : (
            <span className="mt-2 font-mono text-[9px] text-muted uppercase tracking-[.08em]">
              {fallbackLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Build a compact, deterministic fallback label from a website name. */
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .flatMap(word => (word[0] ? [word[0]] : []))
    .join('')
    .toUpperCase()
}
