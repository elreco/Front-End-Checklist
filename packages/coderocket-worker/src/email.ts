import { Resend } from 'resend'

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character
  )
}

/** Send the deliberately narrow CodeRocket alert email. */
export async function sendAlertEmail(options: {
  to: string
  project: string
  headline: string
  detail: string
  runUrl: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is missing')
  const html = `<div style="background:#09090b;color:#fafafa;font-family:Arial,sans-serif;padding:40px"><div style="max-width:600px;margin:auto"><img alt="CodeRocket" src="https://coderocket.app/apple-touch-icon.png" width="40" height="40"><h1 style="font-size:28px;margin:24px 0 8px">${escapeHtml(options.headline)}</h1><p style="color:#a1a1aa">${escapeHtml(options.project)}</p><div style="border:1px solid #29292f;padding:20px;margin:24px 0"><p>${escapeHtml(options.detail)}</p></div><a href="${escapeHtml(options.runUrl)}" style="display:inline-block;background:#7c5cfc;color:white;padding:12px 18px;text-decoration:none;font-weight:bold">Open audit</a><p style="color:#71717a;font-size:12px;margin-top:32px">Frontend quality, cleared for launch.</p></div></div>`
  await new Resend(apiKey).emails.send({
    from: 'CodeRocket <alerts@mail.coderocket.app>',
    to: options.to,
    subject: `${options.project}: ${options.headline}`,
    html
  })
}
