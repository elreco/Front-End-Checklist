import { LockKeyhole, RefreshCw, ShieldCheck } from '@repo/design-system/icons'
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
  const publicCount = pages.filter(page => !authenticated.has(page)).length
  const signedInCount = authenticatedPages.length
  const title =
    signedInCount === 0
      ? `${pages.length} selected ${pages.length === 1 ? 'page' : 'pages'}`
      : signedInCount === pages.length
        ? `${signedInCount} signed-in ${signedInCount === 1 ? 'page' : 'pages'}`
        : `${publicCount} public + ${signedInCount} signed-in`
  return (
    <section className="border border-border bg-background p-4" aria-labelledby="page-access-title">
      <p className="font-semibold text-sm" id="page-access-title">
        {title}
      </p>
      <p className="mt-1 text-muted text-xs leading-5">
        CodeRocket will combine every selected page into one complete result. You do not need to
        create a separate site for signed-in pages.
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
        <p className="font-semibold text-sm">Some pages still need access</p>
        <p className="mt-1 text-muted text-xs leading-5">
          CodeRocket prepared a one-time setup below. Once it is connected, future checks run
          automatically.
        </p>
      </div>
    </div>
  )
}
