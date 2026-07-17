import { getPlanEntitlements } from '@coderocket/core'
import { Play, ShieldAlert } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import type { ProjectDetail, ProjectPageCheck } from '@/lib/project-data'
import { getPageHttpStatus, getProjectRecoveryKind } from '@/lib/project-recovery'
import { ProjectCliSetup } from './project-cli-setup'
import { ProjectSiteEditor } from './project-site-editor'

/** Put concrete page failures and their primary recovery action beside an incomplete result. */
export function ProjectAccessRecovery({
  project,
  retryAction
}: {
  project: ProjectDetail
  retryAction: () => Promise<void>
}) {
  const unavailablePages = project.latestPages.filter(page => !page.reachable)
  if (project.latestAudit?.gate !== 'inconclusive') return null
  const recoveryKind = getProjectRecoveryKind(unavailablePages)
  const content = getRecoveryContent(recoveryKind, project.accessMode !== 'public')
  const shouldEditFirst = recoveryKind === 'address' || recoveryKind === 'pages'
  const shouldUseCi = recoveryKind === 'access' || project.accessMode !== 'public'
  const canRetryCloud = project.accessMode === 'public'

  return (
    <div className="mt-5 border border-danger bg-background p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-base">{content.title}</h3>
          <p className="mt-1 text-muted text-sm leading-6">{content.description}</p>
          {unavailablePages.length > 0 ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {unavailablePages.slice(0, 4).map(page => (
                <li className="border border-border bg-surface p-3" key={page.path}>
                  <p className="truncate font-mono text-foreground text-xs">{page.path}</p>
                  <p className="mt-1 text-danger text-xs">{describePageFailure(page)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-danger text-xs">
              The previous check did not return reliable coverage details.
            </p>
          )}
          {unavailablePages.length > 4 ? (
            <p className="mt-2 text-muted text-xs">
              And {unavailablePages.length - 4} more unavailable{' '}
              {unavailablePages.length - 4 === 1 ? 'page' : 'pages'}.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {shouldEditFirst ? (
              <ProjectSiteEditor
                authenticatedPages={project.authenticatedPages}
                maxPages={getPlanEntitlements(project.plan).pagesPerProject}
                pages={project.pages}
                plan={project.plan}
                problemPaths={unavailablePages.map(page => page.path)}
                projectId={project.id}
                secureRunnerRequired={project.secureRunnerRequired}
                siteUrl={project.url}
                triggerLabel={
                  recoveryKind === 'address' ? 'Edit website address' : 'Fix monitored URLs'
                }
                variant="primary"
              />
            ) : null}
            {shouldUseCi ? (
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
            {canRetryCloud ? (
              <form action={retryAction}>
                <CodeRocketButton
                  size="sm"
                  type="submit"
                  variant={recoveryKind === 'temporary' ? 'primary' : 'outline'}
                >
                  <Play aria-hidden /> Retry cloud check
                </CodeRocketButton>
              </form>
            ) : null}
            {!shouldEditFirst ? (
              <ProjectSiteEditor
                authenticatedPages={project.authenticatedPages}
                maxPages={getPlanEntitlements(project.plan).pagesPerProject}
                pages={project.pages}
                plan={project.plan}
                problemPaths={unavailablePages.map(page => page.path)}
                projectId={project.id}
                secureRunnerRequired={project.secureRunnerRequired}
                siteUrl={project.url}
                triggerLabel="Edit URLs"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Translate a stored network failure into a concise page-level explanation. */
function describePageFailure(page: ProjectPageCheck): string {
  if (page.error?.includes('Cloudflare challenge')) return 'A challenge page was returned'
  if (page.error) return page.error
  const status = getPageHttpStatus(page)
  if (status) return `The website returned HTTP ${status}`
  return 'The expected HTML page could not be confirmed'
}

/** Explain the detected failure without steering every incomplete check toward CI. */
function getRecoveryContent(kind: ReturnType<typeof getProjectRecoveryKind>, privateSite: boolean) {
  if (kind === 'address')
    return {
      title: 'Check the website address',
      description:
        'CodeRocket could not find this hostname. Correct the website address, then start a fresh check.'
    }
  if (kind === 'pages')
    return {
      title: 'Correct the monitored URLs',
      description:
        'CodeRocket reached the website, but some selected addresses do not exist. Update or remove those pages, then check the corrected list.'
    }
  if (kind === 'access')
    return {
      title: 'Give CodeRocket secure access',
      description:
        'The website answered, but sign-in, a firewall, or a challenge blocked the cloud check. Run it from an environment that can already open these pages.'
    }
  return {
    title: 'Retry the incomplete check',
    description: privateSite
      ? 'The website could not return every selected page. Run the secure check again; edit the URLs if the failure continues.'
      : 'The website could not return every selected page. Retry first; edit the URLs if the failure continues.'
  }
}
