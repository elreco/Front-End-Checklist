'use client'

import { CheckCircle2, Copy, KeyRound, LoaderCircle, Terminal } from '@repo/design-system/icons'
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
import { type ReactNode, useMemo, useState } from 'react'
import {
  buildCiConfiguration,
  type CiPlatform,
  getCiConfigLocation,
  getCiPlatformLabel,
  getCiSecretLocation
} from '@/lib/ci-config'
import { CiPlatformPicker } from './ci-platform-picker'

interface TokenResponse {
  message: string
  prefix: string
  token: string
}

interface ProjectCliSetupProps {
  configured: boolean
  pages: string[]
  plan: 'free' | 'solo' | 'agency'
  projectId: string
  siteUrl: string
  triggerLabel?: string
}

/** Guide an owner through a copy-ready CI setup for restricted website checks. */
export function ProjectCliSetup({
  configured,
  pages,
  plan,
  projectId,
  siteUrl,
  triggerLabel
}: ProjectCliSetupProps) {
  const [loading, setLoading] = useState(false)
  const [platform, setPlatform] = useState<CiPlatform>('github')
  const [token, setToken] = useState('')
  const configuration = useMemo(
    () => buildCiConfiguration(platform, { pages, plan, siteUrl }),
    [pages, plan, platform, siteUrl]
  )

  /** Create one project-scoped credential labelled for the selected CI platform. */
  async function createToken() {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: getCiPlatformLabel(platform) })
      })
      const payload: unknown = await response.json()
      if (!response.ok || !isTokenResponse(payload)) throw new Error(readError(payload))
      setToken(payload.token)
      toast.success('Project key created', {
        description: `Save it in ${getCiPlatformLabel(platform)} now. CodeRocket stores only its secure hash.`
      })
    } catch (error) {
      toast.error('Project key could not be created', {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  /** Copy a generated value and announce whether the browser accepted the request. */
  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`${label} could not be copied`)
    }
  }

  const buttonLabel = triggerLabel ?? (configured ? 'CI check details' : 'Set up a CI check')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <CodeRocketButton size="sm" variant={configured ? 'outline' : 'primary'}>
          <Terminal aria-hidden /> {buttonLabel}
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-none bg-surface p-0"
        showClose
      >
        <DialogHeader className="shrink-0 border-border border-b p-6 pr-14">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-signal bg-background text-signal">
              <Terminal aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">
                Guided CI setup
              </p>
              <DialogTitle className="mt-2 font-heading text-2xl">
                Run checks from your project
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl leading-6">
                Use an environment that can already open the website. The check analyzes returned
                HTML and response headers; it does not read repository source files or run browser
                JavaScript.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <section
          aria-label="CI setup steps"
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6"
        >
          <CiPlatformPicker onChange={setPlatform} value={platform} />

          <SetupSection
            complete={configured || Boolean(token)}
            number="01"
            title="Save the project key"
          >
            <p className="text-muted text-sm leading-6">
              Create a website-specific key, then save it as{' '}
              <code className="font-mono text-foreground text-xs">CODEROCKET_TOKEN</code> in{' '}
              {getCiSecretLocation(platform)}.
            </p>
            {token ? (
              <div className="mt-4 border border-signal bg-surface p-4">
                <p className="font-mono text-[10px] text-signal uppercase tracking-[.1em]">
                  Shown once · copy it now
                </p>
                <code className="mt-3 block max-h-24 overflow-auto break-all border border-border bg-background p-3 text-xs leading-6">
                  {token}
                </code>
                <CodeRocketButton
                  className="mt-3"
                  onClick={() => copyValue(token, 'Project key')}
                  size="sm"
                  type="button"
                >
                  <Copy aria-hidden /> Copy project key
                </CodeRocketButton>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <CodeRocketButton
                  disabled={loading}
                  onClick={createToken}
                  size="sm"
                  type="button"
                  variant={configured ? 'outline' : 'primary'}
                >
                  {loading ? (
                    <LoaderCircle aria-hidden className="animate-spin" />
                  ) : (
                    <KeyRound aria-hidden />
                  )}
                  {loading ? 'Creating…' : configured ? 'Create another key' : 'Create project key'}
                </CodeRocketButton>
                {configured ? (
                  <span className="inline-flex items-center gap-2 text-success text-xs">
                    <CheckCircle2 aria-hidden className="h-4 w-4" /> A key is already active
                  </span>
                ) : null}
              </div>
            )}
          </SetupSection>

          <SetupSection number="02" title={`Add ${getCiConfigLocation(platform)}`}>
            <p className="text-muted text-sm leading-6">
              Copy this configuration into your repository. It runs the current lightweight HTML
              check; no Playwright installation is required.
            </p>
            <div className="relative mt-4">
              <CodeRocketButton
                aria-label="Copy CI configuration"
                className="absolute top-2 right-2 z-10"
                onClick={() => copyValue(configuration, 'CI configuration')}
                size="sm"
                type="button"
                variant="outline"
              >
                <Copy aria-hidden /> Copy
              </CodeRocketButton>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap border border-border bg-background p-4 pr-24 font-mono text-xs leading-6">
                <code>{configuration}</code>
              </pre>
            </div>
            <p className="mt-3 text-muted text-xs leading-5">
              If the site needs a cookie or access headers, also save them as{' '}
              <code className="font-mono text-foreground">CODEROCKET_SITE_HEADERS_JSON</code>. They
              are used inside CI and are never included in the submitted result.
            </p>
          </SetupSection>

          <SetupSection number="03" title="Run the first check">
            <p className="text-muted text-sm leading-6">
              Start the generated job once. CodeRocket will confirm the connection when the first
              result arrives. GitHub includes the {plan === 'free' ? 'weekly' : 'daily'} schedule;
              configure the equivalent pipeline schedule in other platforms.
            </p>
          </SetupSection>
        </section>

        <DialogFooter className="shrink-0 border-border border-t bg-background p-4 sm:items-center sm:justify-between">
          <CodeRocketButton asChild size="sm" variant="ghost">
            <Link href="/docs/cli">Open the advanced guide →</Link>
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

/** Render one numbered setup section with an optional ready state. */
function SetupSection({
  children,
  complete = false,
  number,
  title
}: {
  children: ReactNode
  complete?: boolean
  number: string
  title: string
}) {
  return (
    <section className="border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading font-semibold text-base">{title}</h3>
        <span className={`font-mono text-[10px] ${complete ? 'text-success' : 'text-muted'}`}>
          {complete ? 'READY' : number}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Validate the token endpoint payload before exposing a one-time secret. */
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

/** Extract a safe API error message with a stable fallback. */
function readError(value: unknown): string {
  return value && typeof value === 'object' && 'error' in value && typeof value.error === 'string'
    ? value.error
    : 'Please try again.'
}
