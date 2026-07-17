'use client'

import { Globe2 } from '@repo/design-system/icons'
import { useState } from 'react'

const sizeClasses = {
  card: 'h-28 w-full border-x-0 border-t-0',
  detail: 'h-20 w-32 sm:h-24 sm:w-40',
  row: 'h-14 w-20'
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

  return (
    <div
      aria-hidden
      className={`relative shrink-0 overflow-hidden border border-border bg-surface-raised ${sizeClasses[size]}`}
    >
      {imageUrl && failedUrl !== imageUrl ? (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          onError={() => setFailedUrl(imageUrl)}
          referrerPolicy="no-referrer"
          src={imageUrl}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,var(--cr-surface-raised),var(--cr-background))]">
          <Globe2 aria-hidden className="h-5 w-5 text-signal" />
          <span className="ml-2 font-heading font-semibold text-foreground-subtle text-sm">
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .flatMap(word => (word[0] ? [word[0]] : []))
    .join('')
    .toUpperCase()
}
