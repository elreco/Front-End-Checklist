import { Square } from '@repo/design-system/icons'
import { RetrySiteImportForm } from './retry-site-import-form'

/** Explain an owner-requested stop without misdiagnosing it as a website access failure. */
export function StudioCancelledCreation({ siteId }: { siteId: string }) {
  return (
    <section className="border border-border bg-surface p-6 text-center sm:p-9">
      <span className="mx-auto flex h-12 w-12 items-center justify-center border border-signal text-signal">
        <Square aria-hidden className="h-5 w-5" />
      </span>
      <p className="mt-5 font-mono text-signal text-xs uppercase tracking-[.18em]">
        Stopped safely
      </p>
      <h2 className="mt-2 font-heading font-semibold text-3xl sm:text-4xl">Creation stopped</h2>
      <p className="mx-auto mt-3 max-w-xl text-muted leading-7">
        Nothing was published. The reserved creation credits were returned, and you can start again
        from the same website whenever you are ready.
      </p>
      <RetrySiteImportForm className="mt-6" siteId={siteId} />
    </section>
  )
}
