import {
  Check,
  Copy,
  LockKeyhole,
  type LucideIcon,
  RefreshCw,
  ShieldCheck
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'

/** Make the anonymous versus signed-in request split visible before configuration is copied. */
export function PageAccessSummary({
  authenticatedPages,
  pages
}: {
  authenticatedPages: string[]
  pages: string[]
}) {
  const authenticated = new Set(authenticatedPages)
  const anonymousCount = pages.filter(page => !authenticated.has(page)).length
  return (
    <section className="border border-border bg-background p-4" aria-labelledby="page-access-title">
      <p className="font-semibold text-sm" id="page-access-title">
        One complete check, two visitor states
      </p>
      <p className="mt-1 text-muted text-xs leading-5">
        {anonymousCount} {anonymousCount === 1 ? 'page stays' : 'pages stay'} anonymous;{' '}
        {authenticatedPages.length} signed-in{' '}
        {authenticatedPages.length === 1 ? 'page receives' : 'pages receive'} the dedicated test
        session. Infrastructure protection like Cloudflare or a private network can still apply to
        both groups.
      </p>
    </section>
  )
}

/** Explain whether a key or a complete secure check has been observed. */
export function ConnectionStatus({
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
export function HandoffAction({
  copied,
  description,
  icon: Icon,
  label,
  onCopy
}: {
  copied: boolean
  description: string
  icon: LucideIcon
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
