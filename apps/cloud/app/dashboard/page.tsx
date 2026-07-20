import { BuilderDashboardOverview } from '@/components/dashboard/builder-dashboard-overview'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { listBuilderSites } from '@/lib/builder-data'
import { createPrivateMetadata } from '@/lib/seo'

export const metadata = createPrivateMetadata('Dashboard')

export default async function DashboardPage() {
  const [sites, context] = await Promise.all([listBuilderSites(), getAppShellContext()])
  return (
    <ProductShell eyebrow="Your workspace" title="Website builder">
      <BuilderDashboardOverview
        displayName={context.displayName}
        plan={context.plan}
        sites={sites}
      />
    </ProductShell>
  )
}
