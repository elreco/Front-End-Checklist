import {
  createSiteBundleDocument,
  createSiteDocument,
  type SiteDocument,
  type SiteSourceBlueprint,
  siteDocumentSchema
} from '@coderocket/core'
import { createServiceClient } from '@coderocket/db'
import { getSupabaseServerConfig } from './supabase/config'
import { createSupabaseServerClient } from './supabase/server'

export interface BuilderSiteSummary {
  id: string
  name: string
  publishedAt?: string
  slug: string
  sourceMode: 'owned' | 'inspiration'
  sourceUrl: string
  status: 'queued' | 'analyzing' | 'ready' | 'failed' | 'published'
  statusMessage?: string
  updatedAt: string
}

export interface BuilderSiteDetail extends BuilderSiteSummary {
  document?: SiteDocument
  error?: string
  revisionNumber?: number
}

export interface PublishedBuilderSite {
  document: SiteDocument
  name: string
}

const demoBlueprint: SiteSourceBlueprint = {
  accentColor: '#1f5947',
  backgroundColor: '#f4f1e8',
  brandName: 'Northstar Studio',
  capturedAt: '2026-07-19T10:00:00.000Z',
  description: 'An independent creative studio for ambitious organisations.',
  foregroundColor: '#181711',
  navigation: [
    { href: 'https://example.com/work', label: 'Work' },
    { href: 'https://example.com/contact', label: 'Contact' }
  ],
  sections: [
    {
      backgroundColor: '#f4f1e8',
      body: 'An independent creative studio for ambitious organisations.',
      foregroundColor: '#181711',
      heading: 'Ideas that make people move.',
      links: [{ href: 'https://example.com/work', label: 'See our work' }]
    },
    {
      backgroundColor: '#ffffff',
      body: 'Strategy, identity, and digital experiences brought together by one senior team.',
      foregroundColor: '#181711',
      heading: 'Useful ideas, beautifully made.',
      links: []
    },
    {
      backgroundColor: '#1f5947',
      body: 'Tell us what you are building and we will show you the clearest next step.',
      foregroundColor: '#ffffff',
      heading: 'Start a conversation.',
      links: [{ href: 'https://example.com/contact', label: 'Talk to us' }]
    }
  ],
  sourceUrl: 'https://example.com/',
  title: 'Northstar Studio'
}
const demoHomepage = createSiteDocument(demoBlueprint, 'owned', 'contact')
const demoContactPage = createSiteDocument(
  {
    ...demoBlueprint,
    sections: [
      {
        backgroundColor: '#ffffff',
        body: 'Tell us what you are building. We normally reply within two working days.',
        foregroundColor: '#181711',
        heading: 'Let’s make something useful.',
        links: [{ href: 'https://example.com/contact', label: 'Email the studio' }]
      }
    ],
    sourceUrl: 'https://example.com/contact',
    title: 'Contact Northstar Studio'
  },
  'owned',
  'contact'
)
const demoDocument = createSiteBundleDocument(
  demoHomepage,
  [
    { document: demoHomepage, path: '/' },
    { document: demoContactPage, path: '/contact' }
  ],
  2,
  []
)

const demoSite: BuilderSiteDetail = {
  id: 'demo',
  name: 'Northstar Studio',
  slug: 'northstar-studio-demo',
  sourceMode: 'owned',
  sourceUrl: 'https://example.com/',
  status: 'ready',
  statusMessage: 'Your first version is ready',
  updatedAt: '2026-07-19T10:02:00.000Z',
  revisionNumber: 1,
  document: demoDocument
}

/** List the signed-in owner's generated websites without mixing them with monitored sites. */
export async function listBuilderSites(): Promise<BuilderSiteSummary[]> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return [demoSite]
  if (!getSupabaseServerConfig()) return []
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []
  const { data } = await supabase
    .from('cr_builder_sites')
    .select('id,name,slug,source_url,source_mode,status,status_message,published_at,updated_at')
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
  return (data ?? []).map(site => ({
    id: site.id,
    name: site.name,
    slug: site.slug,
    sourceMode: site.source_mode === 'inspiration' ? 'inspiration' : 'owned',
    sourceUrl: site.source_url,
    status: readStatus(site.status),
    statusMessage: site.status_message ?? undefined,
    publishedAt: site.published_at ?? undefined,
    updatedAt: site.updated_at
  }))
}

/** Load one generated website and only its latest owner-visible revision. */
export async function getBuilderSite(siteId: string): Promise<BuilderSiteDetail | undefined> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true' && siteId === 'demo') return demoSite
  if (!getSupabaseServerConfig()) return undefined
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return undefined
  const { data: site } = await supabase
    .from('cr_builder_sites')
    .select(
      'id,name,slug,source_url,source_mode,status,status_message,last_error,published_at,updated_at'
    )
    .eq('id', siteId)
    .eq('owner_id', auth.user.id)
    .is('archived_at', null)
    .maybeSingle()
  if (!site) return undefined
  const { data: revision } = await supabase
    .from('cr_site_revisions')
    .select('revision_number,site_document')
    .eq('site_id', site.id)
    .eq('owner_id', auth.user.id)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const parsedDocument = siteDocumentSchema.safeParse(revision?.site_document)
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    sourceMode: site.source_mode === 'inspiration' ? 'inspiration' : 'owned',
    sourceUrl: site.source_url,
    status: readStatus(site.status),
    statusMessage: site.status_message ?? undefined,
    publishedAt: site.published_at ?? undefined,
    updatedAt: site.updated_at,
    error: site.last_error ?? undefined,
    revisionNumber: revision?.revision_number,
    document: parsedDocument.success ? parsedDocument.data : undefined
  }
}

/** Resolve only an explicitly published immutable revision for the public website renderer. */
export async function getPublishedBuilderSite(
  slug: string
): Promise<PublishedBuilderSite | undefined> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true' && slug === demoSite.slug)
    return { document: demoSite.document ?? demoDocument, name: demoSite.name }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return undefined
  const db = createServiceClient()
  const { data: site } = await db
    .from('cr_builder_sites')
    .select('name,published_revision_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_revision_id', 'is', null)
    .maybeSingle()
  if (!site?.published_revision_id) return undefined
  const { data: revision } = await db
    .from('cr_site_revisions')
    .select('site_document')
    .eq('id', site.published_revision_id)
    .maybeSingle()
  const parsed = siteDocumentSchema.safeParse(revision?.site_document)
  return parsed.success ? { document: parsed.data, name: site.name } : undefined
}

/** Count one valid published-page view and enforce the owner's included hosting ceiling. */
export async function recordPublishedBuilderVisit(slug: string): Promise<boolean> {
  if (process.env.CODEROCKET_DEMO_MODE === 'true') return true
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false
  const { data, error } = await createServiceClient().rpc('cr_record_published_site_visit', {
    p_slug: slug
  })
  return !error && data === true
}

function readStatus(value: string): BuilderSiteSummary['status'] {
  if (value === 'analyzing' || value === 'ready' || value === 'failed' || value === 'published')
    return value
  return 'queued'
}
