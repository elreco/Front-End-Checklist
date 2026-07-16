'use client'

import { Check, Copy, Share2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
import { useState } from 'react'

/** Create a private report link and make it easy to copy without exposing it by default. */
export function ShareReportButton({ auditId }: { auditId: string }) {
  const [url, setUrl] = useState<string>()
  const [pending, setPending] = useState(false)

  async function createLink() {
    setPending(true)
    try {
      const response = await fetch(`/api/audits/${auditId}/share`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 30 })
      })
      const result = await response.json()
      if (response.ok && typeof result.url === 'string') {
        setUrl(result.url)
        toast.success('Private report created', {
          description: 'The link expires in 30 days and is ready to share with your client.'
        })
      } else {
        toast.error('Report link could not be created', {
          description:
            typeof result.error === 'string' ? result.error : 'Please try creating the link again.'
        })
      }
    } catch {
      toast.error('Report link could not be created', {
        description: 'Check your connection and try again.'
      })
    } finally {
      setPending(false)
    }
  }

  async function copyLink() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Private report link copied')
    } catch {
      toast.error('The link could not be copied', {
        description: 'Your browser did not allow clipboard access.'
      })
    }
  }

  if (url)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <CodeRocketButton onClick={copyLink} size="sm" type="button" variant="outline">
          <Copy aria-hidden /> Copy client report
        </CodeRocketButton>
        <p className="text-muted text-xs">Private for 30 days</p>
      </div>
    )

  return (
    <CodeRocketButton
      disabled={pending}
      onClick={createLink}
      size="sm"
      type="button"
      variant="outline"
    >
      {pending ? <Check aria-hidden /> : <Share2 aria-hidden />}
      {pending ? 'Creating…' : 'Create client report'}
    </CodeRocketButton>
  )
}
