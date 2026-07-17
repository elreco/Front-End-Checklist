import { getPlanEntitlements } from '@coderocket/core'
import { ExternalLink } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { ProjectDetail } from '@/lib/project-data'
import { ProjectCliSetup } from './project-cli-setup'
import { ProjectSiteEditor } from './project-site-editor'

/** Keep persistent website actions available independently from the latest check state. */
export function ProjectHeaderActions({
  project,
  showCiSetup = false
}: {
  project: ProjectDetail
  showCiSetup?: boolean
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {showCiSetup ? (
        <ProjectCliSetup
          configured={project.apiTokenConfigured}
          authenticatedPages={project.authenticatedPages}
          pages={project.pages}
          plan={project.plan}
          projectId={project.id}
          receivedChecks={project.ciRuns}
          siteUrl={project.url}
          triggerLabel="Connect secure access"
        />
      ) : null}
      <ProjectSiteEditor
        authenticatedPages={project.authenticatedPages}
        checking={project.checking}
        maxPages={getPlanEntitlements(project.plan).pagesPerProject}
        pages={project.pages}
        plan={project.plan}
        projectId={project.id}
        secureRunnerRequired={project.secureRunnerRequired}
        siteUrl={project.url}
      />
      <CodeRocketButton asChild size="sm" variant="outline">
        <a href={project.url} rel="noreferrer" target="_blank">
          Visit site <ExternalLink aria-hidden />
        </a>
      </CodeRocketButton>
    </div>
  )
}
