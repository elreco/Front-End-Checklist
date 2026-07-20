import type {
  SiteConnectionCapability,
  SiteConnectionContext,
  SiteConnectionMode,
  SiteConnectionPlacement,
  SiteConnectionProvider,
  SiteConnectionStatus
} from '@coderocket/core'

export interface BuilderConnectionSummary extends SiteConnectionContext {
  displayName?: string
  id: string
  placement?: SiteConnectionPlacement
  requestedByPrompt: boolean
}

export interface BuilderConnectorCatalogItem {
  capability: SiteConnectionCapability
  description: string
  name: string
  provider: SiteConnectionProvider
  stage: 'ready' | 'later'
}

export const BUILDER_CONNECTOR_CATALOG: BuilderConnectorCatalogItem[] = [
  {
    provider: 'coderocket_data',
    capability: 'data',
    name: 'CodeRocket Data',
    description: 'Products, contacts, bookings, and content managed for you.',
    stage: 'ready'
  },
  {
    provider: 'stripe',
    capability: 'payments',
    name: 'Stripe',
    description: 'Accept secure payments from buttons and products on this website.',
    stage: 'ready'
  },
  {
    provider: 'calendly',
    capability: 'bookings',
    name: 'Bookings',
    description: 'Send visitors to your Calendly or Cal.com booking page.',
    stage: 'ready'
  },
  {
    provider: 'shopify',
    capability: 'commerce',
    name: 'Shopify',
    description: 'Sync a full catalogue, inventory, orders, and fulfilment.',
    stage: 'later'
  },
  {
    provider: 'supabase',
    capability: 'data',
    name: 'Supabase',
    description: 'Use an existing external database and account system.',
    stage: 'later'
  }
]

/** Convert database rows into bounded connector receipts that are safe for Studio and runtime use. */
export function readBuilderConnections(
  rows: Array<{
    display_name: string | null
    id: string
    provider: string
    public_config: unknown
    status: string
  }>
): BuilderConnectionSummary[] {
  return rows.flatMap(row => {
    const provider = readProvider(row.provider)
    if (!provider) return []
    const config = readConnectionPublicConfig(row.public_config)
    const capability = readCapability(config.capability, provider)
    const mode = readMode(config.mode, provider)
    const status = readStatus(row.status)
    const placement = readPlacement(config.placement)
    return [
      {
        id: row.id,
        provider,
        capability,
        mode,
        status,
        displayName: row.display_name ?? undefined,
        requestedByPrompt: config.requestedBy === 'prompt',
        ...(placement ? { placement } : {}),
        ...(typeof config.url === 'string' && config.url.startsWith('https://')
          ? { publicUrl: config.url }
          : {}),
        ...(typeof config.accountId === 'string' ? { accountId: config.accountId } : {}),
        ...(typeof config.defaultCurrency === 'string'
          ? { defaultCurrency: config.defaultCurrency.toLowerCase() }
          : {})
      }
    ]
  })
}

/** Read one non-secret JSON connector configuration without trusting database drift. */
export function readConnectionPublicConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}
}

/** Find the current per-project connection for one provider. */
export function findBuilderConnection(
  connections: BuilderConnectionSummary[],
  provider: SiteConnectionProvider
): BuilderConnectionSummary | undefined {
  return connections.find(connection => connection.provider === provider)
}

/** Count only connections requiring one owner action in the compact Studio toolbar. */
export function countConnectionActions(connections: BuilderConnectionSummary[]): number {
  return connections.filter(
    connection => connection.status === 'setup' || connection.status === 'attention'
  ).length
}

function readProvider(value: string): SiteConnectionProvider | undefined {
  if (
    value === 'coderocket_data' ||
    value === 'stripe' ||
    value === 'calendly' ||
    value === 'shopify' ||
    value === 'supabase'
  )
    return value
  return undefined
}

function readCapability(
  value: unknown,
  provider: SiteConnectionProvider
): SiteConnectionCapability {
  if (
    value === 'data' ||
    value === 'payments' ||
    value === 'bookings' ||
    value === 'commerce' ||
    value === 'accounts'
  )
    return value
  if (provider === 'stripe') return 'payments'
  if (provider === 'calendly') return 'bookings'
  if (provider === 'shopify') return 'commerce'
  return 'data'
}

function readMode(value: unknown, provider: SiteConnectionProvider): SiteConnectionMode {
  if (value === 'managed' || value === 'link' || value === 'account') return value
  return provider === 'coderocket_data' ? 'managed' : 'link'
}

function readStatus(value: string): SiteConnectionStatus {
  if (value === 'setup' || value === 'connected' || value === 'attention') return value
  return 'available'
}

function readPlacement(value: unknown): SiteConnectionPlacement | undefined {
  if (!(value && typeof value === 'object' && !Array.isArray(value))) return undefined
  const rawPagePath = Reflect.get(value, 'pagePath')
  const rawSectionId = Reflect.get(value, 'sectionId')
  const rawItemId = Reflect.get(value, 'itemId')
  const pagePath =
    typeof rawPagePath === 'string' && rawPagePath.startsWith('/') ? rawPagePath : undefined
  const sectionId = typeof rawSectionId === 'string' ? rawSectionId : undefined
  const itemId = typeof rawItemId === 'string' ? rawItemId : undefined
  return pagePath || sectionId || itemId ? { pagePath, sectionId, itemId } : undefined
}
