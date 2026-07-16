import { CheckCircle2, GitBranch, KeyRound, Terminal } from '@repo/design-system/icons'
import type { Metadata } from 'next'
import { DocsCodeBlock, DocsHeader } from '@/components/docs-shell'

export const metadata: Metadata = {
  title: 'CLI & GitHub',
  description: 'Use the CodeRocket CLI and GitHub Actions to protect frontend pull requests.'
}

const workflow = `name: CodeRocket
on: pull_request

jobs:
  frontend-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Audit deployed preview
        run: >-
          npx @coderocket/cli@latest audit "\${{ vars.PREVIEW_URL }}"
          --token "\${{ secrets.CODEROCKET_TOKEN }}"
          --environment preview
          --sha "\${{ github.sha }}"
          --branch "\${{ github.head_ref }}"
          --pr "\${{ github.event.number }}"`

export default function CliDocumentationPage() {
  return (
    <>
      <DocsHeader
        description="Run the same audit engine after a preview deployment and let the process exit code become a required pull-request check."
        eyebrow="Continuous integration"
        title="Protect the merge, not just the dashboard."
      />

      <section className="py-10">
        <Terminal aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-editorial text-4xl tracking-[-.025em]">Command contract</h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          Generate a token from the CodeRocket project, store it as a CI secret, and audit the HTTPS
          preview URL after your hosting platform finishes deploying it.
        </p>
        <div className="mt-6">
          <DocsCodeBlock>{`coderocket audit https://preview.example.com \\
  --token "$CODEROCKET_TOKEN" \\
  --environment preview \\
  --sha "$GITHUB_SHA" \\
  --branch "feature/checkout" \\
  --pr "184"`}</DocsCodeBlock>
        </div>
      </section>

      <section className="grid gap-4 border-border border-y py-10 md:grid-cols-3">
        {[
          ['0', 'Healthy', 'No new important problem, or the ruleset requires a fresh baseline.'],
          ['1', 'Blocked', 'At least one new critical or high-priority finding was introduced.'],
          [
            '2',
            'Operational error',
            'Authentication, network, validation, execution, or an incomplete page check prevented a reliable result.'
          ]
        ].map(([code, label, description]) => (
          <article className="border border-border bg-surface p-5" key={code}>
            <p className="font-mono text-3xl text-signal">{code}</p>
            <h2 className="mt-4 font-heading font-semibold">{label}</h2>
            <p className="mt-2 text-muted text-sm leading-6">{description}</p>
          </article>
        ))}
      </section>

      <section className="py-10">
        <GitBranch aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-editorial text-4xl tracking-[-.025em]">GitHub Actions</h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          Keep the package on `@latest` so the workflow follows the maintained CodeRocket client.
          Configure the workflow name as a required check in the repository branch protection.
        </p>
        <div className="mt-6">
          <DocsCodeBlock>{workflow}</DocsCodeBlock>
        </div>
      </section>

      <section className="grid gap-6 border border-border bg-surface p-6 sm:grid-cols-[auto_1fr] sm:p-8">
        <KeyRound aria-hidden className="h-6 w-6 text-accent" />
        <div>
          <h2 className="font-heading font-semibold text-xl">Token and replay safety</h2>
          <ul className="mt-4 space-y-3 text-muted text-sm">
            {[
              'A token belongs to exactly one project and is shown only once.',
              'Only its SHA-256 hash is stored by CodeRocket.',
              'Commit-based idempotency prevents the same CI submission from creating duplicate runs.',
              'Audit payloads are validated and limited to 5 MB before persistence.'
            ].map(item => (
              <li className="flex gap-3" key={item}>
                <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
