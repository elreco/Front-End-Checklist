import type { WebsiteLevel, WebsiteLevelResult } from '@coderocket/core/website-level'
import { AlertTriangle, CheckCircle2, HelpCircle } from '@repo/design-system/icons'
import {
  getWebsiteLevelNextStep,
  getWebsiteLevelPresentation
} from '@/lib/website-level-presentation'
import { WebsiteLevelMedal } from './website-level-medal'

const RANKED_LEVELS: Array<Exclude<WebsiteLevel, 'unverified' | 'needs_attention'>> = [
  'bronze',
  'silver',
  'gold',
  'platinum'
]

/** Render a compact website level label with a non-color status cue. */
export function WebsiteLevelBadge({ level }: { level: WebsiteLevel }) {
  const presentation = getWebsiteLevelPresentation(level)
  const Icon =
    level === 'unverified' ? HelpCircle : level === 'needs_attention' ? AlertTriangle : CheckCircle2
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 font-mono font-semibold text-[10px] uppercase tracking-[.08em] ${presentation.borderClassName} ${presentation.backgroundClassName} ${presentation.textClassName}`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {presentation.label}
    </span>
  )
}

/** Render a branded health emblem, keeping only unverified results deliberately neutral. */
export function WebsiteLevelMark({
  animate = false,
  animationDelayMs = 0,
  level,
  size = 'lg'
}: {
  animate?: boolean
  animationDelayMs?: number
  level: WebsiteLevel
  size?: 'lg' | 'md' | 'sm'
}) {
  if (level !== 'unverified')
    return (
      <WebsiteLevelMedal
        animate={animate}
        animationDelayMs={animationDelayMs}
        level={level}
        size={size}
      />
    )
  const presentation = getWebsiteLevelPresentation(level)
  const sizeClassName = size === 'sm' ? 'h-14 w-12' : size === 'md' ? 'h-28 w-24' : 'h-32 w-28'
  return (
    <div
      aria-label={`${presentation.label} website health level`}
      className={`relative flex shrink-0 items-center justify-center border ${sizeClassName} ${presentation.borderClassName} ${presentation.backgroundClassName} ${presentation.textClassName} ${animate ? 'cr-level-arrive' : ''}`}
      role="img"
    >
      <svg aria-hidden className="absolute inset-1" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          fill="none"
          opacity="0.34"
          r="43"
          stroke="currentColor"
          strokeDasharray="2 8"
          strokeWidth="1.5"
        />
        <path
          d="M50 8 82 26 92 61 68 88 32 88 8 61 18 26Z"
          fill="none"
          opacity="0.7"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <span className={`font-mono font-semibold ${size === 'sm' ? 'text-sm' : 'text-xl'}`}>—</span>
    </div>
  )
}

/** Show the full level scale and expose the current position without a vanity score. */
export function WebsiteLevelScale({ result }: { result: WebsiteLevelResult }) {
  const currentIndex = RANKED_LEVELS.indexOf(
    result.level === 'bronze' ||
      result.level === 'silver' ||
      result.level === 'gold' ||
      result.level === 'platinum'
      ? result.level
      : 'bronze'
  )
  return (
    <div>
      <div
        aria-label={`Current website health level: ${getWebsiteLevelPresentation(result.level).label}`}
        className="grid grid-cols-4 gap-1"
      >
        {RANKED_LEVELS.map((level, index) => {
          const presentation = getWebsiteLevelPresentation(level)
          const active =
            result.eligible && result.level !== 'needs_attention' && index <= currentIndex
          return (
            <div key={level}>
              <div
                className={`h-1.5 transition-colors duration-500 ${active ? presentation.progressClassName : 'bg-surface-raised'}`}
              />
              <p
                className={`mt-2 font-mono text-[9px] uppercase tracking-[.08em] ${level === result.level ? presentation.textClassName : 'text-muted'}`}
              >
                {presentation.label}
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-muted text-xs leading-5">{getWebsiteLevelNextStep(result)}</p>
    </div>
  )
}
