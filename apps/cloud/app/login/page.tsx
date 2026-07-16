import { CodeRocketMark } from '@repo/design-system/coderocket-logo'
import { Check, GitPullRequest, Radar, ShieldCheck } from '@repo/design-system/icons'
import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in' }

const accountBenefits = [
  { icon: Radar, text: 'Your historical provider reconnects the same identity' },
  { icon: GitPullRequest, text: 'New project data stays isolated to your account' },
  { icon: ShieldCheck, text: 'Private reports and project tokens remain protected' }
]

export default function LoginPage() {
  return (
    <main className="border-border border-b px-5">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl border-border border-x lg:grid-cols-[.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden border-border border-r bg-surface p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <CodeRocketMark className="absolute -right-24 -bottom-20 h-96 w-96 text-border" />
          <div className="relative">
            <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
              Your website control room
            </p>
            <h2 className="mt-7 max-w-xl font-editorial text-6xl leading-[.95] tracking-[-.035em]">
              Return to every website
              <br />
              <em>with context intact.</em>
            </h2>
            <p className="mt-7 max-w-lg text-lg text-muted leading-8">
              Use the same CodeRocket identity you already had. Your new health workspace starts
              clean; old generations, credits, and subscriptions are not imported.
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
              <span className="text-muted">Example website health</span>
              <span className="flex items-center gap-2 text-success">
                <Check aria-hidden className="h-3.5 w-3.5" /> passed
              </span>
            </div>
            <p className="mt-5 font-heading font-semibold text-xl">Acme storefront</p>
            <p className="mt-1 text-muted text-sm">Production · 12 pages · 14 minutes ago</p>
            <div className="mt-5 grid grid-cols-3 gap-px bg-border text-center">
              {[
                ['0', 'new'],
                ['11', 'persistent'],
                ['7', 'resolved']
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
              Sign in to CodeRocket
            </h1>
            <p className="mt-4 max-w-md text-muted leading-7">
              Continue with your historical provider, password, or a secure magic link. No new
              identity is created.
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
