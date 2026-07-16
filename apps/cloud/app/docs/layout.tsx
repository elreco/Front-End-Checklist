import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DocsShell } from '@/components/docs-shell'

export const metadata: Metadata = {
  title: {
    default: 'Documentation',
    template: '%s — CodeRocket Docs'
  },
  description:
    'Official CodeRocket documentation for audits, quality gates, CI integration, security, and frontend rules.'
}

export default function DocumentationLayout({ children }: { children: ReactNode }) {
  return <DocsShell>{children}</DocsShell>
}
