'use client'

import { WandSparkles } from '@repo/design-system/icons'
import { CodeRocketTextarea } from '@repo/design-system/ui/coderocket-field'
import { useState } from 'react'

const suggestions = [
  'Make it feel more modern',
  'Turn it into an online shop',
  'Make it clearer for new customers'
]

/** Let a novice guide the first result without requiring technical implementation language. */
export function SiteCreationInstruction() {
  const [instruction, setInstruction] = useState('')

  return (
    <div className="mt-6 max-w-2xl">
      <label className="block font-semibold text-sm" htmlFor="initial-instruction">
        What should be different? <span className="font-normal text-muted">— optional</span>
      </label>
      <p className="mt-1 text-muted text-sm leading-6">
        Leave this empty for a faithful first version, or describe the result you want in everyday
        words.
      </p>
      <div className="relative mt-3">
        <WandSparkles
          aria-hidden
          className="pointer-events-none absolute top-4 left-4 h-5 w-5 text-signal"
        />
        <CodeRocketTextarea
          className="mt-0 min-h-28 resize-y pl-12"
          id="initial-instruction"
          maxLength={2000}
          name="initialInstruction"
          onChange={event => setInstruction(event.target.value)}
          placeholder="For example: keep the style, but turn it into an online shop with three sample products."
          value={instruction}
        />
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {suggestions.map(suggestion => (
          <button
            className="shrink-0 border border-border px-2.5 py-1.5 text-left text-muted text-xs hover:border-signal hover:bg-surface-raised hover:text-foreground"
            key={suggestion}
            onClick={() => setInstruction(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <p className="mt-2 text-muted text-xs leading-5">
        Your faithful copy stays recoverable. This request creates a second version and uses up to 6
        creation credits.
      </p>
    </div>
  )
}
