'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const FALLBACK_DURATION_MS = 6_000

/** Provides immediate global feedback and restores the top position after route changes. */
export function NavigationFeedback() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const previousRoute = useRef(routeKey)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function startLoading() {
      setLoading(true)
    }

    function stopLoading() {
      setLoading(false)
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!(event.target instanceof Element)) return
      const link = event.target.closest('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return
      if (link.download || link.target === '_blank') return

      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      const current = new URL(window.location.href)
      const sameDocument =
        destination.pathname === current.pathname && destination.search === current.search
      if (sameDocument && destination.hash) return
      if (sameDocument && destination.hash === current.hash) return

      startLoading()
    }

    document.addEventListener('click', handleClick)
    window.addEventListener('hashchange', stopLoading)
    window.addEventListener('pageshow', stopLoading)
    window.addEventListener('popstate', stopLoading)
    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('hashchange', stopLoading)
      window.removeEventListener('pageshow', stopLoading)
      window.removeEventListener('popstate', stopLoading)
    }
  }, [])

  useEffect(() => {
    const changed = previousRoute.current !== routeKey
    previousRoute.current = routeKey
    setLoading(false)
    if (changed && !window.location.hash) resetDocumentScroll()
  }, [routeKey])

  useEffect(() => {
    if (!loading) return
    const timeout = window.setTimeout(() => setLoading(false), FALLBACK_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [loading])

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-150 motion-reduce:transition-none ${loading ? 'opacity-100' : 'opacity-0'}`}
      data-navigation-feedback
      role="status"
    >
      <span className="sr-only">{loading ? 'Loading page' : 'Page loaded'}</span>
      <span aria-hidden className="cr-navigation-progress block h-full bg-signal" />
    </div>
  )
}

function resetDocumentScroll() {
  const root = document.documentElement
  const previousBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  root.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo(0, 0)
  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousBehavior
  })
}
