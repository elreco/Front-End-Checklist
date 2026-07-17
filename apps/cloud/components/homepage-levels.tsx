import type { WebsiteLevel } from '@coderocket/core/website-level'
import { WebsiteLevelBadge, WebsiteLevelMark } from './website-level'

const PUBLIC_LEVELS: Array<{
  level: WebsiteLevel
  meaning: string
  requirement: string
}> = [
  {
    level: 'needs_attention',
    meaning: 'An urgent problem is open.',
    requirement: 'Fix urgent problems to enter the ranked levels.'
  },
  {
    level: 'bronze',
    meaning: 'No urgent problem is open.',
    requirement: 'Important problems can still remain.'
  },
  {
    level: 'silver',
    meaning: 'No urgent or important problem is open.',
    requirement: 'Recommended improvements can remain.'
  },
  {
    level: 'gold',
    meaning: 'Only optional improvements remain.',
    requirement: 'Resolve them to reach the highest level.'
  },
  {
    level: 'platinum',
    meaning: 'Every applicable automated finding is clear.',
    requirement: 'Keep checking to build a stability history.'
  }
]

/** Explain the transparent website-level system without presenting a vanity score. */
export function HomepageLevels() {
  return (
    <section className="border-border border-b px-5 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-signal text-xs uppercase tracking-[.18em]">
              A result people can understand
            </p>
            <h2 className="mt-5 font-editorial text-5xl leading-[.98] tracking-[-.03em] sm:text-7xl">
              A clear level,
              <br />
              <em>with the proof behind it.</em>
            </h2>
          </div>
          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-lg text-muted leading-8">
              CodeRocket does not invent a score out of 100. The most serious open problem sets the
              level, and an incomplete check gets no verified level at all.
            </p>
            <p className="mt-4 text-muted text-sm leading-6">
              Share a private report or an embeddable badge. Every result shows its pages, date,
              rule set, findings, and calculation method.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-px border border-border bg-border md:grid-cols-5">
          {PUBLIC_LEVELS.map(({ level, meaning, requirement }) => (
            <article className="bg-surface p-5" key={level}>
              <WebsiteLevelMark level={level} size="sm" />
              <div className="mt-5">
                <WebsiteLevelBadge level={level} />
              </div>
              <p className="mt-4 font-semibold text-sm leading-6">{meaning}</p>
              <p className="mt-2 text-muted text-xs leading-5">{requirement}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid border border-border bg-surface lg:grid-cols-[1fr_1.4fr]">
          <div className="border-border p-5 sm:p-6 lg:border-r">
            <p className="font-mono text-[10px] text-signal uppercase tracking-[.16em]">
              Beyond Platinum
            </p>
            <h3 className="mt-2 font-heading font-semibold text-xl">
              Quality is a snapshot. Stability takes time.
            </h3>
            <p className="mt-2 text-muted text-sm leading-6">
              Platinum stays the highest quality level. A separate history rewards consistency
              without moving the goalposts.
            </p>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-3">
            <Milestone checks="3" label="Steady" />
            <Milestone checks="10" label="Trusted" />
            <Milestone checks="30" label="Proven" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Render one long-running clear-check milestone. */
function Milestone({ checks, label }: { checks: string; label: string }) {
  return (
    <div className="bg-background p-5">
      <p className="font-editorial text-4xl">{checks}</p>
      <p className="mt-2 font-semibold">{label}</p>
      <p className="mt-1 text-muted text-xs leading-5">
        complete checks with no new important problem
      </p>
    </div>
  )
}
