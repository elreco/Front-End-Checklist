import { ArrowLeft, ArrowRight, Info } from '@repo/design-system/icons'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DocsMarkdown } from '@/components/docs-markdown'
import { DocsBreadcrumbs } from '@/components/docs-shell'
import { JsonLd } from '@/components/json-ld'
import {
  DOCUMENTATION_RULES,
  DOCUMENTATION_RULESET_VERSION,
  getAdjacentDocumentationRules,
  getCategoryLabel,
  getDocumentationRule,
  getRuleDocumentationUrl
} from '@/lib/docs'
import { absoluteUrl, createPublicMetadata, SITE_URL } from '@/lib/seo'

export const dynamicParams = false

export function generateStaticParams() {
  return DOCUMENTATION_RULES.map(rule => ({
    category: rule.primaryCategory,
    slug: rule.slug
  }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ category: string; slug: string }>
}): Promise<Metadata> {
  const { category, slug } = await params
  const rule = getDocumentationRule(category, slug)
  if (!rule) return { title: 'Rule not found' }
  return createPublicMetadata({
    title: rule.title,
    description:
      rule.description ??
      `${rule.title} — official CodeRocket ${getCategoryLabel(rule.primaryCategory)} rule reference.`,
    path: getRuleDocumentationUrl(rule),
    image: '/docs/opengraph-image',
    type: 'article',
    keywords: [
      rule.title,
      `${getCategoryLabel(rule.primaryCategory)} best practices`,
      'frontend checklist'
    ]
  })
}

/** Return the brand tone for a documented priority. */
function getPriorityClass(priority: string): string {
  if (priority === 'critical') return 'border-danger text-danger'
  if (priority === 'high') return 'border-accent text-accent'
  if (priority === 'medium') return 'border-signal text-signal'
  return 'border-border text-muted'
}

export default async function RuleDocumentationPage({
  params
}: {
  params: Promise<{ category: string; slug: string }>
}) {
  const { category, slug } = await params
  const rule = getDocumentationRule(category, slug)
  if (!rule) notFound()
  const adjacent = getAdjacentDocumentationRules(rule)
  const ruleUrl = absoluteUrl(getRuleDocumentationUrl(rule))
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${ruleUrl}#article`,
        headline: rule.title,
        description: rule.description,
        url: ruleUrl,
        mainEntityOfPage: ruleUrl,
        articleSection: getCategoryLabel(rule.primaryCategory),
        inLanguage: 'en',
        author: { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        isPartOf: { '@id': `${SITE_URL}/docs/rules#reference` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Docs', item: absoluteUrl('/docs') },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Rules',
            item: absoluteUrl('/docs/rules')
          },
          { '@type': 'ListItem', position: 3, name: rule.title, item: ruleUrl }
        ]
      }
    ]
  }

  return (
    <article>
      <JsonLd data={structuredData} />
      <DocsBreadcrumbs
        items={[
          { href: '/docs', label: 'Docs' },
          { href: '/docs/rules', label: 'Rules' },
          {
            href: `/docs/rules?category=${rule.primaryCategory}`,
            label: getCategoryLabel(rule.primaryCategory)
          },
          { label: rule.title }
        ]}
      />

      <header className="border-border border-b pb-8">
        <div className="flex flex-wrap gap-2 font-mono text-xs uppercase">
          <span className="border border-border px-3 py-1.5 text-muted">
            {getCategoryLabel(rule.primaryCategory)}
          </span>
          <span className={`border px-3 py-1.5 ${getPriorityClass(rule.priority)}`}>
            {rule.priority}
          </span>
          {rule.subcategory ? (
            <span className="border border-border px-3 py-1.5 text-muted">{rule.subcategory}</span>
          ) : null}
        </div>
        <h1 className="mt-6 max-w-4xl font-editorial text-5xl leading-[.96] tracking-[-.035em] sm:text-7xl">
          {rule.title}
        </h1>
        <p className="mt-5 font-mono text-muted text-xs">rule · {rule.slug}</p>
      </header>

      <aside className="my-8 grid gap-4 border border-border bg-surface p-5 sm:grid-cols-[auto_1fr]">
        <Info aria-hidden className="h-5 w-5 text-signal" />
        <div>
          <h2 className="font-heading font-semibold">How this reference maps to checks</h2>
          <p className="mt-2 text-muted text-sm leading-6">
            This page documents the maintained rule corpus. CodeRocket reports this rule
            automatically only when the source analyzer has enough static evidence. Runtime and
            manual verification guidance remains authoritative documentation, not a claimed
            automated pass.
          </p>
          <p className="mt-3 font-mono text-muted text-xs">
            ruleset · {DOCUMENTATION_RULESET_VERSION}
          </p>
        </div>
      </aside>

      <DocsMarkdown content={rule.content} />

      <nav
        aria-label="Adjacent rules"
        className="mt-12 grid gap-3 border-border border-t pt-7 sm:grid-cols-2"
      >
        {adjacent.previous ? (
          <Link
            className="border border-border bg-surface p-5 hover:border-signal"
            href={getRuleDocumentationUrl(adjacent.previous)}
          >
            <span className="flex items-center gap-2 font-mono text-muted text-xs uppercase">
              <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Previous rule
            </span>
            <span className="mt-3 block font-heading font-semibold">{adjacent.previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {adjacent.next ? (
          <Link
            className="border border-border bg-surface p-5 text-right hover:border-signal"
            href={getRuleDocumentationUrl(adjacent.next)}
          >
            <span className="flex items-center justify-end gap-2 font-mono text-muted text-xs uppercase">
              Next rule <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </span>
            <span className="mt-3 block font-heading font-semibold">{adjacent.next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  )
}
