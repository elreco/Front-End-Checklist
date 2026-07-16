'use client'

import { Search } from '@repo/design-system/icons'
import { CodeRocketButton } from '@repo/design-system/ui/coderocket-button'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import Link from 'next/link'
import { useMemo, useState } from 'react'

export interface DocumentationRuleSummary {
  categories: string[]
  primaryCategory: string
  priority: string
  slug: string
  title: string
  url: string
}

export interface DocumentationCategorySummary {
  category: string
  count: number
  label: string
}

/** Return priority-specific text styling for a rule summary. */
function getPriorityClass(priority: string): string {
  if (priority === 'critical') return 'text-danger'
  if (priority === 'high') return 'text-accent'
  if (priority === 'medium') return 'text-signal'
  return 'text-muted'
}

/** Search and filter the build-time rule snapshot without a production filesystem dependency. */
export function RulesReferenceClient({
  categories,
  rules
}: {
  categories: DocumentationCategorySummary[]
  rules: DocumentationRuleSummary[]
}) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const filteredRules = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean)
    return rules.filter(rule => {
      const categoryMatches = !selectedCategory || rule.primaryCategory === selectedCategory
      const searchableText = [rule.title, rule.slug.replaceAll('-', ' '), ...rule.categories]
        .join(' ')
        .toLowerCase()
      const queryMatches = queryTokens.every(token => searchableText.includes(token))
      return categoryMatches && queryMatches
    })
  }, [query, rules, selectedCategory])

  return (
    <>
      <section className="py-8">
        <label className="relative block" htmlFor="rule-search">
          <span className="sr-only">Search the CodeRocket rules</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <CodeRocketInput
            className="h-12 pl-11"
            id="rule-search"
            onChange={event => setQuery(event.currentTarget.value)}
            placeholder="Search by title, slug, or category"
            type="search"
            value={query}
          />
        </label>

        <div aria-label="Rule categories" className="mt-5 flex flex-wrap gap-2" role="group">
          <CodeRocketButton
            aria-pressed={!selectedCategory}
            onClick={() => setSelectedCategory('')}
            size="sm"
            type="button"
            variant={selectedCategory ? 'ghost' : 'secondary'}
          >
            All · {rules.length}
          </CodeRocketButton>
          {categories.map(category => {
            const active = selectedCategory === category.category
            return (
              <CodeRocketButton
                aria-pressed={active}
                key={category.category}
                onClick={() => setSelectedCategory(category.category)}
                size="sm"
                type="button"
                variant={active ? 'secondary' : 'ghost'}
              >
                {category.label} · {category.count}
              </CodeRocketButton>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="rules-results-title" className="border-border border-t pt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-heading font-semibold text-xl" id="rules-results-title">
            Rules reference
          </h2>
          <p aria-live="polite" className="font-mono text-muted text-xs">
            {filteredRules.length} results
          </p>
        </div>

        {filteredRules.length > 0 ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {filteredRules.map(rule => (
              <li
                className="relative border border-border bg-surface p-5"
                key={`${rule.primaryCategory}-${rule.slug}`}
              >
                <div className="flex items-center justify-between gap-4 font-mono text-xs uppercase">
                  <span className="text-muted">{rule.primaryCategory}</span>
                  <span className={getPriorityClass(rule.priority)}>{rule.priority}</span>
                </div>
                <h3 className="mt-4 font-heading font-semibold text-lg leading-6">
                  <Link className="after:absolute after:inset-0 after:content-['']" href={rule.url}>
                    {rule.title}
                  </Link>
                </h3>
                <p className="mt-3 font-mono text-muted text-xs">{rule.slug}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 border border-border border-dashed bg-surface px-6 py-12 text-center">
            <p className="font-heading font-semibold text-lg">No matching rule</p>
            <p className="mt-2 text-muted text-sm">
              Try a broader term or clear the category filter.
            </p>
          </div>
        )}
      </section>
    </>
  )
}
