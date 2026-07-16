'use client'

import { Toaster, toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Info, LoaderCircle } from '../icons'

/** Mounts the shared, accessible CodeRocket notification viewport. */
export function CodeRocketToaster() {
  return (
    <Toaster
      closeButton
      duration={5000}
      expand
      icons={{
        error: <AlertTriangle aria-hidden className="h-5 w-5 text-danger" />,
        info: <Info aria-hidden className="h-5 w-5 text-signal" />,
        loading: <LoaderCircle aria-hidden className="h-5 w-5 animate-spin text-accent" />,
        success: <CheckCircle2 aria-hidden className="h-5 w-5 text-success" />
      }}
      position="bottom-right"
      theme="dark"
      toastOptions={{
        classNames: {
          actionButton: '!rounded-none !bg-accent !font-mono !font-semibold !text-white',
          cancelButton:
            '!rounded-none !border !border-border !bg-transparent !font-mono !text-foreground',
          closeButton:
            '!rounded-none !border-border !bg-surface-raised !text-foreground hover:!border-signal',
          description: '!text-muted !text-sm !leading-5',
          error: '!border-danger',
          info: '!border-signal',
          success: '!border-success',
          title: '!font-heading !font-semibold !text-foreground',
          toast:
            '!rounded-none !border !border-border !bg-surface-raised !text-foreground !shadow-2xl'
        }
      }}
      visibleToasts={4}
    />
  )
}

export { toast }
