import { AlertTriangle, CheckCircle2, RefreshCw, ScanSearch } from '@repo/design-system/icons'
import type { Metadata } from 'next'
import { DocsCodeBlock, DocsHeader } from '@/components/docs-shell'

export const metadata: Metadata = {
  title: 'How audits work',
  description:
    'How CodeRocket fetches HTML, creates baselines, compares findings, and decides gates.'
}

const stages = [
  {
    title: 'Fetch one HTML document',
    description:
      'CodeRocket requests each configured HTTPS page once. It validates DNS and every redirect, rejects private networks and non-HTML responses, and stops at 2 MB or 10 seconds.'
  },
  {
    title: 'Run conservative checks',
    description:
      'The engine selects relevant rules from the current corpus and reports only issues it can prove from the returned source. It does not execute page JavaScript or invent a score.'
  },
  {
    title: 'Create stable identities',
    description:
      'Each finding is fingerprinted from its normalized page path and rule slug. Explanatory copy is deliberately excluded, so wording changes do not create regressions.'
  },
  {
    title: 'Compare with production',
    description:
      'A preview is compared with the latest successful production audit using the same ruleset. Findings become new, persistent, or resolved.'
  }
]

export default function AuditDocumentationPage() {
  return (
    <>
      <DocsHeader
        description="An audit is a deterministic comparison against a known production state—not a one-off grade and not a visual screenshot diff."
        eyebrow="Audit model"
        title="From public HTML to a release decision."
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
          rule slug is added. The resulting SHA-256 fingerprint is scoped to the project.
        </p>
        <div className="mt-6">
          <DocsCodeBlock>{`normalize("/Checkout/") + "form-labels"
→ sha256("/checkout\\0form-labels")
→ one stable finding identity`}</DocsCodeBlock>
        </div>
      </section>

      <section className="py-10">
        <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">Gate semantics</p>
        <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
          Existing debt stays visible without blocking forever.
        </h2>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <GateRule
            description="A critical or high-priority issue absent from production fails the gate."
            icon={AlertTriangle}
            label="New"
            tone="danger"
          />
          <GateRule
            description="An issue already present remains visible but does not fail every release again."
            icon={RefreshCw}
            label="Persistent"
            tone="signal"
          />
          <GateRule
            description="An issue missing from a reachable page is recorded as fixed."
            icon={CheckCircle2}
            label="Resolved"
            tone="success"
          />
        </div>
      </section>

      <section className="border border-border bg-surface p-6 sm:p-8">
        <ScanSearch aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-heading font-semibold text-xl">Deliberate MVP boundaries</h2>
        <p className="mt-3 text-muted leading-7">
          CodeRocket currently analyzes returned source HTML. It does not run a headless browser,
          execute client-side JavaScript, collect Lighthouse measurements, compare pixels, or use an
          LLM. Rules requiring runtime or manual evidence remain reference guidance rather than
          automatic proof.
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
