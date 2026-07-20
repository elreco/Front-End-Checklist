'use client'

import { LoaderCircle, RotateCcw } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { useFormStatus } from 'react-dom'
import { retryBuilderSite } from './actions'

/** Restart one failed website while preventing accidental duplicate submissions. */
export function RetrySiteImportForm({
  className,
  secondary = false,
  siteId,
  sourceType = 'website'
}: {
  className?: string
  secondary?: boolean
  siteId: string
  sourceType?: 'figma' | 'website'
}) {
  return (
    <form action={retryBuilderSite} className={className}>
      <input name="siteId" type="hidden" value={siteId} />
      <RetrySiteImportButton secondary={secondary} sourceType={sourceType} />
    </form>
  )
}

function RetrySiteImportButton({
  secondary,
  sourceType
}: {
  secondary: boolean
  sourceType: 'figma' | 'website'
}) {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton
      aria-disabled={pending}
      disabled={pending}
      type="submit"
      variant={secondary ? 'outline' : 'primary'}
    >
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <RotateCcw aria-hidden />
      )}
      {pending
        ? 'Starting again…'
        : sourceType === 'figma'
          ? 'Try this design again'
          : 'Try this website again'}
    </CodeRocketButton>
  )
}
