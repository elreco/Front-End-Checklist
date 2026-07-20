'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Refresh an in-progress studio without making the owner reload or understand background jobs. */
export function StudioRefresh() {
  const router = useRouter()

  useEffect(() => {
    const refreshTimer = window.setInterval(() => router.refresh(), 3500)
    return () => window.clearInterval(refreshTimer)
  }, [router])

  return null
}
