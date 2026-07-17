'use client'

import { LockKeyhole } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
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
import { buildCiConfiguration, type CiPlatform } from '@/lib/ci-config'
import type { ProjectManagedAccess } from '@/lib/managed-access'
import type { ProjectPageCheck } from '@/lib/project-data-types'
import type { SecureAccessMethod } from '@/lib/secure-access-copy'
import { CiPlatformPicker } from './ci-platform-picker'
import { ManagedAccessConnection } from './managed-access-connection'
import { ConnectionStatus, PageAccessSummary } from './project-cli-setup-sections'
import { SecureAccessAdvancedSetup } from './secure-access-advanced-setup'
import { SecureAccessMethodPicker } from './secure-access-method-picker'

interface ProjectSecureAccessSetupProps {
  authenticatedPages: string[]
  configured: boolean
  pages: string[]
  plan: 'free' | 'solo' | 'agency'
  projectId: string
  latestPages?: ProjectPageCheck[]
  managedAccess?: ProjectManagedAccess
  receivedChecks?: number
  siteUrl: string
  triggerLabel?: string
}

/** Offer one simple protected-page recovery path before any developer controls. */
export function ProjectCliSetup({
  authenticatedPages,
  configured,
  latestPages = [],
  managedAccess,
  pages,
  plan,
  projectId,
  receivedChecks = 0,
  siteUrl,
  triggerLabel
}: ProjectSecureAccessSetupProps) {
  const [accessMethods, setAccessMethods] = useState<SecureAccessMethod[]>(['unknown'])
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
  const connected = receivedChecks > 0 || managedAccess?.status === 'verified'
  const buttonLabel =
    triggerLabel ??
    (connected ? 'Access details' : configured ? 'Finish page access' : 'Fix page access')

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
                  ? 'CodeRocket has a verified way to open the selected protected pages.'
                  : 'Some pages ask for sign-in or block cloud checks. Start with the guided connection below; developer options are available only when the site needs them.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-none p-6 [scrollbar-gutter:stable]">
          {configured || connected ? (
            managedAccess ? null : (
              <ConnectionStatus configured={configured} receivedChecks={receivedChecks} />
            )
          ) : null}
          <PageAccessSummary authenticatedPages={authenticatedPages} pages={pages} />
          <ManagedAccessConnection
            authenticatedPages={authenticatedPages}
            connection={managedAccess}
            latestPages={latestPages}
            projectId={projectId}
            siteUrl={siteUrl}
          />

          <details className="border border-border bg-background">
            <summary className="cursor-pointer p-4 font-semibold text-sm transition-colors hover:bg-surface-raised">
              Developer options · secure runner
            </summary>
            <div className="space-y-5 border-border border-t p-4 sm:p-5">
              <div>
                <h3 className="font-heading font-semibold text-base">
                  Run the check inside your own environment
                </h3>
                <p className="mt-1 text-muted text-sm leading-6">
                  Use this only for a VPN, private network, client certificate, interactive browser
                  access, or a security policy that must never leave your infrastructure.
                </p>
              </div>
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
