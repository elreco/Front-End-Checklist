import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { getDashboardData } from '@/lib/dashboard-data'
import { createPrivateMetadata } from '@/lib/seo'

export const metadata = createPrivateMetadata('Dashboard')

export default async function DashboardPage() {
  const [data, context] = await Promise.all([getDashboardData(), getAppShellContext()])
  return (
    <ProductShell eyebrow="Your workspace" title="Overview">
      <DashboardOverview data={data} displayName={context.displayName} />
    </ProductShell>
  )
}
