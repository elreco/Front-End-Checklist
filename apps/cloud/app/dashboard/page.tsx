import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { ProductShell } from '@/components/product-shell'
import { getAppShellContext } from '@/lib/app-shell-data'
import { getDashboardData } from '@/lib/dashboard-data'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const [data, context] = await Promise.all([getDashboardData(), getAppShellContext()])
  return (
    <ProductShell eyebrow="Your workspace" title="Overview">
      <DashboardOverview data={data} displayName={context.displayName} />
    </ProductShell>
  )
}
