import { getPlanEntitlements } from '@coderocket/core'
import { ExternalLink } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { ProjectDetail } from '@/lib/project-data'
import { ProjectCliSetup } from './project-cli-setup'
import { ProjectSiteEditor } from './project-site-editor'
import { ShareReportButton } from './share-report-button'

/** Keep persistent website actions available independently from the latest check state. */
export function ProjectHeaderActions({
  project,
  shareAuditId,
  showCiSetup = false
}: {
  project: ProjectDetail
  shareAuditId?: string
  showCiSetup?: boolean
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {showCiSetup ? (
        <ProjectCliSetup
          configured={project.apiTokenConfigured}
          pages={project.pages}
          plan={project.plan}
          projectId={project.id}
          siteUrl={project.url}
          triggerLabel="Set up the CI check"
        />
      ) : null}
      <ProjectSiteEditor
        accessMode={project.accessMode}
        checking={project.checking}
        maxPages={getPlanEntitlements(project.plan).pagesPerProject}
        pages={project.pages}
        plan={project.plan}
        projectId={project.id}
        siteUrl={project.url}
      />
      <CodeRocketButton asChild size="sm" variant="outline">
        <a href={project.url} rel="noreferrer" target="_blank">
          Visit site <ExternalLink aria-hidden />
        </a>
      </CodeRocketButton>
      {shareAuditId ? <ShareReportButton auditId={shareAuditId} /> : null}
    </div>
  )
}
