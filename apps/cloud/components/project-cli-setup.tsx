'use client'

import {
  CheckCircle2,
  Copy,
  FileCheck2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Terminal
} from '@repo/design-system/icons'
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
import Link from 'next/link'
import { useState } from 'react'

interface TokenResponse {
  message: string
  prefix: string
  token: string
}

/** Creates a one-time project token and guides the owner into the private runner workflow. */
export function ProjectCliSetup({
  configured,
  projectId
}: {
  configured: boolean
  projectId: string
}) {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')

  async function createToken() {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'GitHub Actions' })
      })
      const payload: unknown = await response.json()
      if (!response.ok || !isTokenResponse(payload)) throw new Error(readError(payload))
      setToken(payload.token)
      toast.success('Project token created', {
        description: 'Copy it now. CodeRocket stores only its secure hash.'
      })
    } catch (error) {
      toast.error('Token could not be created', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Token copied')
    } catch {
      toast.error('Token could not be copied')
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <CodeRocketButton size="sm" variant={configured ? 'outline' : 'primary'}>
          <Terminal aria-hidden /> {configured ? 'Runner details' : 'Set up runner'}
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-2xl gap-0 overflow-hidden rounded-none bg-surface p-0"
        showClose
      >
        <DialogHeader className="border-border border-b p-6 pr-14">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-signal bg-background text-signal">
              <Terminal aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">
                Private runner
              </p>
              <DialogTitle className="mt-2 font-heading text-2xl">
                Check pages from your own environment
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-xl leading-6">
                Use GitHub Actions or any machine that can already open the website. CodeRocket
                receives the check result, not your website password or session.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-6">
          <ol className="grid gap-px border border-border bg-border sm:grid-cols-3">
            <RunnerStep
              description="Create one website-specific key."
              icon={KeyRound}
              number="01"
              title="Connect"
            />
            <RunnerStep
              description="Run the check where the pages are reachable."
              icon={LockKeyhole}
              number="02"
              title="Check"
            />
            <RunnerStep
              description="Send only structured results to CodeRocket."
              icon={FileCheck2}
              number="03"
              title="Review"
            />
          </ol>

          {token ? (
            <div className="mt-5 border border-signal bg-background p-5">
              <div className="flex items-center gap-2 font-mono text-signal text-xs uppercase tracking-[.12em]">
                <CheckCircle2 aria-hidden className="h-4 w-4" /> Key ready · copy it now
              </div>
              <p className="mt-3 text-muted text-sm leading-6">
                This full key is displayed only once. Store it as a protected secret in GitHub or
                your runner environment.
              </p>
              <code className="mt-4 block max-h-28 overflow-auto break-all border border-border bg-surface p-3 text-xs leading-6">
                {token}
              </code>
              <CodeRocketButton className="mt-4" onClick={copyToken} size="sm" type="button">
                <Copy aria-hidden /> Copy access key
              </CodeRocketButton>
            </div>
          ) : (
            <div className="mt-5 border border-border bg-background p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
                <div>
                  <h3 className="font-heading font-semibold text-base">
                    {configured ? 'A runner is already connected' : 'Create a private access key'}
                  </h3>
                  <p className="mt-2 text-muted text-sm leading-6">
                    {configured
                      ? 'Create another key only when replacing or rotating the current one. Existing keys are not revealed again.'
                      : 'The key works only for this website. It cannot submit a result to another CodeRocket project.'}
                  </p>
                </div>
              </div>
              <CodeRocketButton
                className="mt-5"
                disabled={loading}
                onClick={createToken}
                size="sm"
                type="button"
              >
                {loading ? (
                  <LoaderCircle aria-hidden className="animate-spin" />
                ) : (
                  <KeyRound aria-hidden />
                )}
                {loading
                  ? 'Creating…'
                  : configured
                    ? 'Create replacement key'
                    : 'Create access key'}
              </CodeRocketButton>
            </div>
          )}
        </div>

        <DialogFooter className="border-border border-t bg-background p-4 sm:items-center sm:justify-between">
          <CodeRocketButton asChild size="sm" variant="ghost">
            <Link href="/docs/cli">Read the setup guide →</Link>
          </CodeRocketButton>
          <DialogClose asChild>
            <CodeRocketButton size="sm" type="button" variant="outline">
              Close
            </CodeRocketButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RunnerStep({
  description,
  icon: Icon,
  number,
  title
}: {
  description: string
  icon: typeof Terminal
  number: string
  title: string
}) {
  return (
    <li className="bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon aria-hidden className="h-4 w-4 text-signal" />
        <span className="font-mono text-[10px] text-muted">{number}</span>
      </div>
      <p className="mt-3 font-heading font-semibold text-sm">{title}</p>
      <p className="mt-1 text-muted text-xs leading-5">{description}</p>
    </li>
  )
}

function isTokenResponse(value: unknown): value is TokenResponse {
  if (!value || typeof value !== 'object') return false
  return (
    'token' in value &&
    typeof value.token === 'string' &&
    'prefix' in value &&
    typeof value.prefix === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  )
}

function readError(value: unknown): string {
  return value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
    ? value.error
    : 'Please try again.'
}
