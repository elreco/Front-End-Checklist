export function GET() {
  return new Response('This legacy CodeRocket product page has been permanently removed.', {
    status: 410,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  })
}
