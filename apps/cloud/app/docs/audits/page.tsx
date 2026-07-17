import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cloud,
  Code2,
  LockKeyhole,
  RefreshCw,
  ScanSearch,
  ShieldCheck
} from '@repo/design-system/icons'
import type { Metadata } from 'next'
import { DocsCodeBlock, DocsHeader } from '@/components/docs-shell'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'How checks work',
  description:
    'Learn how CodeRocket safely checks public, protected, and private pages, proves website problems, and compares changes over time.',
  path: '/docs/audits',
  image: '/docs/opengraph-image'
})

const stages = [
  {
    title: 'Open each page once',
    description:
      'CodeRocket requests each configured HTTPS page once. It validates DNS and every redirect, rejects private networks and non-HTML responses, and stops at 2 MB or 10 seconds.'
  },
  {
    title: 'Check only what can be proven',
    description:
      'The engine reviews returned HTML, response timing, and security headers. It reports only issues it can prove and never invents a score.'
  },
  {
    title: 'Remember the same problem over time',
    description:
      'Each finding is fingerprinted from its normalized page path, rule slug, and stable occurrence key. Explanatory copy is excluded, so wording changes do not create alerts.'
  },
  {
    title: 'Show what changed since last time',
    description:
      'Findings become new, still present, or resolved. If a requested page is unavailable, the result is explicitly inconclusive and nothing is falsely resolved.'
  }
]

export default function AuditDocumentationPage() {
  return (
    <>
      <DocsHeader
        description="CodeRocket uses the access method you choose, checks what it can prove, then compares the result with the last complete check."
        eyebrow="Website health model"
        title="From website access to a clear health result."
      />

      <section className="py-10">
        <div className="grid gap-px border border-border bg-border lg:grid-cols-3">
          <CheckType
            description="CodeRocket opens the selected HTTPS pages from the cloud. This is the simplest option for websites that anyone can visit."
            icon={Cloud}
            label="Public website"
          />
          <CheckType
            description="CodeRocket first tests whether Cloudflare, a firewall, or an access screen allows the page. A blocked page is marked incomplete, never healthy."
            icon={ShieldCheck}
            label="Protected website"
          />
          <CheckType
            description="The cloud check stays off. A runner inside GitHub Actions or your own environment opens the page and sends only the result to CodeRocket."
            icon={LockKeyhole}
            label="Private application"
          />
        </div>
      </section>

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
            label="Still open"
            tone="signal"
          />
          <GateRule
            description="An issue missing from a reachable page is recorded as fixed."
            icon={CheckCircle2}
            label="Fixed"
            tone="success"
          />
          <GateRule
            description="A requested page could not be read. Previous findings stay open and the result is not marked healthy."
            icon={ScanSearch}
            label="Check incomplete"
            tone="signal"
          />
        </div>
      </section>

      <section className="border border-border bg-surface p-6 sm:p-8" id="http-checks">
        <ScanSearch aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-heading font-semibold text-xl">What is automatic today</h2>
        <p className="mt-3 text-muted leading-7">
          CodeRocket verifies HTTPS reachability, redirect safety, HTTP status, response time,
          selected security headers, robots.txt, the XML sitemap, and a conservative set of issues
          provable from returned source HTML. The same page is never downloaded once per rule.
        </p>
        <div className="mt-7 grid gap-px border border-border bg-border lg:grid-cols-3">
          <CheckType
            description="A maintained subset of deterministic HTML and HTTP rules runs on every monitored page. It creates alerts only when the returned evidence proves a problem."
            icon={ScanSearch}
            label="Live website checks"
          />
          <CheckType
            description="The CLI can inspect a deployed preview and submit its signed result, commit, branch, and pull-request context to the same comparison engine."
            icon={Code2}
            label="Preview and CI checks"
          />
          <CheckType
            description="All maintained Front-End Checklist rules stay available in CodeRocket, including browser, source-code, testing, privacy, and human-review guidance."
            icon={BookOpen}
            label="Complete rules reference"
          />
        </div>
        <p className="mt-6 border-border border-t pt-6 text-muted text-sm leading-6">
          The check itself does not use an LLM: finding identity, evidence, comparison, and
          resolution stay deterministic. After a finding is saved, the optional AI assistant can
          explain that proof and prepare a fix plan. CodeRocket still does not run a headless
          browser, execute client JavaScript, collect Lighthouse measurements, or compare pixels.
        </p>
      </section>

      <section className="mt-10 border border-border p-6 sm:p-8">
        <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">
          Upstream synchronization
        </p>
        <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
          Front-End Checklist remains the source of truth.
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          The rule pages, explanations, sources, priorities, and ruleset version are generated from
          the forked Front-End Checklist packages. An upstream merge updates this reference. New
          rules are not silently promoted to live alerts: they enter the automatic profile only
          after their detector can produce stable evidence without a browser or human judgment.
        </p>
      </section>
    </>
  )
}

function CheckType({
  description,
  icon: Icon,
  label
}: {
  description: string
  icon: typeof ScanSearch
  label: string
}) {
  return (
    <article className="bg-surface p-5">
      <Icon aria-hidden className="h-5 w-5 text-signal" />
      <h3 className="mt-5 font-heading font-semibold">{label}</h3>
      <p className="mt-2 text-muted text-sm leading-6">{description}</p>
    </article>
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
