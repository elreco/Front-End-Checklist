'use client'

import {
  Check,
  Copy,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
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
import { SecureAccessAdvancedSetup } from './secure-access-advanced-setup'
import { SecureAccessMethodPicker } from './secure-access-method-picker'

interface ProjectSecureAccessSetupProps {
  configured: boolean
  pages: string[]
  plan: 'free' | 'solo' | 'agency'
  projectId: string
  receivedChecks?: number
  siteUrl: string
  triggerLabel?: string
}

/** Guide owners and developers through secure checks without exposing CI first. */
export function ProjectCliSetup({
  configured,
  pages,
  plan,
  projectId,
  receivedChecks = 0,
  siteUrl,
  triggerLabel
}: ProjectSecureAccessSetupProps) {
  const [accessMethod, setAccessMethod] = useState<SecureAccessMethod>('unknown')
  const [copied, setCopied] = useState<keyof SecureAccessCopy | null>(null)
  const [platform, setPlatform] = useState<CiPlatform>('github')
  const configuration = useMemo(
    () => buildCiConfiguration(platform, { accessMethod, pages, plan, siteUrl }),
    [accessMethod, pages, plan, platform, siteUrl]
  )
  const copy = useMemo(
    () =>
      buildSecureAccessCopy({
        accessMethod,
        configuration,
        configurationLocation: getCiConfigLocation(platform),
        pages,
        platformLabel: getCiPlatformLabel(platform),
        siteUrl
      }),
    [accessMethod, configuration, pages, platform, siteUrl]
  )

  /** Copy one safe handoff without including credentials. */
  async function copyText(kind: keyof SecureAccessCopy) {
    try {
      await navigator.clipboard.writeText(copy[kind])
      setCopied(kind)
      toast.success(
        kind === 'developerInstructions' ? 'Developer setup copied' : 'Access request copied',
        {
          description: 'No project key, password, cookie, or access secret was included.'
        }
      )
      window.setTimeout(() => setCopied(null), 2_000)
    } catch {
      toast.error('Could not copy the instructions')
    }
  }

  const connected = receivedChecks > 0
  const buttonLabel =
    triggerLabel ??
    (connected
      ? 'Secure access details'
      : configured
        ? 'Finish secure access'
        : 'Connect secure access')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <CodeRocketButton size="sm" variant={connected || configured ? 'outline' : 'primary'}>
          <LockKeyhole aria-hidden /> {buttonLabel}
        </CodeRocketButton>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-none bg-surface p-0"
        showClose
      >
        <DialogHeader className="shrink-0 border-border border-b p-6 pr-14">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-signal bg-background text-signal">
              <LockKeyhole aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.14em]">
                Protected site access
              </p>
              <DialogTitle className="mt-2 font-heading text-2xl">
                Let CodeRocket reach protected pages
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl leading-6">
                Run the check from an environment that can already open this site. Website
                credentials stay there; CodeRocket receives only the check result.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6">
          <ConnectionStatus configured={configured} receivedChecks={receivedChecks} />
          <SecureAccessMethodPicker onChange={setAccessMethod} value={accessMethod} />
          <CiPlatformPicker onChange={setPlatform} value={platform} />

          <section aria-labelledby="handoff-title" className="border border-border bg-background">
            <div className="border-border border-b p-5">
              <p className="font-mono text-[10px] text-signal uppercase tracking-[.12em]">
                No technical setup required from you
              </p>
              <h3 className="mt-2 font-heading font-semibold text-lg" id="handoff-title">
                Send the right instructions
              </h3>
              <p className="mt-1 text-muted text-sm leading-6">
                Choose who can configure access. Secrets are deliberately excluded from both
                formats.
              </p>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-2">
              <HandoffAction
                copied={copied === 'developerInstructions'}
                description="Includes the generated configuration, protected pages, and success criteria."
                icon={Terminal}
                label="Send to my developer"
                onCopy={() => copyText('developerInstructions')}
              />
              <HandoffAction
                copied={copied === 'providerRequest'}
                description="Explains the narrow access needed without asking anyone to disable protection."
                icon={Send}
                label="Ask my hosting or security provider"
                onCopy={() => copyText('providerRequest')}
              />
            </div>
          </section>

          <SecureAccessAdvancedSetup
            accessMethod={accessMethod}
            configuration={configuration}
            configured={configured}
            plan={plan}
            platform={platform}
            projectId={projectId}
          />
        </div>

        <DialogFooter className="shrink-0 border-border border-t bg-background p-4 sm:items-center sm:justify-between">
          <CodeRocketButton asChild size="sm" variant="ghost">
            <Link href="/docs/cli">Open the protected-site guide →</Link>
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

/** Explain whether a key or a complete secure check has been observed. */
function ConnectionStatus({
  configured,
  receivedChecks
}: {
  configured: boolean
  receivedChecks: number
}) {
  if (receivedChecks > 0)
    return (
      <div className="flex items-start gap-3 border border-success bg-success/10 p-4">
        <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="font-semibold text-sm">Secure access connected</p>
          <p className="mt-1 text-muted text-xs leading-5">
            CodeRocket has received {receivedChecks} secure{' '}
            {receivedChecks === 1 ? 'check' : 'checks'} from your runner.
          </p>
        </div>
      </div>
    )
  if (configured)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-signal bg-signal/10 p-4">
        <div>
          <p className="font-semibold text-sm">Waiting for the first secure check</p>
          <p className="mt-1 text-muted text-xs leading-5">
            A project key exists. Run the generated job once, then refresh this page.
          </p>
        </div>
        <CodeRocketButton
          onClick={() => window.location.reload()}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden /> Refresh status
        </CodeRocketButton>
      </div>
    )
  return (
    <div className="flex items-start gap-3 border border-border bg-background p-4">
      <LockKeyhole aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
      <div>
        <p className="font-semibold text-sm">Secure access is not connected yet</p>
        <p className="mt-1 text-muted text-xs leading-5">
          Start by describing the protection, then send the instructions or open the advanced setup.
        </p>
      </div>
    </div>
  )
}

/** Render one copy-first handoff option. */
function HandoffAction({
  copied,
  description,
  icon: Icon,
  label,
  onCopy
}: {
  copied: boolean
  description: string
  icon: typeof Copy
  label: string
  onCopy: () => void
}) {
  return (
    <article className="flex flex-col bg-surface p-5">
      <Icon aria-hidden className="h-5 w-5 text-signal" />
      <h4 className="mt-4 font-heading font-semibold text-base">{label}</h4>
      <p className="mt-2 flex-1 text-muted text-xs leading-5">{description}</p>
      <CodeRocketButton
        className="mt-4 justify-center"
        onClick={onCopy}
        size="sm"
        type="button"
        variant="outline"
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        <span aria-live="polite">{copied ? 'Copied' : 'Copy instructions'}</span>
      </CodeRocketButton>
    </article>
  )
}
