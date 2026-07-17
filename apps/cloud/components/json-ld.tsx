/** Render escaped JSON-LD without exposing HTML from structured content. */
export function JsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script dangerouslySetInnerHTML={{ __html: json }} type="application/ld+json" />
}
