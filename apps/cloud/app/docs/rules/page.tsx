import type { Metadata } from 'next'
import { DocsHeader } from '@/components/docs-shell'
import { RulesReferenceClient } from '@/components/rules-reference-client'
import {
  DOCUMENTATION_RULES,
  getDocumentationCategories,
  getRuleDocumentationUrl
} from '@/lib/docs'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Rules reference',
  description:
    'Browse the synchronized Front-End Checklist rules used by CodeRocket for accessibility, SEO, performance, security, HTML, CSS, and JavaScript guidance.',
  path: '/docs/rules',
  image: '/docs/opengraph-image',
  keywords: ['frontend checklist', 'frontend best practices', 'website quality rules']
})

export default function RulesReferencePage() {
  const categories = getDocumentationCategories()
  const rules = DOCUMENTATION_RULES.map(rule => ({
    categories: rule.categories,
    primaryCategory: rule.primaryCategory,
    priority: rule.priority,
    slug: rule.slug,
    title: rule.title,
    url: getRuleDocumentationUrl(rule)
  }))

  return (
    <>
      <DocsHeader
        description="This index is generated directly from the maintained fork. It is the canonical CodeRocket reference for rule identity, priority, implementation guidance, and verification."
        eyebrow="Synced rule corpus"
        title="Every rule behind the reference."
      />

      <RulesReferenceClient categories={categories} rules={rules} />
    </>
  )
}
