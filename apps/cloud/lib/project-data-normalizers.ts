import type {
  CheckProgressStage,
  FindingEvidence,
  GateStatus,
  SiteAccessMode
} from '@coderocket/core'

/** Normalize stored reachability modes while preserving legacy protected projects. */
export function resolveAccessMode(value: unknown): SiteAccessMode {
  return value === 'protected' || value === 'private' ? value : 'public'
}

/** Normalize optional evidence JSON without relying on a type assertion. */
export function resolveEvidence(value: unknown): FindingEvidence | undefined {
  if (!isUnknownRecord(value)) return undefined
  if (value.kind !== 'html' && value.kind !== 'header' && value.kind !== 'network') return undefined
  if (typeof value.summary !== 'string') return undefined
  return {
    kind: value.kind,
    summary: value.summary,
    observed: typeof value.observed === 'string' ? value.observed : undefined,
    expected: typeof value.expected === 'string' ? value.expected : undefined
  }
}

/** Normalize the owner-controlled workflow state stored for a finding. */
export function resolveWorkflowStatus(value: unknown): 'open' | 'acknowledged' | 'muted' {
  return value === 'acknowledged' || value === 'muted' ? value : 'open'
}

/** Normalize worker progress into the stages understood by the product UI. */
export function resolveCheckStage(value: unknown): CheckProgressStage {
  return value === 'starting' ||
    value === 'checking_pages' ||
    value === 'comparing' ||
    value === 'saving' ||
    value === 'retrying' ||
    value === 'completed'
    ? value
    : 'queued'
}

/** Normalize persisted gate values with a safe first-result fallback. */
export function resolveGate(value: unknown): GateStatus {
  return value === 'passed' || value === 'failed' || value === 'inconclusive'
    ? value
    : 'needs_baseline'
}

/** Narrow an unknown database JSON value to an object with string keys. */
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
