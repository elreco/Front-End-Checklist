import type { BuilderSiteDetail } from '@/lib/builder-data'
import { StudioBuildPanel } from './studio-build-panel'

/** Keep the prompt as the only permanent creation surface in the Studio workspace. */
export function StudioWorkspacePanel({ site }: { site: BuilderSiteDetail }) {
  return <StudioBuildPanel site={site} />
}
