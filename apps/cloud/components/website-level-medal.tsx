import type { WebsiteLevel } from '@coderocket/core/website-level'
import { CodeRocketMark } from '@repo/design-system/coderocket-logo'

type MedalWebsiteLevel = Exclude<WebsiteLevel, 'unverified'>

interface MedalPalette {
  accent: string
  core: string
  dark: string
  highlight: string
  label: string
  mid: string
  ribbon: string
  ribbonAlt: string
}

const MEDAL_PALETTES: Record<MedalWebsiteLevel, MedalPalette> = {
  needs_attention: {
    accent: '#ff806e',
    core: '#240b09',
    dark: '#661f19',
    highlight: '#ffd0c8',
    label: 'Needs attention',
    mid: '#bd493e',
    ribbon: '#35100d',
    ribbonAlt: '#ff806e'
  },
  bronze: {
    accent: '#f5b27c',
    core: '#29170f',
    dark: '#6f3d24',
    highlight: '#ffe0c5',
    label: 'Bronze',
    mid: '#d18b5b',
    ribbon: '#7c5cfc',
    ribbonAlt: '#ff806e'
  },
  silver: {
    accent: '#e6eaf0',
    core: '#17191e',
    dark: '#59616d',
    highlight: '#ffffff',
    label: 'Silver',
    mid: '#bfc6d1',
    ribbon: '#22d3ee',
    ribbonAlt: '#e6eaf0'
  },
  gold: {
    accent: '#ffd968',
    core: '#271d07',
    dark: '#876015',
    highlight: '#fff2b0',
    label: 'Gold',
    mid: '#eebc3d',
    ribbon: '#7c5cfc',
    ribbonAlt: '#ff806e'
  },
  platinum: {
    accent: '#8cecff',
    core: '#071c22',
    dark: '#167587',
    highlight: '#e7fcff',
    label: 'Platinum',
    mid: '#42cde5',
    ribbon: '#7c5cfc',
    ribbonAlt: '#22d3ee'
  }
}

/** Render a level-specific CodeRocket emblem with progressively richer ranked ornamentation. */
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
  const sizeClassName = size === 'sm' ? 'h-14 w-12' : size === 'md' ? 'h-28 w-24' : 'h-32 w-28'
  const shellGradientId = `cr-${level}-medal-shell`
  const coreGradientId = `cr-${level}-medal-core`
  const glowGradientId = `cr-${level}-medal-glow`
  const clipId = `cr-${level}-medal-clip`
  const shadowId = `cr-${level}-medal-shadow`
  const attention = level === 'needs_attention'
  const ornate = level === 'gold' || level === 'platinum'
  const embellished = level === 'silver' || ornate

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
        viewBox="0 0 120 136"
      >
        <defs>
          <linearGradient id={shellGradientId} x1="28" x2="91" y1="18" y2="94">
            <stop offset="0" stopColor={palette.highlight} />
            <stop offset=".3" stopColor={palette.accent} />
            <stop offset=".58" stopColor={palette.mid} />
            <stop offset="1" stopColor={palette.dark} />
          </linearGradient>
          <radialGradient id={coreGradientId} cx=".38" cy=".3" r=".8">
            <stop offset="0" stopColor={palette.highlight} />
            <stop offset=".38" stopColor={palette.accent} />
            <stop offset="1" stopColor={palette.mid} />
          </radialGradient>
          <linearGradient id={glowGradientId} x1="41" x2="81" y1="30" y2="78">
            <stop offset="0" stopColor={palette.accent} />
            <stop offset=".5" stopColor={palette.highlight} />
            <stop offset="1" stopColor={palette.accent} />
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
          <path d="M27 70h31l-2 62-13-13-13 15Z" fill={palette.dark} />
          <path d="M34 76h20l-2 45-9-9-8 11Z" fill={palette.ribbon} />
          <path d="m38 78 7 1-2 33-6 8Z" fill={palette.highlight} opacity=".42" />
          <path d="M62 70h31l-3 64-13-15-13 13Z" fill={palette.dark} />
          <path d="M66 76h20l-1 47-8-11-10 9Z" fill={palette.ribbonAlt} />
          <path d="m79 78 5-1 1 43-7-8Z" fill={palette.highlight} opacity=".35" />
          {ornate ? (
            <>
              <path d="M53 82h14v50l-7-9-7 9Z" fill={palette.dark} />
              <path d="M56 83h8v39l-4-5-4 5Z" fill={palette.accent} />
            </>
          ) : null}
        </g>

        {attention ? (
          <g fill={palette.dark} stroke={palette.accent} strokeWidth="2">
            <path d="m25 39-14-6 5 12-9 8 16 5Z" />
            <path d="m95 39 14-6-5 12 9 8-16 5Z" />
            <path d="m54 14 6-10 6 10-6 8Z" />
          </g>
        ) : null}

        {level === 'platinum' ? (
          <g fill={palette.dark} stroke={palette.accent} strokeWidth="2">
            <path d="m27 39-18-10 5 17-11 8 19 6Z" />
            <path d="m93 39 18-10-5 17 11 8-19 6Z" />
            <path d="m42 19 4-15 14 12L73 4l5 16Z" />
          </g>
        ) : embellished ? (
          <g fill={palette.mid} stroke={palette.highlight} strokeWidth="1.5">
            <path d="m24 43-13-7 5 13-9 7 15 5Z" />
            <path d="m96 43 13-7-5 13 9 7-15 5Z" />
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
            d="M60 13 97 34v42L60 99 23 76V34Z"
            fill="none"
            opacity=".5"
            stroke={palette.highlight}
            strokeLinejoin="round"
            strokeWidth="1"
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
          <path d="m28 37 32-18 32 18-12 5-20-11-20 11Z" fill={palette.highlight} opacity=".28" />
          <path d="m28 72 32 19 32-19-5 12-27 16-27-16Z" fill={palette.dark} opacity=".42" />
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
            stroke={`url(#${glowGradientId})`}
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d="M60 34 77 44v20L60 74 43 64V44Z"
            fill={palette.core}
            opacity=".22"
            stroke={palette.highlight}
            strokeWidth="1"
          />
        </g>

        <g clipPath={`url(#${clipId})`}>
          <path
            className={animate ? 'cr-level-medal-sheen' : undefined}
            d="m-22 83 39-72h15L-7 83Z"
            fill={palette.highlight}
            opacity=".22"
            style={animate ? { animationDelay: `${1000 + animationDelayMs}ms` } : undefined}
          />
        </g>

        <CodeRocketMark height="42" style={{ color: palette.core }} width="42" x="39" y="34" />

        <g
          className={animate ? 'cr-level-medal-spark' : undefined}
          fill={palette.highlight}
          style={animate ? { animationDelay: `${animationDelayMs}ms` } : undefined}
        >
          <path d="m31 27 1.7 4.3L37 33l-4.3 1.7L31 39l-1.7-4.3L25 33l4.3-1.7Z" />
        </g>
        <g
          className={animate ? 'cr-level-medal-spark cr-level-medal-spark-two' : undefined}
          fill={palette.highlight}
          style={animate ? { animationDelay: `${1250 + animationDelayMs}ms` } : undefined}
        >
          <path d="m88 67 1.3 3.2 3.2 1.3-3.2 1.3L88 76l-1.3-3.2-3.2-1.3 3.2-1.3Z" />
        </g>

        {attention ? (
          <g fill={palette.highlight}>
            <path d="M58 13h4l-1 10h-2Z" />
            <circle cx="60" cy="27" r="2" />
          </g>
        ) : null}
      </svg>
    </div>
  )
}
