'use client'

import { LoaderCircle, RotateCcw } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { useFormStatus } from 'react-dom'
import { retryBuilderSite } from './actions'

/** Restart one failed website while preventing accidental duplicate submissions. */
export function RetrySiteImportForm({
  className,
  secondary = false,
  siteId
}: {
  className?: string
  secondary?: boolean
  siteId: string
}) {
  return (
    <form action={retryBuilderSite} className={className}>
      <input name="siteId" type="hidden" value={siteId} />
      <RetrySiteImportButton secondary={secondary} />
    </form>
  )
}

function RetrySiteImportButton({ secondary }: { secondary: boolean }) {
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
      {pending ? 'Starting again…' : 'Try this website again'}
    </CodeRocketButton>
  )
}
