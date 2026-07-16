import { AlertTriangle, CheckCircle2, RefreshCw, ScanSearch } from '@repo/design-system/icons'
import type { Metadata } from 'next'
import { DocsCodeBlock, DocsHeader } from '@/components/docs-shell'

export const metadata: Metadata = {
  title: 'How checks work',
  description:
    'How CodeRocket safely reads public pages, reports coverage, and compares website health.'
}

const stages = [
  {
    title: 'Fetch one HTML document',
    description:
      'CodeRocket requests each configured HTTPS page once. It validates DNS and every redirect, rejects private networks and non-HTML responses, and stops at 2 MB or 10 seconds.'
  },
  {
    title: 'Run deterministic checks',
    description:
      'The engine reviews returned HTML, response timing, and security headers. It reports only issues it can prove and never invents a score.'
  },
  {
    title: 'Create stable identities',
    description:
      'Each finding is fingerprinted from its normalized page path, rule slug, and stable occurrence key. Explanatory copy is excluded, so wording changes do not create alerts.'
  },
  {
    title: 'Compare with the last complete check',
    description:
      'Findings become new, still present, or resolved. If a requested page is unavailable, the result is explicitly inconclusive and nothing is falsely resolved.'
  }
]

export default function AuditDocumentationPage() {
  return (
    <>
      <DocsHeader
        description="A check is a deterministic, coverage-aware comparison—not a one-off grade and not a visual screenshot diff."
        eyebrow="Website health model"
        title="From public pages to a clear health result."
      />

      <ol className="grid gap-4 py-10 sm:grid-cols-2">
        {stages.map((stage, index) => (
          <li className="border border-border bg-surface p-6" key={stage.title}>
            <span className="font-mono text-signal text-xs">0{index + 1}</span>
            <h2 className="mt-5 font-heading font-semibold text-xl">{stage.title}</h2>
            <p className="mt-3 text-muted leading-7">{stage.description}</p>
          </li>
        ))}
      </ol>

      <section className="border-border border-y py-10">
        <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">Stable identity</p>
        <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
          A finding survives copy changes.
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          Paths are decoded, lowercased, deduplicated, and stripped of trailing slashes before the
          rule slug and occurrence key are added. The SHA-256 fingerprint is scoped to the project.
        </p>
        <div className="mt-6">
          <DocsCodeBlock>{`normalize("/Checkout/") + "form-labels" + "primary"
→ sha256("/checkout\\0form-labels\\0primary")
→ one stable finding identity`}</DocsCodeBlock>
        </div>
      </section>

      <section className="py-10">
        <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">Result semantics</p>
        <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
          Honest results, including when a check is incomplete.
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <GateRule
            description="A critical or high-priority issue absent from the reference makes the website need attention."
            icon={AlertTriangle}
            label="New"
            tone="danger"
          />
          <GateRule
            description="An issue already present remains visible but does not fail every release again."
            icon={RefreshCw}
            label="Still present"
            tone="signal"
          />
          <GateRule
            description="An issue missing from a reachable page is recorded as fixed."
            icon={CheckCircle2}
            label="Resolved"
            tone="success"
          />
          <GateRule
            description="A requested page could not be read. Previous findings stay open and the result is not marked healthy."
            icon={ScanSearch}
            label="Could not check"
            tone="signal"
          />
        </div>
      </section>

      <section className="border border-border bg-surface p-6 sm:p-8" id="http-checks">
        <ScanSearch aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-heading font-semibold text-xl">What is automatic today</h2>
        <p className="mt-3 text-muted leading-7">
          CodeRocket verifies HTTPS reachability, redirect safety, HTTP status, response time,
          selected security headers, and issues provable from returned source HTML. It does not run
          a headless browser, execute client JavaScript, collect Lighthouse measurements, compare
          pixels, or use an LLM. Runtime and judgment-based rules remain clearly labeled reference
          guidance instead of fake automatic proof.
        </p>
      </section>
    </>
  )
}

function GateRule({
  description,
  icon: Icon,
  label,
  tone
}: {
  description: string
  icon: typeof AlertTriangle
  label: string
  tone: 'danger' | 'signal' | 'success'
}) {
  const color =
    tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-signal'
  return (
    <article className="border border-border bg-surface p-5">
      <Icon aria-hidden className={`h-5 w-5 ${color}`} />
      <h3 className="mt-5 font-heading font-semibold">{label}</h3>
      <p className="mt-2 text-muted text-sm leading-6">{description}</p>
    </article>
  )
}
