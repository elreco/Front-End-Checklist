import { Send } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { BuilderSiteDetail } from '@/lib/builder-data'
import { publishBuilderSite } from './actions'

/** Keep deliberate publishing available from every studio panel without competing with building. */
export function StudioPublishAction({ site }: { site: BuilderSiteDetail }) {
  return (
    <form action={publishBuilderSite}>
      <input name="siteId" type="hidden" value={site.id} />
      <CodeRocketButton size="sm" type="submit" variant="outline">
        <Send aria-hidden /> {site.publishedAt ? 'Publish changes' : 'Publish'}
      </CodeRocketButton>
    </form>
  )
}
