import { selectSiteDocumentPage } from '@coderocket/core/site-document'
import { redirect } from 'next/navigation'
import { readBuilderPrice } from '@/lib/builder-commerce'
import { getPublishedBuilderSite } from '@/lib/builder-data'
import { createStripeClient } from '@/lib/stripe'

/** Open a real Stripe checkout from the trusted product and price stored in the published site. */
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const formData = await request.formData()
  const pagePath = readPagePath(formData.get('pagePath'))
  const sectionId = String(formData.get('sectionId') ?? '')
  const itemId = String(formData.get('itemId') ?? '')
  const site = await getPublishedBuilderSite(slug)
  const page = site ? selectSiteDocumentPage(site.document, pagePath) : undefined
  const section = page?.sections.find(candidate => candidate.id === sectionId)
  const item = section?.items?.find(candidate => candidate.id === itemId)
  const stripe = site?.connections.find(
    connection => connection.provider === 'stripe' && connection.status === 'connected'
  )
  const returnPath = `/s/${slug}${pagePath === '/' ? '' : pagePath}`
  if (!(site && page && section && item && stripe)) redirect(returnPath)
  if (stripe.placement?.pagePath && stripe.placement.pagePath !== pagePath) redirect(returnPath)
  if (stripe.placement?.sectionId && stripe.placement.sectionId !== sectionId) redirect(returnPath)
  if (stripe.placement?.itemId && stripe.placement.itemId !== itemId) redirect(returnPath)
  if (stripe.mode === 'link' && stripe.publicUrl) redirect(stripe.publicUrl)
  const price = readBuilderPrice(item.price, stripe.defaultCurrency)
  if (!(stripe.accountId && price)) redirect(`${returnPath}?payment=unavailable`)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.coderocket.app'
  let checkoutUrl: string | null = null
  try {
    const session = await createStripeClient().checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: price.currency,
              product_data: {
                name: item.title,
                ...(item.body ? { description: item.body.slice(0, 500) } : {})
              },
              unit_amount: price.unitAmount
            },
            quantity: 1
          }
        ],
        locale: 'auto',
        success_url: `${origin}${returnPath}?payment=success`,
        cancel_url: `${origin}${returnPath}?payment=cancelled`,
        metadata: { itemId, sectionId, siteSlug: slug }
      },
      { stripeAccount: stripe.accountId }
    )
    checkoutUrl = session.url
  } catch {
    checkoutUrl = null
  }
  redirect(checkoutUrl ?? `${returnPath}?payment=unavailable`)
}

/** Accept only a local published-site path from the checkout form. */
function readPagePath(value: FormDataEntryValue | null): string {
  const path = String(value ?? '/')
  return path.startsWith('/') && !path.includes('?') && !path.includes('#') ? path : '/'
}
