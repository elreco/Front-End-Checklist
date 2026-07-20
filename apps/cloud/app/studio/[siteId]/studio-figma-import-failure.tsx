import { FigmaBrandIcon } from '@repo/design-system/brand-icons'
import { ShieldCheck } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { RetrySiteImportForm } from './retry-site-import-form'

/** Offer a truthful Figma-specific recovery without showing website sign-in controls. */
export function StudioFigmaImportFailure({
  siteId,
  sourceUrl
}: {
  siteId: string
  sourceUrl: string
}) {
  const connectUrl = `/api/connections/figma/start?siteId=${encodeURIComponent(siteId)}&figmaUrl=${encodeURIComponent(sourceUrl)}`
  return (
    <section className="overflow-hidden border border-border bg-surface text-left shadow-sm">
      <div className="border-border border-b bg-background p-5 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center border border-signal bg-surface text-signal shadow-sm">
          <FigmaBrandIcon aria-hidden className="h-5 w-5" />
        </span>
        <p className="mt-5 font-mono text-signal text-xs uppercase tracking-[0.18em]">
          Figma source needs attention
        </p>
        <h2 className="mt-2 font-heading font-semibold text-3xl sm:text-4xl">
          The selected screens could not be read
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted leading-7">
          Make sure your Figma account can still open the file and that the selected frames have not
          been removed. Nothing was published and the previous version is unchanged.
        </p>
      </div>
      <div className="p-5 sm:p-7">
        <div className="mx-auto max-w-2xl">
          <div className="flex gap-3 border border-border bg-background p-4">
            <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p className="text-muted text-sm leading-6">
              Reconnecting grants read-only access to file content. CodeRocket never requests your
              Figma password or permission to edit designs.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <CodeRocketButton asChild size="lg">
              <a href={connectUrl}>
                <FigmaBrandIcon aria-hidden className="h-4 w-4" />
                Reconnect Figma
              </a>
            </CodeRocketButton>
            <RetrySiteImportForm secondary siteId={siteId} sourceType="figma" />
          </div>
          <p className="mt-3 text-muted text-xs leading-5">
            If access is already correct, try the design again. CodeRocket reuses the saved screen
            selection and does not count another website import.
          </p>
        </div>
      </div>
    </section>
  )
}
