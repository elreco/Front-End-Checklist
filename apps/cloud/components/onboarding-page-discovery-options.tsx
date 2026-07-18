import {
  FileUp,
  Info,
  LoaderCircle,
  LockKeyhole,
  Search,
  ShieldCheck
} from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'

interface OnboardingPageDiscoveryOptionsProps {
  cloudDiscoveryBlocked: boolean
  loading: boolean
  validSiteUrl: boolean
  onDiscover: () => void
  onImport: () => void
}

const PUBLIC_DISCOVERY_HELP_ID = 'public-page-discovery-help'
const ROUTE_IMPORT_HELP_ID = 'route-file-import-help'

/** Explain both page-discovery methods and why either method may be unavailable. */
export function OnboardingPageDiscoveryOptions({
  cloudDiscoveryBlocked,
  loading,
  onDiscover,
  onImport,
  validSiteUrl
}: OnboardingPageDiscoveryOptionsProps) {
  const publicDiscoveryDisabled = cloudDiscoveryBlocked || !validSiteUrl || loading

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <article className="flex flex-col border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-signal text-signal">
            <Search aria-hidden className="h-4 w-4" />
          </span>
          <span
            className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em] ${
              cloudDiscoveryBlocked ? 'border-border text-muted' : 'border-success text-success'
            }`}
          >
            {cloudDiscoveryBlocked ? 'Unavailable' : 'Public sites'}
          </span>
        </div>
        <p className="mt-4 font-mono text-[10px] text-muted uppercase tracking-[.12em]">Option 1</p>
        <h4 className="mt-1 font-heading font-semibold text-base">Find pages automatically</h4>
        <p className="mt-2 text-muted text-xs leading-5">
          CodeRocket opens the public homepage, reads its internal links, then checks the sitemaps
          declared in robots.txt or at /sitemap.xml.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-muted text-xs leading-5">
          <li>It keeps same-site page paths only.</li>
          <li>It prepares a review list without opening every result.</li>
          <li>Nothing is added until you confirm the selection.</li>
        </ul>
        <div className="mt-auto pt-4">
          <CodeRocketButton
            aria-describedby={PUBLIC_DISCOVERY_HELP_ID}
            disabled={publicDiscoveryDisabled}
            onClick={onDiscover}
            size="sm"
            type="button"
            variant="outline"
          >
            {loading ? (
              <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Search aria-hidden />
            )}
            {loading ? 'Looking for pages…' : 'Scan sitemap & homepage'}
          </CodeRocketButton>
        </div>
        <div className="mt-3 text-xs leading-5" id={PUBLIC_DISCOVERY_HELP_ID}>
          {!validSiteUrl ? (
            <p className="flex items-start gap-2 text-muted">
              <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Enter a valid HTTPS website address in the previous step first.
            </p>
          ) : cloudDiscoveryBlocked ? (
            <p className="flex items-start gap-2 border border-border p-3 text-muted">
              <LockKeyhole aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Automatic discovery is off because private or secure access was selected in the
              previous step. Choose “No sign-in is required” there to enable it, or use file import.
            </p>
          ) : (
            <p className="text-muted">Uses the public cloud. No sign-in details are sent.</p>
          )}
        </div>
      </article>

      <article className="flex flex-col border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-accent text-accent">
            <FileUp aria-hidden className="h-4 w-4" />
          </span>
          <span className="border border-success px-2 py-1 font-mono text-[9px] text-success uppercase tracking-[.1em]">
            Local & safe
          </span>
        </div>
        <p className="mt-4 font-mono text-[10px] text-muted uppercase tracking-[.12em]">Option 2</p>
        <h4 className="mt-1 font-heading font-semibold text-base">
          Import a sitemap or route file
        </h4>
        <p className="mt-2 text-muted text-xs leading-5">
          Choose an existing export from your project. The file is read locally in this browser; it
          is not uploaded to CodeRocket.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-muted text-xs leading-5">
          <li>XML sitemap, TXT, CSV, or JSON · maximum 2 MB.</li>
          <li>TXT accepts one path or full URL per line.</li>
          <li>External domains, assets, and duplicate paths are ignored.</li>
        </ul>
        <div className="mt-auto pt-4">
          <CodeRocketButton
            aria-describedby={ROUTE_IMPORT_HELP_ID}
            disabled={!validSiteUrl}
            onClick={onImport}
            size="sm"
            type="button"
            variant="outline"
          >
            <FileUp aria-hidden /> Choose a route file
          </CodeRocketButton>
        </div>
        <p
          className={`mt-3 flex items-start gap-2 text-xs leading-5 ${
            validSiteUrl ? 'text-muted' : 'text-accent'
          }`}
          id={ROUTE_IMPORT_HELP_ID}
        >
          {validSiteUrl ? (
            <ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          ) : (
            <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          {validSiteUrl
            ? 'After import, review the paths below and click “Add selected”.'
            : 'Enter a valid HTTPS website address first so URLs can be limited to this site.'}
        </p>
      </article>
    </div>
  )
}
