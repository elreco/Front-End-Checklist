'use client'

import { Check, Copy, Share2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { useState } from 'react'

/** Create a private report link and make it easy to copy without exposing it by default. */
export function ShareReportButton({ auditId }: { auditId: string }) {
  const [url, setUrl] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [pending, setPending] = useState(false)

  async function createLink() {
    setPending(true)
    setMessage(undefined)
    const response = await fetch(`/api/audits/${auditId}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expiresInDays: 30 })
    })
    const result = await response.json()
    if (response.ok && typeof result.url === 'string') setUrl(result.url)
    else
      setMessage(typeof result.error === 'string' ? result.error : 'The link could not be created.')
    setPending(false)
  }

  async function copyLink() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setMessage('Private report link copied.')
  }

  if (url)
    return (
      <div>
        <CodeRocketButton onClick={copyLink} size="sm" type="button" variant="outline">
          <Copy aria-hidden /> Copy client report
        </CodeRocketButton>
        <p aria-live="polite" className="mt-2 text-success text-xs">
          {message ?? 'Private for 30 days. Copy it when you are ready.'}
        </p>
      </div>
    )

  return (
    <div>
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
      {message ? (
        <p aria-live="polite" className="mt-2 text-danger text-xs">
          {message}
        </p>
      ) : null}
    </div>
  )
}
