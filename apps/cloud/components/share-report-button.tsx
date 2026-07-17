'use client'

import type { WebsiteLevel } from '@coderocket/core/website-level'
import { Check, Code2, Copy, ExternalLink, Share2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { toast } from '@repo/design-system/ui/coderocket-toast'
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
import { getWebsiteLevelPresentation } from '@/lib/website-level-presentation'
import { WebsiteLevelBadge, WebsiteLevelMark } from './website-level'

interface ShareReportButtonProps {
  auditId: string
  level?: WebsiteLevel
  projectName?: string
}

/** Create an explicit, revocable report link with share and website-badge actions. */
export function ShareReportButton({
  auditId,
  level = 'unverified',
  projectName = 'Website'
}: ShareReportButtonProps) {
  const [url, setUrl] = useState<string>()
  const [pending, setPending] = useState(false)
  const presentation = getWebsiteLevelPresentation(level)

  /** Create a time-limited link for this immutable audit snapshot. */
  async function createLink() {
    setPending(true)
    try {
      const response = await fetch(`/api/audits/${auditId}/share`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 30 })
      })
      const result: unknown = await response.json()
      if (!response.ok || !isShareResponse(result)) throw new Error(readShareError(result))
      setUrl(result.url)
      toast.success('Share link ready', {
        description: 'It shows this exact check, expires in 30 days, and can be revoked.'
      })
    } catch (error) {
      toast.error('Share link could not be created', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setPending(false)
    }
  }

  /** Copy a value with a clear success or browser-permission failure message. */
  async function copyValue(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error('Could not copy', {
        description: 'Your browser did not allow clipboard access.'
      })
    }
  }

  /** Open the platform share sheet when available, with clipboard as a reliable fallback. */
  async function shareReport() {
    if (!url) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${projectName} · ${presentation.label} website level`,
          text: `${projectName} reached the ${presentation.label} website health level on CodeRocket.`,
          url
        })
        return
      } catch {
        return
      }
    }
    await copyValue(url, 'Report link copied')
  }

  const badgeMarkup = url
    ? `<a href="${url}"><img src="${url}/badge.svg" alt="${projectName} — ${presentation.label} website health level"></a>`
    : ''

  return (
    <Dialog>
      <DialogTrigger asChild>
        <CodeRocketButton size="sm" type="button" variant="outline">
          <Share2 aria-hidden /> Share result
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent className="max-w-2xl gap-0 p-0" showClose>
        <DialogHeader className="border-border border-b p-6 pr-14">
          <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            Share one verified snapshot
          </p>
          <DialogTitle className="mt-2 font-heading text-2xl">
            Share {projectName}’s website level
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-xl leading-6">
            The report shows this exact check, its selected pages, open problems, and calculation
            method. It does not update when a newer check runs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr]">
          <WebsiteLevelMark level={level} size="sm" />
          <div>
            <WebsiteLevelBadge level={level} />
            <p className="mt-3 text-muted text-sm leading-6">{presentation.description}</p>
          </div>
        </div>

        {url ? (
          <div className="border-border border-t p-6">
            <p className="font-semibold">Your private link is ready</p>
            <p className="mt-1 text-muted text-xs leading-5">
              It expires in 30 days. You can also place the compact level badge on your website.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CodeRocketButton onClick={shareReport} size="sm" type="button">
                <Share2 aria-hidden /> Share
              </CodeRocketButton>
              <CodeRocketButton
                onClick={() => copyValue(url, 'Report link copied')}
                size="sm"
                type="button"
                variant="outline"
              >
                <Copy aria-hidden /> Copy link
              </CodeRocketButton>
              <CodeRocketButton asChild size="sm" variant="outline">
                <a href={url} rel="noreferrer" target="_blank">
                  <ExternalLink aria-hidden /> Open report
                </a>
              </CodeRocketButton>
              <CodeRocketButton
                onClick={() => copyValue(badgeMarkup, 'Website badge code copied')}
                size="sm"
                type="button"
                variant="outline"
              >
                <Code2 aria-hidden /> Copy badge code
              </CodeRocketButton>
            </div>
          </div>
        ) : (
          <div className="border-border border-t bg-background p-6">
            <p className="text-muted text-xs leading-5">
              Anyone with the link can open the report. It is excluded from search engines and can
              be revoked from your account.
            </p>
          </div>
        )}

        <DialogFooter className="border-border border-t p-4">
          <DialogClose asChild>
            <CodeRocketButton type="button" variant="ghost">
              Close
            </CodeRocketButton>
          </DialogClose>
          {url ? null : (
            <CodeRocketButton disabled={pending} onClick={createLink} type="button">
              {pending ? <Check aria-hidden /> : <Share2 aria-hidden />}
              {pending ? 'Creating link…' : 'Create private link'}
            </CodeRocketButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Narrow the share endpoint response without trusting arbitrary JSON. */
function isShareResponse(value: unknown): value is { url: string } {
  return Boolean(
    value && typeof value === 'object' && 'url' in value && typeof value.url === 'string'
  )
}

/** Extract a safe endpoint error message from unknown JSON. */
function readShareError(value: unknown): string {
  return value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
    ? value.error
    : 'Please try creating the link again.'
}
