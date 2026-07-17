import { ProductShell } from '@/components/product-shell'
import { SitesDirectory } from '@/components/sites-directory'
import { getDashboardData } from '@/lib/dashboard-data'
import { createPrivateMetadata } from '@/lib/seo'

export const metadata = createPrivateMetadata('Sites')

export default async function SitesPage() {
  const data = await getDashboardData()
  return (
    <ProductShell eyebrow="Website portfolio" title="Sites">
      <SitesDirectory projects={data.projects} />
    </ProductShell>
  )
}
