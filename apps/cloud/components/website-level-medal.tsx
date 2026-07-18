import { CodeRocketMark } from '@repo/design-system/coderocket-logo'
import { useId } from 'react'
import { MEDAL_PALETTES, type MedalWebsiteLevel } from './website-level-medal-palettes'

/** Render the shared ribbon medal in one level-specific material palette. */
export function WebsiteLevelMedal({
  animate,
  animationDelayMs = 0,
  level,
  size
}: {
  animate: boolean
  animationDelayMs?: number
  level: MedalWebsiteLevel
  size: 'lg' | 'md' | 'sm'
}) {
  const palette = MEDAL_PALETTES[level]
  const sizeClassName = size === 'sm' ? 'h-14 w-14' : size === 'md' ? 'h-28 w-28' : 'h-32 w-32'
  const instanceId = useId().replaceAll(':', '')
  const idPrefix = `cr-${level}-${size}-${instanceId}-medal`
  const backdropGradientId = `${idPrefix}-backdrop`
  const shellGradientId = `${idPrefix}-shell`
  const centerGradientId = `${idPrefix}-center`
  const leftRibbonGradientId = `${idPrefix}-left-ribbon`
  const rightRibbonGradientId = `${idPrefix}-right-ribbon`
  const clipId = `${idPrefix}-clip`
  const shadowId = `${idPrefix}-shadow`

  return (
    <div
      aria-label={`${palette.label} website health level`}
      className={`relative shrink-0 ${sizeClassName} ${animate ? 'cr-level-arrive' : ''}`}
      role="img"
    >
      <svg
        aria-hidden
        className={`h-full w-full overflow-visible ${animate ? 'cr-level-medal-live' : ''}`}
        style={animate ? { animationDelay: `${800 + animationDelayMs}ms` } : undefined}
        viewBox="0 0 256 262"
      >
        <defs>
          <linearGradient id={backdropGradientId} x1="54" x2="202" y1="32" y2="224">
            <stop offset="0" stopColor={palette.backdropTop} />
            <stop offset="1" stopColor={palette.backdropBottom} />
          </linearGradient>
          <linearGradient id={shellGradientId} x1="76" x2="184" y1="54" y2="204">
            <stop offset="0" stopColor={palette.shellTop} />
            <stop offset="1" stopColor={palette.shellBottom} />
          </linearGradient>
          <linearGradient id={centerGradientId} x1="94" x2="164" y1="76" y2="181">
            <stop offset="0" stopColor={palette.centerTop} />
            <stop offset="1" stopColor={palette.centerBottom} />
          </linearGradient>
          <linearGradient id={leftRibbonGradientId} x1="78" x2="113" y1="145" y2="246">
            <stop offset="0" stopColor={palette.ribbonLeft} />
            <stop offset="1" stopColor={palette.shadow} />
          </linearGradient>
          <linearGradient id={rightRibbonGradientId} x1="144" x2="182" y1="145" y2="246">
            <stop offset="0" stopColor={palette.ribbonRight} />
            <stop offset="1" stopColor={palette.shadow} />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M121 50c4-2 10-2 14 0l57 33c4 3 7 7 7 12v66c0 5-3 9-7 12l-57 33c-4 2-10 2-14 0l-57-33c-4-3-7-7-7-12V95c0-5 3-9 7-12Z" />
          </clipPath>
          <filter height="150%" id={shadowId} width="150%" x="-25%" y="-18%">
            <feDropShadow
              dx="0"
              dy="6"
              floodColor={palette.shadow}
              floodOpacity=".38"
              stdDeviation="4.5"
            />
          </filter>
        </defs>

        <g filter={`url(#${shadowId})`}>
          <circle cx="128" cy="128" fill={`url(#${backdropGradientId})`} r="106" />
          <path
            d="M181 29h-18M214 57h-46M219 85h-20M24 150h19M20 171h28M31 199h29M177 228h18"
            fill="none"
            stroke={`url(#${backdropGradientId})`}
            strokeLinecap="round"
            strokeWidth="14"
          />
          <path
            d="M46 80a100 100 0 0 1 143-37"
            fill="none"
            opacity=".38"
            stroke={palette.highlight}
            strokeLinecap="round"
            strokeWidth="4"
          />
          <path
            d="M222 139a100 100 0 0 1-135 84"
            fill="none"
            opacity=".3"
            stroke={palette.shadow}
            strokeLinecap="round"
            strokeWidth="7"
          />
          <path d="m128 43 71 41v82l-71 41-71-41V84Z" fill={palette.shadow} opacity=".16" />
        </g>

        <g className="cr-level-medal-ribbons" filter={`url(#${shadowId})`}>
          <path
            d="m103 117 50 29-58 99c-1 3-5 3-6 0l-14-22-26-1c-3 0-5-3-3-6Z"
            fill={`url(#${leftRibbonGradientId})`}
          />
          <path d="m87 174 25 14-32 55-25-14Z" fill={palette.ribbonLeftStripe} opacity=".82" />
          <path
            d="m153 117-50 29 58 99c1 3 5 3 6 0l14-22 26-1c3 0 5-3 3-6Z"
            fill={`url(#${rightRibbonGradientId})`}
          />
          <path d="m169 174-25 14 32 55 25-14Z" fill={palette.ribbonRightStripe} opacity=".82" />
        </g>

        <path
          d="M121 57c4-2 10-2 14 0l57 33c4 3 7 7 7 12v66c0 5-3 9-7 12l-57 33c-4 2-10 2-14 0l-57-33c-4-3-7-7-7-12v-66c0-5 3-9 7-12Z"
          fill={palette.shadow}
          opacity=".36"
        />

        <g filter={`url(#${shadowId})`}>
          <path
            d="M121 50c4-2 10-2 14 0l57 33c4 3 7 7 7 12v66c0 5-3 9-7 12l-57 33c-4 2-10 2-14 0l-57-33c-4-3-7-7-7-12V95c0-5 3-9 7-12Z"
            fill={`url(#${shellGradientId})`}
            stroke={palette.edge}
            strokeWidth="4"
          />
          <path
            d="m128 55 66 38v70l-66 38-66-38V93Z"
            fill="none"
            opacity=".68"
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="3.5"
          />
          <path d="m128 72 50 29v54l-50 29-50-29v-54Z" fill={palette.shadow} opacity=".2" />
          <path
            d="m128 73 48 28v54l-48 28-48-28v-54Z"
            fill={`url(#${centerGradientId})`}
            stroke={palette.edge}
            strokeLinejoin="round"
            strokeWidth="3.5"
          />
          <path
            d="m128 78 43 25v49l-43 25-43-25v-49Z"
            fill="none"
            opacity=".55"
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="M142 72h-28l14 56-30-50-20 20 50 30-57-14v28l57-14-50 30 20 20 30-50-14 57h28l-14-57 30 50 20-20-50-30 57 14v-28l-57 14 50-30-20-20-30 50Z"
            fill={palette.highlight}
            opacity=".16"
          />
          <path
            d="m65 92 56-33c4-2 10-2 14 0l54 31"
            fill="none"
            opacity=".72"
            stroke={palette.highlight}
            strokeLinecap="round"
            strokeWidth="4"
          />
        </g>

        <g clipPath={`url(#${clipId})`}>
          <path
            className={animate ? 'cr-level-medal-sheen' : undefined}
            d="M-80 238 45 0h25L-55 238Z"
            fill={palette.highlight}
            opacity=".24"
            style={animate ? { animationDelay: `${1000 + animationDelayMs}ms` } : undefined}
          />
        </g>

        <CodeRocketMark height="60" style={{ color: palette.logo }} width="60" x="98" y="98" />

        <g
          className={animate ? 'cr-level-medal-spark' : undefined}
          fill={palette.sparkle}
          style={animate ? { animationDelay: `${animationDelayMs}ms` } : undefined}
        >
          <path d="m171 88 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
        </g>
        <g
          className={animate ? 'cr-level-medal-spark cr-level-medal-spark-two' : undefined}
          fill={palette.sparkle}
          style={animate ? { animationDelay: `${1250 + animationDelayMs}ms` } : undefined}
        >
          <path d="m91 154 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
        </g>
      </svg>
    </div>
  )
}
