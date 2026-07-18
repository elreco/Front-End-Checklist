import { CodeRocketMark } from '@repo/design-system/coderocket-logo'
import { MEDAL_PALETTES, type MedalWebsiteLevel } from './website-level-medal-palettes'

/** Render the shared Figma-inspired medal silhouette in one level-specific material palette. */
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
  const idPrefix = `cr-${level}-${size}-medal`
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
          <linearGradient id={shellGradientId} x1="84" x2="180" y1="50" y2="204">
            <stop offset="0" stopColor={palette.shellTop} />
            <stop offset=".48" stopColor={palette.edge} />
            <stop offset="1" stopColor={palette.shellBottom} />
          </linearGradient>
          <linearGradient id={centerGradientId} x1="102" x2="155" y1="91" y2="175">
            <stop offset="0" stopColor={palette.centerTop} />
            <stop offset="1" stopColor={palette.centerBottom} />
          </linearGradient>
          <linearGradient id={leftRibbonGradientId} x1="72" x2="111" y1="154" y2="246">
            <stop offset="0" stopColor={palette.ribbonLeftStripe} />
            <stop offset=".22" stopColor={palette.ribbonLeft} />
            <stop offset="1" stopColor={palette.shadow} />
          </linearGradient>
          <linearGradient id={rightRibbonGradientId} x1="145" x2="187" y1="154" y2="246">
            <stop offset="0" stopColor={palette.ribbonRightStripe} />
            <stop offset=".22" stopColor={palette.ribbonRight} />
            <stop offset="1" stopColor={palette.shadow} />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M121 43c4-2 10-2 14 0l66 38c4 2 7 7 7 12v75c0 5-3 10-7 12l-66 38c-4 2-10 2-14 0l-66-38c-4-2-7-7-7-12V93c0-5 3-10 7-12Z" />
          </clipPath>
          <filter height="145%" id={shadowId} width="145%" x="-22%" y="-16%">
            <feDropShadow
              dx="0"
              dy="7"
              floodColor={palette.shadow}
              floodOpacity=".34"
              stdDeviation="5"
            />
          </filter>
        </defs>

        <g filter={`url(#${shadowId})`}>
          <circle cx="128" cy="126" fill={`url(#${backdropGradientId})`} r="105" />
          <path
            d="M43 94a94 94 0 0 1 164-25"
            fill="none"
            opacity=".35"
            stroke={palette.highlight}
            strokeLinecap="round"
            strokeWidth="5"
          />
          <path
            d="M218 142a94 94 0 0 1-157 64"
            fill="none"
            opacity=".32"
            stroke={palette.shadow}
            strokeLinecap="round"
            strokeWidth="8"
          />
          <circle
            cx="128"
            cy="126"
            fill="none"
            opacity=".18"
            r="94"
            stroke={palette.highlight}
            strokeWidth="2"
          />
        </g>

        <g className="cr-level-medal-ribbons" filter={`url(#${shadowId})`}>
          <path
            d="m91 137 47 27-43 80c-2 3-6 3-8 0l-12-22-25-1c-4 0-6-4-4-7Z"
            fill={`url(#${leftRibbonGradientId})`}
          />
          <path d="m83 173 23 13-28 51-12-20Z" fill={palette.ribbonLeftStripe} opacity=".84" />
          <path
            d="m165 137-47 27 43 80c2 3 6 3 8 0l12-22 25-1c4 0 6-4 4-7Z"
            fill={`url(#${rightRibbonGradientId})`}
          />
          <path d="m173 173-23 13 28 51 12-20Z" fill={palette.ribbonRightStripe} opacity=".84" />
        </g>

        <path
          d="M121 50c4-2 10-2 14 0l66 38c4 2 7 7 7 12v75c0 5-3 10-7 12l-66 38c-4 2-10 2-14 0l-66-38c-4-2-7-7-7-12v-75c0-5 3-10 7-12Z"
          fill={palette.shadow}
          opacity=".35"
        />

        <g filter={`url(#${shadowId})`}>
          <path
            d="M121 43c4-2 10-2 14 0l66 38c4 2 7 7 7 12v75c0 5-3 10-7 12l-66 38c-4 2-10 2-14 0l-66-38c-4-2-7-7-7-12V93c0-5 3-10 7-12Z"
            fill={`url(#${shellGradientId})`}
            stroke={palette.edge}
            strokeWidth="5"
          />
          <path
            d="m128 55 66 38v76l-66 38-66-38V93Z"
            fill="none"
            opacity=".72"
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <path
            d="m128 68 55 32v63l-55 32-55-32v-63Z"
            fill={palette.shadow}
            opacity=".78"
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="5"
          />
          <path
            d="m128 80 45 26v51l-45 26-45-26v-51Z"
            fill={`url(#${centerGradientId})`}
            stroke={palette.edge}
            strokeLinejoin="round"
            strokeWidth="4"
          />
          <path
            d="m128 91 35 20v41l-35 20-35-20v-41Z"
            fill={palette.highlight}
            opacity=".18"
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="m65 93 56-33c4-2 10-2 14 0l54 31"
            fill="none"
            opacity=".7"
            stroke={palette.highlight}
            strokeLinecap="round"
            strokeWidth="5"
          />
        </g>

        <g clipPath={`url(#${clipId})`}>
          <path
            className={animate ? 'cr-level-medal-sheen' : undefined}
            d="M-86 238 45 0h28L-58 238Z"
            fill={palette.highlight}
            opacity=".28"
            style={animate ? { animationDelay: `${1000 + animationDelayMs}ms` } : undefined}
          />
        </g>

        <CodeRocketMark height="80" style={{ color: palette.logo }} width="80" x="88" y="87" />

        <g
          className={animate ? 'cr-level-medal-spark' : undefined}
          fill={palette.sparkle}
          style={animate ? { animationDelay: `${animationDelayMs}ms` } : undefined}
        >
          <path d="m177 73 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
        </g>
        <g
          className={animate ? 'cr-level-medal-spark cr-level-medal-spark-two' : undefined}
          fill={palette.sparkle}
          style={animate ? { animationDelay: `${1250 + animationDelayMs}ms` } : undefined}
        >
          <path d="m79 144 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
        </g>
      </svg>
    </div>
  )
}
