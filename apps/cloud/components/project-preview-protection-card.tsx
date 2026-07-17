import { GitBranch } from '@repo/design-system/icons'

/** Explain the separate preview-protection roadmap without overstating current behavior. */
export function ProjectPreviewProtectionCard() {
  return (
    <section className="h-full border border-border bg-surface p-5">
      <GitBranch aria-hidden className="h-5 w-5 text-muted" />
      <p className="mt-4 font-mono text-[10px] text-muted uppercase tracking-[.12em]">
        Planned · separate feature
      </p>
      <h2 className="mt-2 font-heading font-semibold text-lg">Protect preview releases</h2>
      <p className="mt-2 text-muted text-sm leading-6">
        Future preview protection will check each deployed MR or PR before publication. The current
        secure runner performs manual and scheduled checks; it does not automatically inspect every
        code change.
      </p>
    </section>
  )
}
