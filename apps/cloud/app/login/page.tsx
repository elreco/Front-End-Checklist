import { CodeRocketMark } from '@repo/design-system/coderocket-logo'
import { Check, GitPullRequest, History, ShieldCheck } from '@repo/design-system/icons'
import { Suspense } from 'react'
import { createPrivateMetadata } from '@/lib/seo'
import { LoginForm } from './login-form'

export const metadata = createPrivateMetadata('Sign in')

const accountBenefits = [
  { icon: History, text: 'Every generated change stays in recoverable version history' },
  { icon: GitPullRequest, text: 'Create and edit websites without opening a code screen' },
  { icon: ShieldCheck, text: 'Drafts stay private until you choose to publish' }
]

export default function LoginPage() {
  return (
    <main className="border-border border-b px-5">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl border-border border-x lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden border-border border-r bg-surface p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <CodeRocketMark className="absolute -right-24 -bottom-20 h-96 w-96 text-border" />
          <div className="relative">
            <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
              Your website workspace
            </p>
            <h2 className="mt-7 max-w-xl font-editorial text-6xl leading-[.95] tracking-[-.035em]">
              Build your website
              <br />
              <em>without the complexity.</em>
            </h2>
            <p className="mt-7 max-w-lg text-lg text-muted leading-8">
              Start from an existing website or Figma design, review an editable version, and
              publish it only when you are ready.
            </p>
            <ul className="mt-10 space-y-5">
              {accountBenefits.map(({ icon: Icon, text }) => (
                <li className="flex max-w-lg items-start gap-3 text-sm" key={text}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-background">
                    <Icon aria-hidden className="h-3.5 w-3.5 text-signal" />
                  </span>
                  <span className="pt-1 text-muted">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-14 border border-border bg-background p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-[.12em]">
              <span className="text-muted">Example website version</span>
              <span className="flex items-center gap-2 text-success">
                <Check aria-hidden className="h-3.5 w-3.5" /> ready
              </span>
            </div>
            <p className="mt-5 font-heading font-semibold text-xl">Acme storefront</p>
            <p className="mt-1 text-muted text-sm">Private draft · 5 pages · saved 14 minutes ago</p>
            <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-center">
              {[
                ['5', 'pages'],
                ['8', 'sections'],
                ['3', 'versions']
              ].map(([value, label]) => (
                <div className="bg-surface p-3" key={label}>
                  <p className="font-mono text-lg">{value}</p>
                  <p className="mt-1 text-muted text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center px-5 py-14 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-lg">
            <p className="font-mono text-accent text-xs uppercase tracking-[.2em]">Welcome back</p>
            <h1 className="mt-4 font-heading font-semibold text-4xl tracking-[-.03em] sm:text-5xl">
              Welcome back
            </h1>
            <p className="mt-4 max-w-md text-muted leading-7">
              Use the same email or social account as before. You can also request a secure sign-in
              link by email.
            </p>
            <Suspense
              fallback={
                <p className="mt-8 font-mono text-muted text-sm">Preparing secure sign-in…</p>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  )
}
