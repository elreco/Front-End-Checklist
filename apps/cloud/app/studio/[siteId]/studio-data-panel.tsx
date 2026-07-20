import { Check, Database, Plus } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { createBuilderCollection } from './actions'

const presets = [
  ['products', 'Products', 'Names, prices, images, and availability.'],
  ['contacts', 'Contacts', 'People who submit a contact form.'],
  ['bookings', 'Bookings', 'Appointments, dates, and their status.']
] as const

/** Present managed application data as familiar business lists, never database tables. */
export function StudioDataPanel({ site }: { site: BuilderSiteDetail }) {
  return (
    <div>
      <div className="border-border border-b p-4">
        <p className="font-mono text-signal text-xs uppercase tracking-[.16em]">Data</p>
        <h2 className="mt-1 font-heading font-semibold text-xl">Your website’s information</h2>
        <p className="mt-2 text-muted text-sm leading-6">
          CodeRocket stores it securely for you. There are no tables, policies, or keys to
          configure.
        </p>
      </div>
      <div className="border-border border-b bg-background p-4">
        <div className="flex items-start gap-3">
          <Database aria-hidden className="mt-0.5 h-5 w-5 text-success" />
          <div>
            <p className="flex items-center gap-2 font-semibold">
              Managed data <Check aria-hidden className="h-4 w-4 text-success" />
            </p>
            <p className="mt-1 text-muted text-xs leading-5">
              Ready by default. Advanced users can connect their own Supabase later.
            </p>
          </div>
        </div>
      </div>
      {site.collections.length > 0 ? (
        <div className="space-y-2 p-4">
          <p className="font-mono text-muted text-xs uppercase tracking-[.14em]">Your lists</p>
          {site.collections.map(collection => (
            <div
              className="flex items-center justify-between border border-border p-3"
              key={collection.id}
            >
              <div>
                <p className="font-semibold text-sm">{collection.name}</p>
                <p className="mt-1 text-muted text-xs">Ready to receive information</p>
              </div>
              <span className="font-mono text-success text-xs">READY</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <p className="font-semibold text-sm">What should the website remember?</p>
          <p className="mt-1 text-muted text-xs leading-5">
            Choose a familiar starting point. You can rename every field later.
          </p>
        </div>
      )}
      <div className="grid gap-2 px-4 pb-4">
        {presets
          .filter(([, name]) => !site.collections.some(collection => collection.name === name))
          .map(([preset, name, detail]) => (
            <form action={createBuilderCollection} key={preset}>
              <input name="siteId" type="hidden" value={site.id} />
              <input name="preset" type="hidden" value={preset} />
              <CodeRocketButton
                className="h-auto w-full justify-start py-3 text-left"
                type="submit"
                variant="outline"
              >
                <Plus aria-hidden />
                <span>
                  <span className="block">{name}</span>
                  <span className="block font-normal text-muted text-xs">{detail}</span>
                </span>
              </CodeRocketButton>
            </form>
          ))}
      </div>
    </div>
  )
}
