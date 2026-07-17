'use client'

import { Badge } from '@repo/design-system/ui/badge'

/** Show fixability and confidence without exposing internal analysis terminology. */
export function ResultMeta({
  confidence,
  difficulty
}: {
  confidence: 'high' | 'medium' | 'low'
  difficulty: 'quick' | 'moderate' | 'advanced'
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">{difficultyLabel(difficulty)}</Badge>
      <Badge variant="outline">{confidenceLabel(confidence)}</Badge>
      <span className="font-mono text-[10px] text-muted uppercase tracking-[.12em]">
        Based on saved proof
      </span>
    </div>
  )
}

/** Convert the internal repairability value into an understandable label. */
function difficultyLabel(value: 'quick' | 'moderate' | 'advanced'): string {
  if (value === 'quick') return 'Straightforward fix'
  if (value === 'moderate') return 'Developer recommended'
  return 'Specialist review'
}

/** Convert the evidence confidence into an understandable label. */
function confidenceLabel(value: 'high' | 'medium' | 'low'): string {
  if (value === 'high') return 'Clear evidence'
  if (value === 'medium') return 'Review the evidence'
  return 'Needs confirmation'
}
