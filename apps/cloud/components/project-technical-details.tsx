import { CheckCircle2, ChevronDown, FileCode2, ShieldAlert } from '@repo/design-system/icons'
import type { ProjectPageCheck } from '@/lib/project-data'

/** Keep reproducibility and document receipts available without dominating the website level. */
export function ProjectTechnicalDetails({
  pages,
  rulesetVersion
}: {
  pages: ProjectPageCheck[]
  rulesetVersion: string
}) {
  return (
    <details className="group mt-4 border border-border bg-background">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold text-sm transition-colors marker:content-none hover:bg-surface-raised">
        Technical details
        <ChevronDown
          aria-hidden
          className="ml-auto h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="space-y-5 border-border border-t p-4">
        <section>
          <p className="font-mono text-[9px] text-muted uppercase tracking-[.12em]">
            Checks version
          </p>
          <code className="mt-2 block break-all text-xs">{rulesetVersion}</code>
          <p className="mt-2 max-w-2xl text-muted text-xs leading-5">
            CodeRocket records this version so checks, history, and shared reports remain
            comparable.
          </p>
        </section>

        <section className="border-border border-t pt-5">
          <div className="flex items-start gap-3">
            <FileCode2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
            <div>
              <p className="font-semibold text-sm">Documents received</p>
              <p className="mt-1 max-w-2xl text-muted text-xs leading-5">
                These are the server documents used for this check. CodeRocket stores a fingerprint
                and a redacted HTML outline, never the complete page source.
              </p>
            </div>
          </div>
          <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {pages.length > 0 ? (
              pages.map(page => <PageDocumentProof key={page.path} page={page} />)
            ) : (
              <p className="border border-border bg-surface p-3 text-muted text-xs">
                Page-level proof was not recorded for this check.
              </p>
            )}
          </div>
        </section>
      </div>
    </details>
  )
}

/** Display one page receipt with a compact summary and opt-in HTML outline. */
function PageDocumentProof({ page }: { page: ProjectPageCheck }) {
  const proof = page.document
  return (
    <details className="group/page border border-border bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 p-3 marker:content-none">
        {page.reachable ? (
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        ) : (
          <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <code className="break-all text-xs">{page.path}</code>
            <span className="font-mono text-[9px] text-muted uppercase tracking-[.1em]">
              {page.reachable
                ? `Confirmed${page.httpStatus ? ` · HTTP ${page.httpStatus}` : ''}`
                : 'Not confirmed'}
            </span>
          </span>
          <span className="mt-1 block truncate text-muted text-xs">
            {proof?.title ?? page.error ?? 'Document details will appear after the next check.'}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform group-open/page:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="border-border border-t p-3">
        {proof ? (
          <>
            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <DocumentFact label="Received" value={formatProofDate(proof.fetchedAt)} />
              <DocumentFact label="Size" value={formatBytes(proof.byteLength)} />
              <DocumentFact label="Content type" value={proof.contentType ?? 'HTML'} />
              <DocumentFact label="Fingerprint" mono value={proof.sha256.slice(0, 16)} />
              {page.finalUrl && page.finalUrl !== page.url ? (
                <DocumentFact label="Final URL" mono value={page.finalUrl} />
              ) : null}
              {proof.cacheStatus ? <DocumentFact label="Cache" value={proof.cacheStatus} /> : null}
              {proof.etag ? <DocumentFact label="ETag" mono value={proof.etag} /> : null}
              {proof.lastModified ? (
                <DocumentFact label="Last modified" value={proof.lastModified} />
              ) : null}
            </dl>
            <details className="group/source mt-4 border border-border bg-background">
              <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 font-semibold text-xs marker:content-none">
                View safe HTML outline
                <ChevronDown
                  aria-hidden
                  className="ml-auto h-4 w-4 text-muted transition-transform group-open/source:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <div className="border-border border-t p-3">
                <p className="mb-3 text-muted text-xs leading-5">
                  Page body text, scripts, styles, form values, query strings, and sensitive
                  attributes were removed before storage.
                </p>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border border-border bg-surface-raised p-3 font-mono text-[10px] leading-5">
                  <code>{proof.htmlOutline}</code>
                </pre>
              </div>
            </details>
          </>
        ) : (
          <p className="text-muted text-xs leading-5">
            {page.reachable
              ? 'This older check predates document receipts. Start a fresh check to record one.'
              : (page.error ?? 'The expected page could not be confirmed.')}
          </p>
        )}
      </div>
    </details>
  )
}

/** Render one bounded document metadata value. */
function DocumentFact({
  label,
  mono = false,
  value
}: {
  label: string
  mono?: boolean
  value: string
}) {
  return (
    <div>
      <dt className="font-mono text-[9px] text-muted uppercase tracking-[.1em]">{label}</dt>
      <dd className={`mt-1 break-all ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

/** Format a document size without implying more precision than the receipt contains. */
function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

/** Present an immutable server timestamp in a compact, explicit timezone. */
function formatProofDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(date)} UTC`
}
