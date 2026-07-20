import type { Metadata } from 'next'
import { Benefits, Hero } from '@/components/marketing'
import { WebsiteRecreationForm } from '@/components/website-recreation-form'
import { createPublicMetadata } from '@/lib/seo'

export const metadata: Metadata = createPublicMetadata({
  title: 'Website health monitoring',
  description:
    'Optional website checks for accessibility, search visibility, security, performance, and frontend regressions.',
  path: '/monitoring',
  keywords: [
    'website health monitoring',
    'frontend monitoring',
    'website accessibility checker',
    'technical SEO monitoring'
  ]
})

/** Preserve the complete monitoring product as a distinct secondary capability. */
export default function MonitoringPage() {
  return (
    <main>
      <Hero />
      <Benefits />
      <section className="border-border border-t bg-surface px-5 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-signal text-xs uppercase tracking-[.18em]">
            Build instead of only checking
          </p>
          <h2 className="mt-6 font-editorial text-5xl leading-[.95] tracking-[-.035em] sm:text-7xl">
            Ready for a new version
            <br />
            <em>of this website?</em>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-muted leading-7">
            Paste its public address. CodeRocket will rebuild the visible pages as a private,
            editable website you can publish when you are ready.
          </p>
          <WebsiteRecreationForm className="mx-auto mt-8" idPrefix="monitoring-to-builder" />
        </div>
      </section>
    </main>
  )
}
