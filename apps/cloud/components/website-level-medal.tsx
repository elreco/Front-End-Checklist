import type { WebsiteLevel } from '@coderocket/core/website-level'
import { CodeRocketMark } from '@repo/design-system/coderocket-logo'

type RankedWebsiteLevel = Exclude<WebsiteLevel, 'needs_attention' | 'unverified'>

interface MedalPalette {
  accent: string
  core: string
  dark: string
  highlight: string
  label: string
  mid: string
  ribbon: string
}

const MEDAL_PALETTES: Record<RankedWebsiteLevel, MedalPalette> = {
  bronze: {
    accent: '#f5b27c',
    core: '#29170f',
    dark: '#6f3d24',
    highlight: '#ffe0c5',
    label: 'Bronze',
    mid: '#d18b5b',
    ribbon: '#7c5cfc'
  },
  silver: {
    accent: '#e6eaf0',
    core: '#17191e',
    dark: '#59616d',
    highlight: '#ffffff',
    label: 'Silver',
    mid: '#bfc6d1',
    ribbon: '#22d3ee'
  },
  gold: {
    accent: '#ffd968',
    core: '#271d07',
    dark: '#876015',
    highlight: '#fff2b0',
    label: 'Gold',
    mid: '#eebc3d',
    ribbon: '#7c5cfc'
  },
  platinum: {
    accent: '#8cecff',
    core: '#071c22',
    dark: '#167587',
    highlight: '#e7fcff',
    label: 'Platinum',
    mid: '#42cde5',
    ribbon: '#7c5cfc'
  }
}

/** Render a tier-specific CodeRocket medal with progressively richer ornamentation. */
export function WebsiteLevelMedal({
  animate,
  level,
  size
}: {
  animate: boolean
  level: RankedWebsiteLevel
  size: 'lg' | 'sm'
}) {
  const palette = MEDAL_PALETTES[level]
  const compact = size === 'sm'
  const shellGradientId = `cr-${level}-medal-shell`
  const coreGradientId = `cr-${level}-medal-core`
  const clipId = `cr-${level}-medal-clip`
  const shadowId = `cr-${level}-medal-shadow`
  const ornate = level === 'gold' || level === 'platinum'

  return (
    <div
      aria-label={`${palette.label} website health level`}
      className={`relative shrink-0 ${compact ? 'h-14 w-12' : 'h-32 w-28'} ${animate ? 'cr-level-arrive' : ''}`}
      role="img"
    >
      <svg
        aria-hidden
        className={`h-full w-full overflow-visible ${animate ? 'cr-level-medal-live' : ''}`}
        viewBox="0 0 120 136"
      >
        <defs>
          <linearGradient id={shellGradientId} x1="28" x2="91" y1="18" y2="94">
            <stop offset="0" stopColor={palette.highlight} />
            <stop offset=".38" stopColor={palette.mid} />
            <stop offset="1" stopColor={palette.dark} />
          </linearGradient>
          <linearGradient id={coreGradientId} x1="43" x2="78" y1="34" y2="76">
            <stop offset="0" stopColor={palette.accent} />
            <stop offset="1" stopColor={palette.mid} />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M60 11 100 33v45L60 102 20 78V33Z" />
          </clipPath>
          <filter id={shadowId} height="150%" width="150%" x="-25%" y="-20%">
            <feDropShadow
              dx="0"
              dy="5"
              floodColor={palette.dark}
              floodOpacity=".38"
              stdDeviation="4"
            />
          </filter>
        </defs>

        <g className="cr-level-medal-ribbons">
          <path d="M29 72h27v57l-13-12-11 15Z" fill={palette.dark} />
          <path d="M35 77h19v42l-10-9-8 11Z" fill={palette.ribbon} />
          <path d="M64 72h27l-3 60-11-15-13 12Z" fill={palette.dark} />
          <path d="M66 77h19l-1 44-8-11-10 9Z" fill={palette.ribbon} />
          {ornate ? (
            <path
              d="M54 82h12v49l-6-8-6 8Z"
              fill={level === 'platinum' ? palette.accent : '#ff7a69'}
            />
          ) : null}
        </g>

        {level === 'platinum' ? (
          <g fill={palette.dark} stroke={palette.accent} strokeWidth="2">
            <path d="m27 39-17-9 5 16-11 8 18 5Z" />
            <path d="m93 39 17-9-5 16 11 8-18 5Z" />
            <path d="m42 19 4-15 14 12L73 4l5 16Z" />
          </g>
        ) : null}

        {level === 'gold' ? (
          <g fill={palette.mid} stroke={palette.highlight} strokeWidth="1.5">
            <path d="m24 43-13-7 5 13-9 7 15 4Z" />
            <path d="m96 43 13-7-5 13 9 7-15 4Z" />
          </g>
        ) : null}

        <g filter={`url(#${shadowId})`}>
          <path
            d="M60 7 105 31v50l-45 27L15 81V31Z"
            fill={palette.dark}
            stroke={palette.accent}
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <path
            d="M60 11 100 33v45L60 102 20 78V33Z"
            fill={`url(#${shellGradientId})`}
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M60 18 93 36v38L60 94 27 74V36Z"
            fill="none"
            opacity=".72"
            stroke={palette.dark}
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d="M60 23 88 39v32L60 88 32 71V39Z"
            fill={palette.core}
            opacity=".9"
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            d="M60 29 82 42v25L60 80 38 67V42Z"
            fill={`url(#${coreGradientId})`}
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        </g>

        <g clipPath={`url(#${clipId})`}>
          <path
            className={animate ? 'cr-level-medal-sheen' : undefined}
            d="m-22 83 39-72h15L-7 83Z"
            fill={palette.highlight}
            opacity=".22"
          />
        </g>

        <CodeRocketMark height="42" style={{ color: palette.core }} width="42" x="39" y="34" />

        <g className={animate ? 'cr-level-medal-spark' : undefined} fill={palette.highlight}>
          <path d="m31 27 1.7 4.3L37 33l-4.3 1.7L31 39l-1.7-4.3L25 33l4.3-1.7Z" />
        </g>
        <g
          className={animate ? 'cr-level-medal-spark cr-level-medal-spark-two' : undefined}
          fill={palette.highlight}
        >
          <path d="m88 67 1.3 3.2 3.2 1.3-3.2 1.3L88 76l-1.3-3.2-3.2-1.3 3.2-1.3Z" />
        </g>
      </svg>
    </div>
  )
}
