import {
  BitbucketBrandIcon,
  GitHubBrandIcon,
  GitLabBrandIcon
} from '@repo/design-system/brand-icons'
import { CheckCircle2, GitBranch, KeyRound, LockKeyhole, Terminal } from '@repo/design-system/icons'
import type { Metadata } from 'next'
import { DocsInlineCode } from '@/components/docs-inline-code'
import { DocsCodeBlock, DocsHeader } from '@/components/docs-shell'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Protected site access',
  description:
    'Let CodeRocket check protected pages from GitHub, GitLab, Bitbucket, or another environment that already has access.',
  path: '/docs/cli',
  image: '/docs/opengraph-image'
})

const platforms = [
  {
    title: 'GitHub',
    detail: '.github/workflows/coderocket.yml',
    secretLocation: 'Repository settings → Secrets and variables → Actions',
    icon: GitHubBrandIcon
  },
  {
    title: 'GitLab',
    detail: '.gitlab-ci.yml',
    secretLocation: 'Settings → CI/CD → Variables',
    icon: GitLabBrandIcon
  },
  {
    title: 'Bitbucket',
    detail: 'bitbucket-pipelines.yml',
    secretLocation: 'Repository settings → Repository variables',
    icon: BitbucketBrandIcon
  },
  {
    title: 'Another CI',
    detail: 'Any environment with Node.js 20+',
    secretLocation: 'Save CODEROCKET_TOKEN in the platform secret store',
    icon: Terminal
  }
]

const workflow = `name: CodeRocket secure website check

on:
  workflow_dispatch:
  schedule:
    - cron: '17 7 * * *'

jobs:
  protected-site-check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Check protected website HTML
        env:
          CODEROCKET_TOKEN: \${{ secrets.CODEROCKET_TOKEN }}
          CODEROCKET_SITE_HEADERS_JSON: \${{ secrets.CODEROCKET_SITE_HEADERS_JSON }}
        run: >-
          npx @coderocketapp/cli@latest audit 'https://example.com/'
          --page '/account'
          --environment production`

export default function CliDocumentationPage() {
  return (
    <>
      <DocsHeader
        description="Run the same website check from an environment that can already open protected pages. CodeRocket receives the result, never the private access headers."
        eyebrow="Protected website access"
        title="Check restricted pages without weakening their protection."
      />

      <section className="py-10">
        <Terminal aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-editorial text-4xl tracking-[-.025em]">Command contract</h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          Generate a token from the CodeRocket project, store it as a CI secret, and audit the HTTPS
          URL from an environment that can already reach it. Public websites normally use the
          automatic cloud checker and do not need this setup.
        </p>
        <div className="mt-6">
          <DocsCodeBlock language="bash">{`coderocket audit https://preview.example.com \\
  --explicit-pages \\
  --page / \\
  --page /pricing \\
  --authenticated-page /account \\
  --token "$CODEROCKET_TOKEN" \\
          --environment production`}</DocsCodeBlock>
        </div>
        <p className="mt-4 max-w-3xl text-muted text-sm leading-6">
          Each public <DocsInlineCode>--page</DocsInlineCode> and signed-in{' '}
          <DocsInlineCode>--authenticated-page</DocsInlineCode> stays on the same HTTPS website. A
          production result must contain every page configured in the project. The protected-site
          setup uses <DocsInlineCode>--environment production</DocsInlineCode> and can run manually
          or on a schedule.
        </p>
      </section>

      <section className="border-border border-y py-10">
        <LockKeyhole aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-editorial text-4xl tracking-[-.025em]">
          Access protected server-rendered pages
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          Store Cloudflare, preview, or gateway headers that apply to every page in{' '}
          <DocsInlineCode>CODEROCKET_SITE_HEADERS_JSON</DocsInlineCode>. Store the dedicated
          application cookie or authorization token in{' '}
          <DocsInlineCode>CODEROCKET_AUTH_HEADERS_JSON</DocsInlineCode>; it is added only to pages
          marked as requiring sign-in. Neither secret is included in the submitted result.
        </p>
        <div className="mt-6">
          <DocsCodeBlock language="json">{`{
  "cf-access-client-id": "client-id",
  "cf-access-client-secret": "client-secret"
}`}</DocsCodeBlock>
        </div>
        <div className="mt-4">
          <DocsCodeBlock language="json">{`{
  "cookie": "session=dedicated-test-session"
}`}</DocsCodeBlock>
        </div>
        <p className="mt-4 max-w-3xl text-muted text-sm leading-6">
          Use a dedicated, least-privileged test account. The secure runner reads returned HTML and
          response headers; it does not inspect repository source files, execute page JavaScript, or
          automate a multi-step sign-in, MFA, or CAPTCHA journey.
        </p>
        <p className="mt-3 max-w-3xl text-muted text-sm leading-6">
          Protection layers can be combined. A private application may require a self-hosted runner
          inside its network, Cloudflare Access headers, and an application session at the same
          time. The runner must be configured with every required layer; CI does not grant access
          automatically.
        </p>
      </section>

      <section className="py-10">
        <Terminal aria-hidden className="h-6 w-6 text-signal" />
        <h2 className="mt-5 font-editorial text-4xl tracking-[-.025em]">
          Choose where the secure check runs
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          Open a protected project and choose{' '}
          <strong className="text-foreground">Connect secure access</strong>. You can copy a safe
          handoff for a developer or hosting provider, or open the advanced configuration yourself.
          Shared instructions never include the revocable{' '}
          <DocsInlineCode>CODEROCKET_TOKEN</DocsInlineCode>.
        </p>
        <div className="mt-7 grid gap-px border border-border bg-border sm:grid-cols-2">
          {platforms.map(({ detail, icon: Icon, secretLocation, title }) => (
            <article className="bg-surface p-5" key={title}>
              <Icon aria-hidden className="h-5 w-5 text-signal" />
              <h3 className="mt-4 font-heading font-semibold">{title}</h3>
              <p className="mt-2 font-mono text-foreground text-xs">{detail}</p>
              <p className="mt-2 text-muted text-xs leading-5">{secretLocation}</p>
            </article>
          ))}
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
        <h2 className="mt-5 font-editorial text-4xl tracking-[-.025em]">
          Manual and scheduled GitHub check
        </h2>
        <p className="mt-4 max-w-3xl text-muted leading-7">
          The current generated workflow checks the protected live website manually and on a
          schedule. It does not automatically check every pull request or merge request. The setup
          dialog generates equivalent GitLab, Bitbucket, and generic runner configurations.
        </p>
        <div className="mt-6">
          <DocsCodeBlock language="yaml">{workflow}</DocsCodeBlock>
        </div>
      </section>

      <section className="border border-border bg-surface p-6 sm:p-8">
        <GitBranch aria-hidden className="h-6 w-6 text-muted" />
        <p className="mt-5 font-mono text-muted text-xs uppercase tracking-[.14em]">
          Separate planned feature
        </p>
        <h2 className="mt-3 font-heading font-semibold text-xl">
          Preview release protection is not enabled by this setup
        </h2>
        <p className="mt-3 max-w-3xl text-muted leading-7">
          Checking every MR or PR requires a deployed preview URL and a provider-specific trigger.
          CodeRocket will present that as a separate connection when the full preview workflow is
          available.
        </p>
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
