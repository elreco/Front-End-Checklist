import {
  createSiteBundleDocument,
  createSiteDocument,
  type SiteDocument,
  type SiteEditSelection,
  type SiteSourceBlueprint,
  siteDocumentSchema,
  siteEditSelectionSchema
} from '@coderocket/core'
import type { SiteSectionVisualStyle, SiteVisualTheme } from '@coderocket/core/site-visual'
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
  collections: BuilderCollectionSummary[]
  connections: BuilderConnectionSummary[]
  document?: SiteDocument
  error?: string
  messages: BuilderMessage[]
  revisionNumber?: number
}

export interface BuilderMessage {
  content: string
  createdAt: string
  creditCost: number
  id: string
  role: 'assistant' | 'user'
  selection?: SiteEditSelection
  status: 'queued' | 'working' | 'completed' | 'failed'
}

export interface BuilderCollectionSummary {
  id: string
  kind: 'products' | 'contacts' | 'bookings' | 'content' | 'custom'
  name: string
}

export interface BuilderConnectionSummary {
  displayName?: string
  id: string
  provider: 'coderocket_data' | 'stripe' | 'supabase' | 'calendly' | 'shopify'
  publicUrl?: string
  status: 'available' | 'setup' | 'connected' | 'attention'
}

export interface PublishedBuilderSite {
  document: SiteDocument
  name: string
}

const demoVisualTheme: SiteVisualTheme = {
  fontFamily: 'Arial, Helvetica, sans-serif',
  headingFontFamily: 'Georgia, Times New Roman, serif',
  header: {
    backgroundColor: '#f4f1e8',
    foregroundColor: '#181711',
    borderColor: '#d8d3c5',
    height: 76,
    position: 'sticky'
  },
  button: {
    backgroundColor: '#1f5947',
    foregroundColor: '#ffffff',
    borderColor: '#1f5947',
    radius: 60,
    style: 'solid'
  }
}

const demoSectionVisual: SiteSectionVisualStyle = {
  desktop: {
    contentWidth: 1152,
    paddingBlock: 104,
    headingSize: 78,
    bodySize: 19,
    gap: 56,
    textAlign: 'left'
  },
  mobile: {
    contentWidth: 390,
    paddingBlock: 56,
    headingSize: 46,
    bodySize: 17,
    gap: 28,
    textAlign: 'left'
  },
  headingFontFamily: 'Georgia, Times New Roman, serif',
  headingFontWeight: 500,
  headingLineHeight: 0.94,
  headingLetterSpacing: -2,
  bodyLineHeight: 1.65,
  borderRadius: 18,
  borderWidth: 0,
  borderColor: 'rgba(0, 0, 0, 0)',
  elevation: 'none',
  imageAspectRatio: 1.25,
  imageFit: 'cover',
  imagePosition: 'after',
  backgroundImage: ''
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
      layout: 'split',
      links: [{ href: 'https://example.com/work', label: 'See our work' }],
      visual: demoSectionVisual
    },
    {
      backgroundColor: '#ffffff',
      body: 'Strategy, identity, and digital experiences brought together by one senior team.',
      foregroundColor: '#181711',
      heading: 'Useful ideas, beautifully made.',
      links: [],
      visual: {
        ...demoSectionVisual,
        desktop: { ...demoSectionVisual.desktop, headingSize: 58, contentWidth: 960 },
        mobile: { ...demoSectionVisual.mobile, headingSize: 38 },
        headingLetterSpacing: -1
      }
    },
    {
      backgroundColor: '#1f5947',
      body: 'Tell us what you are building and we will show you the clearest next step.',
      foregroundColor: '#ffffff',
      heading: 'Start a conversation.',
      layout: 'centered',
      links: [{ href: 'https://example.com/contact', label: 'Talk to us' }],
      visual: {
        ...demoSectionVisual,
        desktop: { ...demoSectionVisual.desktop, headingSize: 60, textAlign: 'center' },
        mobile: { ...demoSectionVisual.mobile, headingSize: 40, textAlign: 'center' }
      }
    }
  ],
  sourceUrl: 'https://example.com/',
  title: 'Northstar Studio',
  visualAnalysis: 'responsive-ai',
  visualTheme: demoVisualTheme
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
        links: [{ href: 'https://example.com/contact', label: 'Email the studio' }],
        visual: {
          ...demoSectionVisual,
          desktop: { ...demoSectionVisual.desktop, contentWidth: 820, headingSize: 64 },
          mobile: { ...demoSectionVisual.mobile, headingSize: 42 }
        }
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
  collections: [],
  connections: [],
  messages: [
    {
      content:
        'Your first private version is ready. Tell me what you want to change, in your own words.',
      createdAt: '2026-07-19T10:02:00.000Z',
      creditCost: 0,
      id: 'demo-welcome',
      role: 'assistant',
      status: 'completed'
    }
  ],
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
  const [{ data: revision }, { data: messages }, { data: collections }, { data: connections }] =
    await Promise.all([
      supabase
        .from('cr_site_revisions')
        .select('revision_number,site_document')
        .eq('site_id', site.id)
        .eq('owner_id', auth.user.id)
        .order('revision_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('cr_builder_messages')
        .select('id,role,content,status,credit_cost,selection,created_at')
        .eq('site_id', site.id)
        .eq('owner_id', auth.user.id)
        .order('created_at', { ascending: true })
        .limit(50),
      supabase
        .from('cr_builder_collections')
        .select('id,name,kind')
        .eq('site_id', site.id)
        .eq('owner_id', auth.user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('cr_builder_connections')
        .select('id,provider,status,display_name,public_config')
        .eq('site_id', site.id)
        .eq('owner_id', auth.user.id)
        .order('created_at', { ascending: true })
    ])
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
    messages: (messages ?? []).flatMap(message => {
      const role = message.role === 'assistant' ? 'assistant' : 'user'
      const status = readMessageStatus(message.status)
      const selection = siteEditSelectionSchema.safeParse(message.selection)
      return typeof message.content === 'string'
        ? [
            {
              id: message.id,
              content: message.content,
              createdAt: message.created_at,
              creditCost: message.credit_cost ?? 0,
              role,
              ...(selection.success ? { selection: selection.data } : {}),
              status
            }
          ]
        : []
    }),
    collections: (collections ?? []).map(collection => ({
      id: collection.id,
      name: collection.name,
      kind: readCollectionKind(collection.kind)
    })),
    connections: (connections ?? []).map(connection => ({
      id: connection.id,
      provider: readConnectionProvider(connection.provider),
      status: readConnectionStatus(connection.status),
      displayName: connection.display_name ?? undefined,
      publicUrl:
        connection.public_config &&
        typeof connection.public_config === 'object' &&
        'url' in connection.public_config &&
        typeof connection.public_config.url === 'string'
          ? connection.public_config.url
          : undefined
    })),
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

function readMessageStatus(value: string): BuilderMessage['status'] {
  if (value === 'working' || value === 'completed' || value === 'failed') return value
  return 'queued'
}

function readCollectionKind(value: string): BuilderCollectionSummary['kind'] {
  if (value === 'products' || value === 'contacts' || value === 'bookings' || value === 'content')
    return value
  return 'custom'
}

function readConnectionProvider(value: string): BuilderConnectionSummary['provider'] {
  if (value === 'stripe' || value === 'supabase' || value === 'calendly' || value === 'shopify')
    return value
  return 'coderocket_data'
}

function readConnectionStatus(value: string): BuilderConnectionSummary['status'] {
  if (value === 'setup' || value === 'connected' || value === 'attention') return value
  return 'available'
}
