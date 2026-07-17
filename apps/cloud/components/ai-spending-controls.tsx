'use client'

import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { useState } from 'react'
import { updateAiSpendingSettings } from '@/app/settings/billing/actions'
import { MAX_AI_OVERAGE_BUDGET_EUR } from '@/lib/billing'

const quickBudgets = [
  { description: 'Stop when included credits are used.', label: 'Off', value: '0' },
  { description: 'Up to €10 of additional usage.', label: '€10', value: '10' },
  { description: 'Up to €20 of additional usage.', label: '€20', value: '20' },
  { description: 'Choose a whole-euro monthly maximum.', label: 'Custom', value: 'custom' }
]

/** Let paid Stripe accounts opt into a bounded monthly AI overage budget. */
export function AiSpendingControls({
  canManage,
  currentBudgetEuros,
  disabledReason
}: {
  canManage: boolean
  currentBudgetEuros: number
  disabledReason?: string
}) {
  const initialSelection = quickBudgets.some(option => option.value === String(currentBudgetEuros))
    ? String(currentBudgetEuros)
    : currentBudgetEuros > 0
      ? 'custom'
      : '0'
  const [selection, setSelection] = useState(initialSelection)
  const [customBudget, setCustomBudget] = useState(currentBudgetEuros > 0 ? currentBudgetEuros : 20)

  return (
    <form action={updateAiSpendingSettings} className="border border-border bg-background p-5">
      <fieldset disabled={!canManage}>
        <legend className="font-heading font-semibold text-lg">Monthly spending limit</legend>
        <p className="mt-2 text-muted text-sm leading-6" id="ai-budget-description">
          Included credits are always used first. This limit applies only to new paid analyses and
          resets every month.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {quickBudgets.map(option => (
            <label
              className="cursor-pointer border border-border p-3 transition-colors hover:border-signal has-disabled:cursor-not-allowed has-checked:border-accent has-checked:bg-accent/10 has-disabled:opacity-50"
              key={option.value}
            >
              <span className="flex items-center gap-2">
                <input
                  aria-describedby="ai-budget-description"
                  checked={selection === option.value}
                  className="accent-accent"
                  name="budgetEuros"
                  onChange={event => setSelection(event.currentTarget.value)}
                  type="radio"
                  value={option.value}
                />
                <span className="font-semibold text-sm">{option.label}</span>
              </span>
              <span className="mt-1 block pl-5 text-muted text-xs leading-5">
                {option.description}
              </span>
            </label>
          ))}
        </div>
        {selection === 'custom' ? (
          <label className="mt-4 block max-w-xs font-semibold text-sm" htmlFor="custom-ai-budget">
            Custom monthly maximum
            <CodeRocketInput
              id="custom-ai-budget"
              leadingContent="€"
              max={MAX_AI_OVERAGE_BUDGET_EUR}
              min={1}
              name="customBudgetEuros"
              onChange={event => setCustomBudget(Number(event.currentTarget.value))}
              required
              step={1}
              type="number"
              value={customBudget}
            />
            <span className="mt-2 block font-normal text-muted text-xs">
              Between €1 and €{MAX_AI_OVERAGE_BUDGET_EUR}. You can change or disable it at any time.
            </span>
          </label>
        ) : null}
      </fieldset>
      {disabledReason ? (
        <p className="mt-4 border border-warning bg-warning/10 p-3 text-sm text-warning">
          {disabledReason}
        </p>
      ) : null}
      <CodeRocketButton className="mt-5" disabled={!canManage} type="submit">
        Save AI budget
      </CodeRocketButton>
    </form>
  )
}
