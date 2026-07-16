import type { Metadata } from 'next'
import { DocsHeader } from '@/components/docs-shell'
import { RulesReferenceClient } from '@/components/rules-reference-client'
import {
  DOCUMENTATION_RULES,
  getDocumentationCategories,
  getRuleDocumentationUrl
} from '@/lib/docs'

export const metadata: Metadata = {
  title: 'Rules reference',
  description: 'The automatically synchronized frontend rule reference used by CodeRocket.'
}

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
