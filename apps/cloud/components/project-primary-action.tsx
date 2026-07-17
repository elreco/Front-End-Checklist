import { getPlanEntitlements } from '@coderocket/core'
import { Play, RefreshCw } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { ProjectDetail } from '@/lib/project-data'
import { getProjectRecoveryKind } from '@/lib/project-recovery'
import { ProjectCliSetup } from './project-cli-setup'
import { ProjectSiteEditor } from './project-site-editor'

/** Select the project-level action that matches the latest reachability evidence. */
export function ProjectPrimaryAction({
  project,
  queueAction
}: {
  project: ProjectDetail
  queueAction: () => Promise<void>
}) {
  const unavailablePages = project.latestPages.filter(page => !page.reachable)
  const recoveryKind =
    project.latestAudit?.gate === 'inconclusive'
      ? getProjectRecoveryKind(unavailablePages)
      : undefined
  const requiresCi = project.accessMode === 'private' || recoveryKind === 'access'
  if (requiresCi)
    return (
      <ProjectCliSetup
        configured={project.apiTokenConfigured}
        pages={project.pages}
        plan={project.plan}
        projectId={project.id}
        receivedChecks={project.ciRuns}
        siteUrl={project.url}
      />
    )

  if (recoveryKind === 'address' || recoveryKind === 'pages')
    return (
      <ProjectSiteEditor
        accessMode={project.accessMode}
        checking={project.checking}
        maxPages={getPlanEntitlements(project.plan).pagesPerProject}
        pages={project.pages}
        plan={project.plan}
        problemPaths={unavailablePages.map(page => page.path)}
        projectId={project.id}
        siteUrl={project.url}
        triggerLabel={recoveryKind === 'address' ? 'Edit website address' : 'Fix monitored URLs'}
        variant="primary"
      />
    )

  return (
    <form action={queueAction}>
      <CodeRocketButton disabled={project.checking} size="sm" type="submit">
        {project.checking ? (
          <RefreshCw aria-hidden className="animate-spin" />
        ) : (
          <Play aria-hidden />
        )}
        {project.checking ? 'Checking…' : 'Check now'}
      </CodeRocketButton>
    </form>
  )
}
