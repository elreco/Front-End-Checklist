import Link from 'next/link'
import { createPrivateMetadata } from '@/lib/seo'
import { RecoverForm } from './recover-form'

export const metadata = createPrivateMetadata('Recover account')

export default function RecoverPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-md px-5 py-16">
      <div className="rounded-none border border-border bg-surface p-8">
        <p className="font-mono text-accent text-xs uppercase tracking-[.16em]">Password help</p>
        <h1 className="mt-3 font-bold font-heading text-3xl">Reset your password</h1>
        <p className="mt-3 text-muted">
          Enter your sign-in email. We will send you a secure link to choose a new password.
        </p>
        <RecoverForm />
        <Link className="mt-5 block text-center text-muted text-sm hover:text-signal" href="/login">
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
