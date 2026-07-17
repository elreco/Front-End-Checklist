'use client'

import { Check, Copy, LockKeyhole, Send } from '@repo/design-system/icons'
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
import { useMemo, useState } from 'react'
import {
  buildCiConfiguration,
  type CiPlatform,
  getCiConfigLocation,
  getCiPlatformLabel
} from '@/lib/ci-config'
import {
  buildSecureAccessCopy,
  type SecureAccessCopy,
  type SecureAccessMethod
} from '@/lib/secure-access-copy'
import { CiPlatformPicker } from './ci-platform-picker'
import { ConnectionStatus, PageAccessSummary } from './project-cli-setup-sections'
import { SecureAccessAdvancedSetup } from './secure-access-advanced-setup'
import { SecureAccessMethodPicker } from './secure-access-method-picker'

interface ProjectSecureAccessSetupProps {
  authenticatedPages: string[]
  configured: boolean
  pages: string[]
  plan: 'free' | 'solo' | 'agency'
  projectId: string
  receivedChecks?: number
  siteUrl: string
  triggerLabel?: string
}

/** Offer one simple protected-page recovery path before any developer controls. */
export function ProjectCliSetup({
  authenticatedPages,
  configured,
  pages,
  plan,
  projectId,
  receivedChecks = 0,
  siteUrl,
  triggerLabel
}: ProjectSecureAccessSetupProps) {
  const [accessMethods, setAccessMethods] = useState<SecureAccessMethod[]>(['unknown'])
  const [copied, setCopied] = useState<keyof SecureAccessCopy | null>(null)
  const [platform, setPlatform] = useState<CiPlatform>('github')
  const configuration = useMemo(
    () =>
      buildCiConfiguration(platform, {
        accessMethods,
        authenticatedPages,
        pages,
        plan,
        siteUrl
      }),
    [accessMethods, authenticatedPages, pages, plan, platform, siteUrl]
  )
  const copy = useMemo(
    () =>
      buildSecureAccessCopy({
        accessMethods,
        authenticatedPages,
        configuration,
        configurationLocation: getCiConfigLocation(platform),
        pages,
        platformLabel: getCiPlatformLabel(platform),
        siteUrl
      }),
    [accessMethods, authenticatedPages, configuration, pages, platform, siteUrl]
  )
  const connected = receivedChecks > 0
  const buttonLabel =
    triggerLabel ??
    (connected ? 'Access details' : configured ? 'Finish page access' : 'Fix page access')

  /** Copy one secret-free setup or provider request. */
  async function copyText(kind: keyof SecureAccessCopy) {
    try {
      await navigator.clipboard.writeText(copy[kind])
      setCopied(kind)
      toast.success(kind === 'developerInstructions' ? 'Setup copied' : 'Access request copied', {
        description: 'No password, cookie, project key, or private access value was included.'
      })
      window.setTimeout(() => setCopied(null), 2_000)
    } catch {
      toast.error('Could not copy the instructions')
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <CodeRocketButton size="sm" variant={connected || configured ? 'outline' : 'primary'}>
          <LockKeyhole aria-hidden /> {buttonLabel}
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent
        className="isolate flex max-h-[calc(100dvh-2rem)] max-w-4xl transform-gpu flex-col gap-0 overflow-hidden rounded-none bg-surface p-0 [backface-visibility:hidden]"
        overlayClassName="bg-black/75 backdrop-blur-none"
        showClose
      >
        <DialogHeader className="shrink-0 border-border border-b p-6 pr-14">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-signal bg-background text-signal">
              <LockKeyhole aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">
                Complete website check
              </p>
              <DialogTitle className="mt-2 font-heading text-2xl">
                {connected ? 'Protected pages are connected' : 'Finish checking every page'}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl leading-6">
                {connected
                  ? 'CodeRocket can receive complete checks from the environment that opens this website.'
                  : 'Some pages ask for sign-in or block cloud checks. Connect them once from an environment that already has access; future checks then run automatically.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-none p-6 [scrollbar-gutter:stable]">
          {configured || connected ? (
            <ConnectionStatus configured={configured} receivedChecks={receivedChecks} />
          ) : null}
          <PageAccessSummary authenticatedPages={authenticatedPages} pages={pages} />

          {!connected ? (
            <section
              aria-labelledby="secure-handoff-title"
              className="border border-signal bg-background p-5"
            >
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
                Recommended · one-time setup
              </p>
              <h3 className="mt-2 font-heading font-semibold text-lg" id="secure-handoff-title">
                Send one ready-to-use setup
              </h3>
              <p className="mt-2 max-w-2xl text-muted text-sm leading-6">
                Send this to the person who manages the website. It includes the selected pages,
                generated configuration, and a clear success check. No password or private access
                value is copied.
              </p>
              <ol className="mt-4 grid gap-px bg-border sm:grid-cols-3">
                {[
                  'The prepared job is added once',
                  'Website access stays private',
                  'Future checks run automatically'
                ].map((item, index) => (
                  <li className="flex items-start gap-2 bg-surface p-3 text-xs" key={item}>
                    <span className="font-mono text-signal">0{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <CodeRocketButton onClick={() => copyText('developerInstructions')} type="button">
                  {copied === 'developerInstructions' ? (
                    <Check aria-hidden />
                  ) : (
                    <Copy aria-hidden />
                  )}
                  <span aria-live="polite">
                    {copied === 'developerInstructions'
                      ? 'Setup copied'
                      : 'Copy ready-to-send setup'}
                  </span>
                </CodeRocketButton>
                <CodeRocketButton
                  onClick={() => copyText('providerRequest')}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Send aria-hidden />
                  {copied === 'providerRequest' ? 'Request copied' : 'No developer? Copy a request'}
                </CodeRocketButton>
              </div>
            </section>
          ) : null}

          <details className="border border-border bg-background">
            <summary className="cursor-pointer p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
              Developer options and other platforms
            </summary>
            <div className="space-y-5 border-border border-t p-4 sm:p-5">
              <CiPlatformPicker onChange={setPlatform} value={platform} />
              <details className="border border-border bg-surface">
                <summary className="cursor-pointer p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
                  Describe the protection — optional
                </summary>
                <div className="border-border border-t p-4">
                  <SecureAccessMethodPicker onChange={setAccessMethods} value={accessMethods} />
                </div>
              </details>
              <SecureAccessAdvancedSetup
                accessMethods={accessMethods}
                configuration={configuration}
                configured={configured}
                plan={plan}
                platform={platform}
                projectId={projectId}
              />
            </div>
          </details>
        </div>

        <DialogFooter className="shrink-0 border-border border-t bg-background p-4 sm:items-center sm:justify-between">
          <CodeRocketButton asChild size="sm" variant="ghost">
            <Link href="/docs/cli">How protected checks work →</Link>
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
