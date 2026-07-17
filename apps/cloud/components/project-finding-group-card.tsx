'use client'

import { ExternalLink, EyeOff, FileSearch2, RotateCcw } from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import Link from 'next/link'
import { getCategoryLabel } from '@/lib/product-language'
import type { ProjectFinding } from '@/lib/project-data'
import { FindingAiAssistant } from './finding-ai-assistant'
import { FindingPriorityBadge, FindingStatusBadge } from './finding-badges'

export interface FindingGroup {
  category: ProjectFinding['category']
  evidence?: ProjectFinding['evidence']
  findings: ProjectFinding[]
  key: string
  message: string
  priority: ProjectFinding['priority']
  rule: string
  source: ProjectFinding['source']
  status: ProjectFinding['status']
  title: string
  workflowStatus: ProjectFinding['workflowStatus']
}

/** Render one grouped website problem with proof, guidance, and workflow actions. */
export function ProjectFindingGroupCard({
  documentationUrl,
  group,
  updateWorkflow
}: {
  documentationUrl: string
  group: FindingGroup
  updateWorkflow: (formData: FormData) => Promise<void>
}) {
  const paths = [...new Set(group.findings.map(finding => finding.path))]
  return (
    <article className="scroll-mt-24 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 max-w-5xl flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <FindingPriorityBadge priority={group.priority} />
            <FindingStatusBadge status={group.status} />
            <span className="font-mono text-[10px] text-muted uppercase tracking-[.12em]">
              {getCategoryLabel(group.category)}
            </span>
            {group.workflowStatus !== 'open' ? (
              <Badge size="sm" variant="secondary">
                {group.workflowStatus === 'muted' ? 'Ignored' : 'Reviewed'}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-3 font-heading font-semibold text-lg">{group.title}</h3>
          <p className="mt-1 text-muted text-sm leading-6">{group.message}</p>

          <details className="group mt-4 border border-border bg-background">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 font-mono text-[10px] text-signal uppercase tracking-[.12em] marker:content-none">
              <FileSearch2 aria-hidden className="h-4 w-4" /> View technical proof
              <span
                aria-hidden
                className="ml-auto transition-transform group-open:rotate-90 motion-reduce:transition-none"
              >
                →
              </span>
            </summary>
            <div className="border-border border-t px-4 py-3">
              <p className="text-sm leading-6">
                {group.evidence?.summary ?? 'Found by a maintained Front-End Checklist rule.'}
              </p>
              {group.evidence?.observed ? (
                <p className="mt-2 break-words font-mono text-muted text-xs">
                  Found: {group.evidence.observed}
                </p>
              ) : null}
              {group.evidence?.expected && !isGenericExpectation(group.evidence.expected) ? (
                <p className="mt-1 break-words font-mono text-muted text-xs">
                  Expected instead: {group.evidence.expected}
                </p>
              ) : null}
            </div>
          </details>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-muted text-xs">Found on:</span>
            {paths.slice(0, 6).map(path => (
              <code className="border border-border bg-background px-2 py-1 text-xs" key={path}>
                {path}
              </code>
            ))}
            {paths.length > 6 ? (
              <span className="text-muted text-xs">+{paths.length - 6}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-52 lg:justify-end">
          {group.status !== 'resolved' && group.findings[0] ? (
            <FindingAiAssistant
              findingId={group.findings[0].findingId}
              findingTitle={group.title}
              occurrenceId={group.findings[0].id}
              projectId={group.findings[0].projectId}
            />
          ) : null}
          <CodeRocketButton asChild size="sm" variant="outline">
            <Link
              aria-label="How to fix (opens in a new tab)"
              href={documentationUrl}
              rel="noreferrer"
              target="_blank"
            >
              How to fix <ExternalLink aria-hidden />
            </Link>
          </CodeRocketButton>
          <form action={updateWorkflow}>
            <input name="status" type="hidden" value={nextWorkflowStatus(group.workflowStatus)} />
            {group.findings.map(finding => (
              <input
                key={finding.findingId}
                name="findingId"
                type="hidden"
                value={finding.findingId}
              />
            ))}
            <CodeRocketButton size="sm" type="submit" variant="ghost">
              {group.workflowStatus === 'muted' ? (
                <RotateCcw aria-hidden />
              ) : (
                <EyeOff aria-hidden />
              )}
              {group.workflowStatus === 'muted' ? 'Track again' : 'Ignore for now'}
            </CodeRocketButton>
          </form>
        </div>
      </div>
    </article>
  )
}

function nextWorkflowStatus(status: ProjectFinding['workflowStatus']): 'muted' | 'open' {
  return status === 'muted' ? 'open' : 'muted'
}

function isGenericExpectation(value: string): boolean {
  return value === 'The linked Front-End Checklist rule should pass'
}
