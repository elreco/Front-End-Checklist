import type { AiAudience } from '@coderocket/ai/schema'

export interface AiAudienceOption {
  detail: string
  label: string
  shortLabel: string
  value: AiAudience
}

export const AI_AUDIENCE_OPTIONS: ReadonlyArray<AiAudienceOption> = [
  {
    value: 'site_owner',
    label: 'Owner view',
    shortLabel: 'Owner',
    detail: 'Plain language, the impact, and a clear next action.'
  },
  {
    value: 'freelancer',
    label: 'Client view',
    shortLabel: 'Client',
    detail: 'A client-ready explanation and delivery guidance.'
  },
  {
    value: 'developer',
    label: 'Developer view',
    shortLabel: 'Developer',
    detail: 'Technical guidance, likely files, and precise checks.'
  }
]

/** Return the concise label used in contextual copy actions. */
export function aiAudienceLabel(audience: AiAudience): string {
  return AI_AUDIENCE_OPTIONS.find(option => option.value === audience)?.shortLabel ?? 'Owner'
}
