import { notFound, permanentRedirect } from 'next/navigation'
import { getRuleDocumentationUrlBySlug } from '@/lib/docs'

export default async function LegacyRuleDocumentationPage({
  params
}: PageProps<'/docs/rules/[category]'>) {
  const { category: legacySlug } = await params
  const destination = getRuleDocumentationUrlBySlug(legacySlug)
  if (destination === '/docs/rules') notFound()
  permanentRedirect(destination)
}
