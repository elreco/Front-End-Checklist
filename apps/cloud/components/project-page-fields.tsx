import { Plus, Trash2 } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { getPlanLabel } from '@/lib/product-language'
import type { PlanId } from '@/lib/upgrade'
import { PageLimitUpsell } from './plan-limit-upsell'

interface ProjectPageFieldsProps {
  fieldId: string
  authenticatedPages: string[]
  initialPages: string[]
  maxPages: number
  onAdd: () => void
  onAccessToggle: (page: string) => void
  onRemove: (index: number) => void
  onUpdate: (index: number, value: string) => void
  pages: string[]
  plan: PlanId
  problemPaths: string[]
  showAccessToggles?: boolean
}

/** Edit the monitored page list and reveal plan capacity only when it becomes relevant. */
export function ProjectPageFields({
  fieldId,
  authenticatedPages,
  initialPages,
  maxPages,
  onAdd,
  onAccessToggle,
  onRemove,
  onUpdate,
  pages,
  plan,
  problemPaths,
  showAccessToggles = false
}: ProjectPageFieldsProps) {
  return (
    <fieldset>
      <div className="flex items-end justify-between gap-4">
        <div>
          <legend className="font-semibold text-sm">Pages to monitor</legend>
          <p className="mt-1 text-muted text-xs leading-5">
            Enter a path such as /pricing or paste a full URL from this website.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted">
          {pages.length}/{maxPages}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {pages.map((page, index) => {
          const needsAttention = problemPaths.includes(page)
          const requiresSignIn = authenticatedPages.includes(page)
          return (
            <div
              className={`grid grid-cols-[1fr_auto] items-center gap-2 border bg-background p-2 ${
                needsAttention ? 'border-danger' : 'border-border'
              }`}
              key={`${index}-${initialPages[index] ?? 'new'}`}
            >
              <label className="sr-only" htmlFor={`${fieldId}-page-${index}`}>
                Monitored page {index + 1}
              </label>
              <CodeRocketInput
                aria-invalid={needsAttention || undefined}
                className="mt-0 min-w-0"
                id={`${fieldId}-page-${index}`}
                onChange={event => onUpdate(index, event.target.value)}
                placeholder={index === 0 ? '/' : '/important-page'}
                required
                value={page}
              />
              <CodeRocketButton
                aria-label={`Remove monitored page ${page || index + 1}`}
                disabled={pages.length === 1}
                onClick={() => onRemove(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden />
              </CodeRocketButton>
              {showAccessToggles ? (
                <label className="col-span-2 flex cursor-pointer items-start gap-2 px-1 py-1 text-xs">
                  <input
                    checked={requiresSignIn}
                    className="mt-0.5 h-4 w-4 accent-signal"
                    disabled={!page.trim()}
                    onChange={() => onAccessToggle(page)}
                    type="checkbox"
                  />
                  <span>
                    <span className="font-semibold text-foreground">Sign-in required</span>
                    <span className="ml-1 text-muted">
                      — apply the dedicated test session only to this page.
                    </span>
                  </span>
                </label>
              ) : null}
              {needsAttention ? (
                <p className="col-span-2 px-1 text-danger text-xs">
                  This address failed in the latest check.
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      {pages.length < maxPages ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <CodeRocketButton onClick={onAdd} size="sm" type="button" variant="ghost">
            <Plus aria-hidden /> Add another page
          </CodeRocketButton>
          {pages.length === maxPages - 1 ? (
            <span className="font-mono text-[10px] text-muted uppercase tracking-[.08em]">
              1 page slot left on {getPlanLabel(plan)}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <PageLimitUpsell compact currentPages={maxPages} plan={plan} />
        </div>
      )}
    </fieldset>
  )
}
