'use client'

import { LoaderCircle, Square } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@repo/design-system/ui/dialog'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { cancelBuilderGeneration } from './generation-actions'

/** Confirm a generation stop while explaining exactly what remains safe. */
export function StudioStopGeneration({
  action = cancelBuilderGeneration,
  mode,
  siteId
}: {
  action?: (formData: FormData) => Promise<void>
  mode: 'change' | 'creation'
  siteId: string
}) {
  const [open, setOpen] = useState(false)
  const creation = mode === 'creation'
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <CodeRocketButton size="sm" type="button" variant="outline">
          <Square aria-hidden />
          {creation ? 'Stop creation' : 'Stop change'}
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent className="max-w-md" showClose>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {creation ? 'Stop creating this website?' : 'Stop this change?'}
          </DialogTitle>
          <DialogDescription className="leading-6">
            {creation
              ? 'CodeRocket will stop the current creation. Nothing will be published, and you can start again later.'
              : 'CodeRocket will stop this request. Your current website version will stay exactly as it is.'}
          </DialogDescription>
        </DialogHeader>
        <div className="border border-border bg-background px-4 py-3 text-muted text-sm leading-6">
          A step already in progress may take a few seconds to end, but it will not create a late
          version. Reserved creation credits will be returned.
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <CodeRocketButton variant="outline">
              {creation ? 'Keep creating' : 'Keep this change'}
            </CodeRocketButton>
          </DialogClose>
          <form action={action} className="w-full sm:w-auto">
            <input name="siteId" type="hidden" value={siteId} />
            <StopGenerationButton mode={mode} />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Prevent duplicate cancellation requests while the server confirms the terminal state. */
function StopGenerationButton({ mode }: { mode: 'change' | 'creation' }) {
  const { pending } = useFormStatus()
  return (
    <CodeRocketButton disabled={pending} fullWidth type="submit" variant="danger">
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <Square aria-hidden />
      )}
      {pending ? 'Stopping…' : mode === 'creation' ? 'Stop creation' : 'Stop change'}
    </CodeRocketButton>
  )
}
