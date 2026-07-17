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
  'ai-budget-saved': {
    description: 'New AI analyses will respect the monthly spending limit you selected.',
    kind: 'success',
    title: 'AI budget updated'
  },
  'ai-budget-save-failed': {
    description:
      'Nothing changed. Check that this paid account is connected to Stripe and try again.',
    kind: 'error',
    title: 'AI budget could not be updated'
  },
  'already-running': {
    description: 'Results will appear on the site page when the current check finishes.',
    kind: 'info',
    title: 'A check is already running'
  },
  'create-failed': {
    description: 'Nothing was changed. Please try adding the site again.',
    kind: 'error',
    title: 'The site could not be added'
  },
  'invalid-name': {
    description: 'Enter a display name between 1 and 80 characters.',
    kind: 'error',
    title: 'Check the display name'
  },
  'invalid-ai-budget': {
    description: 'Choose Off, €10, €20, or a whole-euro monthly budget up to €500.',
    kind: 'error',
    title: 'Check the AI budget'
  },
  'invalid-project-name': {
    description: 'Enter a site name between 1 and 120 characters.',
    kind: 'error',
    title: 'Check the site name'
  },
  'invalid-pages': {
    description: 'Use pages from this website only, such as /, /pricing, or /contact.',
    kind: 'error',
    title: 'Check the pages to watch'
  },
  'invalid-url': {
    description: 'Use a public, secure https:// website address.',
    kind: 'error',
    title: 'Check the website address'
  },
  'limit-reached': {
    description: 'Compare plans to add more on-demand checks this month.',
    kind: 'error',
    title: 'Monthly check limit reached'
  },
  'missing-pages': {
    description: 'Add at least one page, such as / or /pricing.',
    kind: 'error',
    title: 'Add a page to monitor'
  },
  'project-limit': {
    description: 'Archive a site or choose a plan that includes more monitored sites.',
    kind: 'error',
    title: 'Site limit reached'
  },
  'private-site-created': {
    description:
      'Cloud monitoring is off. Connect secure access from an environment that can open these pages.',
    kind: 'success',
    title: 'Restricted site added'
  },
  'private-runner-required': {
    description:
      'One or more access layers prevent a reliable cloud check. Connect an environment that can open every selected page.',
    kind: 'info',
    title: 'Connect secure access'
  },
  'protected-site-created': {
    description: 'CodeRocket is checking whether it can read and confirm each selected page.',
    kind: 'success',
    title: 'Website access test started'
  },
  'queue-failed': {
    description: 'The site is safe. Please try starting the check again.',
    kind: 'error',
    title: 'The check could not start'
  },
  queued: {
    description:
      'You can leave this page. Results will appear when every selected page is checked.',
    kind: 'success',
    title: 'Website check started'
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
  },
  'site-created': {
    description:
      'The first check has started and will become the starting point for future comparisons.',
    kind: 'success',
    title: 'Site added successfully'
  },
  'too-many-pages': {
    description: 'Remove a few paths or choose a plan with a higher per-site page limit.',
    kind: 'error',
    title: 'Too many pages for this plan'
  },
  'workflow-acknowledged': {
    description: 'The finding stays visible and will continue to be checked.',
    kind: 'success',
    title: 'Marked as reviewed'
  },
  'workflow-failed': {
    description: 'Nothing was changed. Please try again.',
    kind: 'error',
    title: 'Review state could not be updated'
  },
  'workflow-muted': {
    description: 'This problem is hidden from the open list, but stays in your history.',
    kind: 'success',
    title: 'Problem ignored for now'
  },
  'workflow-open': {
    description: 'This problem is back in the open list and will keep being tracked.',
    kind: 'success',
    title: 'Problem tracked again'
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
        description:
          'Free monitoring is available now. Paid plans are still being prepared for public launch.',
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
