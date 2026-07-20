'use client'

import { ArrowRight, LoaderCircle } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { useFormStatus } from 'react-dom'

/** Prevent duplicate creations while keeping the action understandable during a slow request. */
export function SiteCreationSubmit() {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton className="shrink-0" disabled={pending} size="lg" type="submit">
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : null}
      {pending ? 'Starting your website…' : 'Create my first version'}
      {pending ? null : <ArrowRight aria-hidden />}
    </CodeRocketButton>
  )
}
