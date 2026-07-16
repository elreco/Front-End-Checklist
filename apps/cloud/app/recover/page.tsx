import { RecoverForm } from './recover-form'

export const metadata = { title: 'Recover account' }

export default function RecoverPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-md px-5 py-16">
      <div className="rounded-none border border-border bg-surface p-8">
        <h1 className="font-bold font-heading text-3xl">Recover your account</h1>
        <p className="mt-3 text-muted">We will send a secure reset link to your email address.</p>
        <RecoverForm />
      </div>
    </main>
  )
}
