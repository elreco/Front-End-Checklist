import { History, ShieldCheck } from '@repo/design-system/icons'
import type { ProjectDetail } from '@/lib/project-data'
import {
  getStabilityMilestoneLabel,
  getWebsiteLevelPresentation
} from '@/lib/website-level-presentation'
import { ProjectTechnicalDetails } from './project-technical-details'
import { ShareReportButton } from './share-report-button'
import { WebsiteLevelBadge, WebsiteLevelMark, WebsiteLevelScale } from './website-level'

/** Explain a website's quality level, its scope, and its independent stability history. */
export function ProjectLevelPanel({ project }: { project: ProjectDetail }) {
  const latest = project.latestAudit
  const presentation = getWebsiteLevelPresentation(project.level.level)
  const stabilityLabel = getStabilityMilestoneLabel(project.stability.milestone)
  const stabilityPercent = project.stability.nextTarget
    ? Math.min(100, (project.stability.checks / project.stability.nextTarget) * 100)
    : 100

  return (
    <section
      aria-labelledby="website-level-title"
      className="mt-5 grid border border-border bg-surface lg:grid-cols-[1.35fr_.65fr]"
    >
      <div className="border-border p-5 sm:p-6 lg:border-r">
        <div className="flex flex-col gap-5 sm:flex-row">
          <WebsiteLevelMark animate level={project.level.level} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[10px] text-muted uppercase tracking-[.16em]">
                Website level
              </p>
              <WebsiteLevelBadge level={project.level.level} />
            </div>
            <h2 className="mt-3 font-heading font-semibold text-2xl" id="website-level-title">
              {presentation.label}
            </h2>
            <p className="mt-2 max-w-2xl text-muted text-sm leading-6">
              {presentation.description}
            </p>
            <div className="mt-5">
              <WebsiteLevelScale result={project.level} />
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2">
          <LevelFact
            label="Verified scope"
            value={
              latest
                ? `${latest.checkedPageCount}/${latest.requestedPageCount} selected pages`
                : 'No complete check yet'
            }
          />
          <LevelFact
            label="Open problems"
            value={project.level.eligible ? String(project.level.openCount) : 'Not counted yet'}
          />
        </div>
        <p className="mt-4 text-muted text-xs leading-5">
          Your level uses the most serious open problem in the latest complete check. Marking an
          item as ignored hides it from your work list, but does not improve the level.
        </p>
        {latest ? (
          <ProjectTechnicalDetails
            pages={project.latestPages}
            rulesetVersion={latest.rulesetVersion}
          />
        ) : null}
      </div>

      <div className="flex flex-col justify-between gap-6 p-5 sm:p-6">
        <div>
          <div className="flex h-10 w-10 items-center justify-center border border-signal text-signal">
            <History aria-hidden className="h-5 w-5" />
          </div>
          <p className="mt-5 font-mono text-[10px] text-signal uppercase tracking-[.16em]">
            Stability history
          </p>
          <h3 className="mt-2 font-heading font-semibold text-xl">{stabilityLabel}</h3>
          <p className="mt-2 text-muted text-sm leading-6">
            {project.stability.checks === 0
              ? 'Complete clear checks with the current rules to start a stability history.'
              : `${project.stability.checks} complete ${project.stability.checks === 1 ? 'check has' : 'checks have'} finished without a new important problem.`}
          </p>
          <div className="mt-5 h-1.5 bg-background">
            <div
              className="h-full bg-signal transition-[width] duration-700"
              style={{ width: `${stabilityPercent}%` }}
            />
          </div>
          <p className="mt-2 text-muted text-xs">
            {project.stability.nextTarget
              ? `${project.stability.nextTarget - project.stability.checks} more ${project.stability.nextTarget - project.stability.checks === 1 ? 'check like this' : 'checks like this'} to reach ${getStabilityMilestoneLabel(project.stability.nextMilestone ?? 'steady')}.`
              : 'Proven is the highest stability milestone.'}
          </p>
        </div>
        {latest?.status === 'succeeded' ? (
          <div className="border border-border bg-background p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
              <p className="text-muted text-xs leading-5">
                Share this exact check. The private link can be revoked and never changes when a
                newer check runs.
              </p>
            </div>
            <div className="mt-4">
              <ShareReportButton
                auditId={latest.id}
                level={project.level.level}
                projectName={project.name}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** Render one transparent input used to calculate a website level. */
function LevelFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-4">
      <p className="font-mono text-[9px] text-muted uppercase tracking-[.12em]">{label}</p>
      <p className="mt-2 break-words font-semibold text-sm">{value}</p>
    </div>
  )
}
