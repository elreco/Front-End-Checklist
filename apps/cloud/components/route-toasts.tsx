'use client'

import { toast } from '@repo/design-system/ui/coderocket-toast'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

type ToastKind = 'error' | 'info' | 'success'

type ToastMessage = {
  description: string
  kind: ToastKind
  title: string
}

const notices: Record<string, ToastMessage> = {
  'invalid-name': {
    description: 'Enter a display name between 1 and 80 characters.',
    kind: 'error',
    title: 'Check the display name'
  },
  saved: {
    description: 'Your CodeRocket profile now uses the new display name.',
    kind: 'success',
    title: 'Profile updated'
  },
  'save-failed': {
    description: 'Nothing was changed. Please try saving again.',
    kind: 'error',
    title: 'Profile could not be updated'
  }
}

/** Turns safe redirect codes into consistent toasts without leaving stale query parameters. */
export function RouteToasts() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const handledKey = useRef('')

  useEffect(() => {
    const notice = searchParams.get('notice')
    const authError = searchParams.get('error')
    const checkout = searchParams.get('checkout')
    const key = `${pathname}:${notice ?? ''}:${authError ?? ''}:${checkout ?? ''}`
    if (handledKey.current === key) return
    handledKey.current = key

    if (notice && notices[notice]) showToast(notices[notice])
    if (authError === 'callback') {
      showToast({
        description: 'The link may have expired. Start a new sign-in attempt and try again.',
        kind: 'error',
        title: 'Sign-in could not be verified'
      })
    }
    if (checkout === 'success') {
      showToast({
        description: 'Your plan will update as soon as Stripe confirms the subscription.',
        kind: 'success',
        title: 'Payment received'
      })
    }
    if (checkout === 'cancelled') {
      showToast({
        description: 'No payment was taken and your current plan is unchanged.',
        kind: 'info',
        title: 'Checkout cancelled'
      })
    }
    if (checkout === 'unavailable') {
      showToast({
        description: 'You can explore the creation journey while paid plans are being prepared.',
        kind: 'info',
        title: 'Paid plans are not available yet'
      })
    }
    if (checkout === 'invalid' || checkout === 'failed') {
      showToast({
        description: 'Your current plan is unchanged. Please try again in a moment.',
        kind: 'error',
        title: 'Checkout could not start'
      })
    }

    if (notice || authError === 'callback' || checkout) removeHandledParameters()
  }, [pathname, searchParams])

  return null
}

/** Render one redirect notice with the matching visual severity. */
function showToast(message: ToastMessage) {
  if (message.kind === 'success') {
    toast.success(message.title, { description: message.description })
    return
  }
  if (message.kind === 'error') {
    toast.error(message.title, { description: message.description })
    return
  }
  toast.info(message.title, { description: message.description })
}

/** Remove transient redirect parameters after their notices have been announced. */
function removeHandledParameters() {
  const url = new URL(window.location.href)
  url.searchParams.delete('notice')
  url.searchParams.delete('error')
  url.searchParams.delete('checkout')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
