'use client'

import { Search } from '@repo/design-system/icons'
import { CodeRocketInput } from '@repo/design-system/ui/coderocket-field'
import { CodeRocketSelect } from '@repo/design-system/ui/coderocket-select'
import { getCategoryLabel } from '@/lib/product-language'
import type { ProjectFinding } from '@/lib/project-data'
import {
  type FindingAdvancedFilters,
  resolveFindingImpact,
  resolveFindingSort
} from '@/lib/project-finding-groups'

/** Search, narrow, and order the grouped website problem list. */
export function ProjectFindingsControls({
  categories,
  filters,
  onChange,
  pages
}: {
  categories: ProjectFinding['category'][]
  filters: FindingAdvancedFilters
  onChange: (filters: FindingAdvancedFilters) => void
  pages: string[]
}) {
  function update<Key extends keyof FindingAdvancedFilters>(
    key: Key,
    value: FindingAdvancedFilters[Key]
  ) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="grid gap-3 border-border border-b bg-surface-raised p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-[minmax(230px,1.3fr)_repeat(4,minmax(150px,.7fr))]">
      <label
        className="font-mono text-[10px] text-muted uppercase tracking-[.1em]"
        htmlFor="finding-search"
      >
        Search problems
        <span className="relative mt-2 block">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <CodeRocketInput
            className="mt-0 min-h-11 pl-10"
            id="finding-search"
            onChange={event => update('query', event.target.value)}
            placeholder="Title, rule, page…"
            type="search"
            value={filters.query}
          />
        </span>
      </label>
      <FindingSelect
        id="finding-impact"
        label="Impact"
        onChange={value => update('impact', resolveFindingImpact(value))}
        options={[
          ['all', 'All impacts'],
          ['important', 'Important only'],
          ['critical', 'Critical'],
          ['high', 'High'],
          ['medium', 'Medium'],
          ['low', 'Low']
        ]}
        value={filters.impact}
      />
      <FindingSelect
        id="finding-category"
        label="Area"
        onChange={value => update('category', value)}
        options={[
          ['all', 'All areas'],
          ...categories.map(value => [value, getCategoryLabel(value)] as const)
        ]}
        value={filters.category}
      />
      <FindingSelect
        id="finding-page"
        label="Affected page"
        onChange={value => update('page', value)}
        options={[['all', 'All pages'], ...pages.map(value => [value, value] as const)]}
        value={filters.page}
      />
      <FindingSelect
        id="finding-sort"
        label="Sort by"
        onChange={value => update('sort', resolveFindingSort(value))}
        options={[
          ['priority', 'Highest impact'],
          ['status', 'New first'],
          ['affected-pages', 'Most pages affected'],
          ['title', 'Title A–Z']
        ]}
        value={filters.sort}
      />
    </div>
  )
}

function FindingSelect({
  id,
  label,
  onChange,
  options,
  value
}: {
  id: string
  label: string
  onChange: (value: string) => void
  options: ReadonlyArray<readonly [string, string]>
  value: string
}) {
  return (
    <label className="font-mono text-[10px] text-muted uppercase tracking-[.1em]" htmlFor={id}>
      {label}
      <CodeRocketSelect
        className="mt-2 w-full"
        id={id}
        onValueChange={onChange}
        options={options.map(([optionValue, optionLabel]) => ({
          label: optionLabel,
          value: optionValue
        }))}
        value={value}
      />
    </label>
  )
}
