import {
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSearch2,
  ShieldCheck
} from '@repo/design-system/icons'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DocsCodeBlock, DocsHeader } from '@/components/docs-shell'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'AI fix assistant',
  description:
    'How CodeRocket grounds AI explanations and fix plans in verified evidence and synchronized Front-End Checklist rules.',
  path: '/docs/ai',
  image: '/docs/opengraph-image'
})

const flow = [
  {
    icon: FileSearch2,
    title: 'Start with verified proof',
    description:
      'The assistant starts only from a finding already saved by the deterministic check: page, message, priority, and captured evidence.'
  },
  {
    icon: Database,
    title: 'Freeze the exact rule context',
    description:
      'CodeRocket records the ruleset version, rule slug, content hash, official sources, prompt version, and model used for the response.'
  },
  {
    icon: BrainCircuit,
    title: 'Explain for the right person',
    description:
      'Choose plain owner wording, a client-ready brief, or a developer-focused plan. The proof does not change with the audience.'
  },
  {
    icon: CheckCircle2,
    title: 'Verify with a fresh check',
    description:
      'AI never marks a finding fixed. After a human applies the change, a new deterministic check is the only way to resolve it.'
  }
]

export default function AiDocumentationPage() {
  return (
    <>
      <DocsHeader
        description="The assistant turns saved proof into an understandable plan. It has no permission to edit your website or decide that a problem is fixed."
        eyebrow="Grounded help, bounded authority"
        title="AI that explains the check — not AI that replaces it."
      />

      <ol className="grid gap-4 py-10 sm:grid-cols-2">
        {flow.map(({ description, icon: Icon, title }, index) => (
          <li className="border border-border bg-surface p-6" key={title}>
            <div className="flex items-center justify-between">
              <Icon aria-hidden className="h-5 w-5 text-signal" />
              <span className="font-mono text-muted text-xs">0{index + 1}</span>
            </div>
            <h2 className="mt-5 font-heading font-semibold text-xl">{title}</h2>
            <p className="mt-3 text-muted leading-7">{description}</p>
          </li>
        ))}
      </ol>

      <section className="border-border border-y py-10">
        <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">
          One traceable record
        </p>
        <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
          The answer keeps its receipts.
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          Every result is attached to one exact finding occurrence. If the rule corpus changes, the
          hash changes too; the old explanation remains historical instead of silently pretending it
          was generated from the new rule.
        </p>
        <div className="mt-6">
          <DocsCodeBlock>{`finding occurrence + rulesetVersion + ruleHash
+ promptVersion + model + token usage
→ one auditable AI explanation`}</DocsCodeBlock>
        </div>
      </section>

      <section className="grid gap-6 py-10 lg:grid-cols-2">
        <article className="border border-border bg-surface p-6">
          <ShieldCheck aria-hidden className="h-6 w-6 text-success" />
          <h2 className="mt-5 font-heading font-semibold text-xl">Safety boundaries</h2>
          <ul className="mt-4 space-y-3 text-muted text-sm leading-6">
            <li>Website text is explicitly treated as untrusted data, never as an instruction.</li>
            <li>Common secrets and credentials are removed before model submission.</li>
            <li>
              No shell, repository, browser, database, or deployment tool is available to the model.
            </li>
            <li>Structured output limits every field, list, and response shape.</li>
            <li>A human reviews and applies every suggested change.</li>
          </ul>
        </article>
        <article className="border border-border bg-surface p-6">
          <ClipboardCheck aria-hidden className="h-6 w-6 text-accent" />
          <h2 className="mt-5 font-heading font-semibold text-xl">What you receive</h2>
          <ul className="mt-4 space-y-3 text-muted text-sm leading-6">
            <li>A short explanation of what was seen and why it matters.</li>
            <li>A confidence level and honest limitations when evidence is incomplete.</li>
            <li>One to five practical steps, each with a verification method.</li>
            <li>Likely file patterns only when the evidence supports them.</li>
            <li>A brief ready to copy into an issue, email, or client task.</li>
          </ul>
        </article>
      </section>

      <section className="border border-border bg-surface p-6 sm:p-8">
        <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">
          Front-End Checklist remains the core
        </p>
        <h2 className="mt-4 font-editorial text-4xl tracking-[-.025em]">
          The same rules power checks, docs, MCP, and AI context.
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          CodeRocket loads the maintained rule prompts, AI context, verification steps, and
          authoritative sources directly from the fork. An upstream update therefore refreshes the
          official documentation and the grounding material together.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="font-mono text-accent text-xs hover:text-signal" href="/docs/rules">
            Browse website rules →
          </Link>
          <a
            className="font-mono text-accent text-xs hover:text-signal"
            href="https://frontendchecklist.io/mcp"
            rel="noreferrer"
            target="_blank"
          >
            Front-End Checklist MCP ↗
          </a>
        </div>
      </section>
    </>
  )
}
