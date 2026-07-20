import { notFound } from 'next/navigation'
import { ProductShell } from '@/components/product-shell'
import { getBuilderBrowserHandoff } from '@/lib/builder-browser-handoff-data'
import { getBuilderSite } from '@/lib/builder-data'
import { createPrivateMetadata } from '@/lib/seo'
import { StudioContent } from './studio-content'
import { StudioPublishAction } from './studio-publish-action'

export const metadata = createPrivateMetadata('Website studio')

export default async function StudioPage({
  params,
  searchParams
}: {
  params: Promise<{ siteId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ siteId }, query] = await Promise.all([params, searchParams])
  const site = await getBuilderSite(siteId)
  if (!site) notFound()
  const handoff =
    site.status === 'waiting_for_access' ? await getBuilderBrowserHandoff(siteId) : undefined
  const notice = Array.isArray(query.notice) ? query.notice[0] : query.notice
  const panel = Array.isArray(query.panel) ? query.panel[0] : query.panel
  const requestedPage = Array.isArray(query.page) ? query.page[0] : query.page

  return (
    <ProductShell
      action={site.document ? <StudioPublishAction site={site} /> : undefined}
      eyebrow="Website project"
      title={site.name}
      workspace
    >
      <StudioContent
        handoff={handoff}
        notice={notice}
        openPanel={panel}
        requestedPage={requestedPage}
        site={site}
      />
    </ProductShell>
  )
}
