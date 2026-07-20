import { ShopifyBrandIcon, SupabaseBrandIcon } from '@repo/design-system/brand-icons'
import { ChevronDown } from '@repo/design-system/icons'
import type { ReactNode } from 'react'

/** Keep planned integrations discoverable without presenting them as available. */
export function StudioFutureConnections() {
  return (
    <details className="group/future p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs [&::-webkit-details-marker]:hidden">
        <span className="font-semibold">More services</span>
        <ChevronDown
          aria-hidden
          className="h-3.5 w-3.5 transition-transform group-open/future:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="mt-3 space-y-2">
        <FutureService icon={<ShopifyBrandIcon className="h-4 w-4" />} name="Shopify" />
        <FutureService icon={<SupabaseBrandIcon className="h-4 w-4" />} name="Supabase" />
      </div>
    </details>
  )
}

/** Label one planned provider consistently inside the progressive-disclosure list. */
function FutureService({ icon, name }: { icon: ReactNode; name: string }) {
  return (
    <div className="flex items-center gap-2 border border-border px-3 py-2 text-muted text-xs">
      {icon}
      <span>{name}</span>
      <span className="ml-auto font-mono text-[10px] uppercase">Later</span>
    </div>
  )
}
