import type { AiAudience, AiFindingAnalysis, StoredAiFindingAnalysis } from '@coderocket/ai/schema'

export interface FindingResolutionCopy {
  assistantTask: string
  clientBrief: string
  developerTask: string
  simpleExplanation: string
}

interface CopySource {
  title: string
  url: string
}

/** Build consistent copy formats from one saved, evidence-grounded analysis. */
export function buildFindingResolutionCopy({
  findingTitle,
  result,
  sources
}: {
  findingTitle: string
  result: StoredAiFindingAnalysis
  sources: CopySource[]
}): FindingResolutionCopy {
  const normalized = normalizeAnalysis(result)
  const references = formatReferences(sources)
  const acceptanceCriteria = formatAcceptanceCriteria(normalized.steps)
  const developerTask = [
    '# CodeRocket remediation task',
    '',
    `## Problem`,
    findingTitle,
    '',
    normalized.developerSummary,
    '',
    '## Verified evidence',
    `Observed: ${normalized.observed}`,
    `Expected: ${normalized.expected}`,
    '',
    '## Implementation steps',
    formatSteps(normalized.steps, 'developer'),
    ...(normalized.likelyFiles.length > 0
      ? ['', '## Likely places to inspect', normalized.likelyFiles.join('\n')]
      : []),
    '',
    '## Acceptance criteria',
    acceptanceCriteria,
    '',
    '## Final verification',
    'Run the relevant project tests, then run a fresh CodeRocket check. Do not consider the finding resolved until that check passes.',
    ...references
  ].join('\n')

  return {
    simpleExplanation: [
      normalized.ownerSummary,
      '',
      `Why it matters: ${normalized.ownerImpact}`,
      '',
      `What CodeRocket found: ${normalized.observed}`,
      '',
      'What to do next:',
      formatSteps(normalized.steps, 'site_owner'),
      '',
      'After the change, run a fresh CodeRocket check to confirm the problem is fixed.'
    ].join('\n'),
    clientBrief: [
      `Website improvement: ${findingTitle}`,
      '',
      normalized.clientSummary,
      '',
      `Why this matters: ${normalized.clientImpact}`,
      '',
      'Recommended work:',
      formatSteps(normalized.steps, 'freelancer'),
      '',
      'The work is complete when:',
      acceptanceCriteria
    ].join('\n'),
    developerTask,
    assistantTask: [
      'Help me resolve the following frontend issue verified by CodeRocket.',
      '',
      'Inspect the repository before editing. Locate the real source of the rendered output, make the smallest safe change, preserve existing behaviour and styling, and do not invent files or measurements.',
      '',
      developerTask,
      '',
      'When finished, summarize the files changed, the checks run, and anything that still requires human review.'
    ].join('\n')
  }
}

interface NormalizedAnalysis {
  clientImpact: string
  clientSummary: string
  developerSummary: string
  expected: string
  likelyFiles: string[]
  observed: string
  ownerImpact: string
  ownerSummary: string
  steps: Array<{
    guidance: Record<AiAudience, string>
    title: string
    verification: string
  }>
}

/** Normalize current and legacy saved analyses into one copy-ready shape. */
function normalizeAnalysis(result: StoredAiFindingAnalysis): NormalizedAnalysis {
  if (isCurrentAnalysis(result)) {
    return {
      clientImpact: result.presentations.freelancer.whyItMatters,
      clientSummary: result.presentations.freelancer.summary,
      developerSummary: result.presentations.developer.summary,
      expected: result.diagnosis.expected,
      likelyFiles: result.likelyFiles.map(file => `- \`${file.pattern}\`: ${file.reason}`),
      observed: result.diagnosis.observed,
      ownerImpact: result.presentations.site_owner.whyItMatters,
      ownerSummary: result.presentations.site_owner.summary,
      steps: result.nextSteps
    }
  }

  return {
    clientImpact: result.whyItMatters,
    clientSummary: result.summary,
    developerSummary: result.summary,
    expected: result.diagnosis.expected,
    likelyFiles: result.likelyFiles.map(file => `- \`${file.pattern}\`: ${file.reason}`),
    observed: result.diagnosis.observed,
    ownerImpact: result.whyItMatters,
    ownerSummary: result.summary,
    steps: result.nextSteps.map(step => ({
      guidance: {
        developer: step.explanation,
        freelancer: step.explanation,
        site_owner: step.explanation
      },
      title: step.title,
      verification: step.verification
    }))
  }
}

/** Format numbered remediation steps for one target reader. */
function formatSteps(steps: NormalizedAnalysis['steps'], audience: AiAudience): string {
  return steps
    .map((step, index) => `${index + 1}. ${step.title}: ${step.guidance[audience]}`)
    .join('\n')
}

/** Convert deterministic checks into task acceptance criteria. */
function formatAcceptanceCriteria(steps: NormalizedAnalysis['steps']): string {
  return steps.map(step => `- ${step.verification}`).join('\n')
}

/** Append official references only when they were saved with the finding. */
function formatReferences(sources: CopySource[]): string[] {
  if (sources.length === 0) return []
  return [
    '',
    '## Official references',
    ...sources.map(source => `- ${source.title}: ${source.url}`)
  ]
}

/** Detect the current stored analysis schema. */
function isCurrentAnalysis(result: StoredAiFindingAnalysis): result is AiFindingAnalysis {
  return 'version' in result && result.version === 2
}
