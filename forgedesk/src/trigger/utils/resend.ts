import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── Client-facing email (portaal items, herinneringen) ───
// From: "Bedrijfsnaam" <noreply@doen.team>
// Reply-To: user's own email
interface ClientEmailParams {
  to: string
  replyTo: string
  subject: string
  bedrijfsnaam: string
  heading: string
  itemTitel?: string
  beschrijving?: string
  quote?: string
  ctaUrl?: string
  ctaLabel?: string
  logoUrl?: string
  primaireKleur?: string
}

export async function sendClientEmail(params: ClientEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' }

  try {
    const fromName = params.bedrijfsnaam || 'doen.'
    await resend.emails.send({
      from: `${fromName} <noreply@doen.team>`,
      replyTo: params.replyTo,
      to: params.to,
      subject: params.subject,
      html: buildClientEmailHtml(params),
    })
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[resend] client email failed:', msg)
    return { success: false, error: msg }
  }
}

// ─── System notification email (to user, from doen.) ───
interface SystemEmailParams {
  to: string
  subject: string
  heading: string
  itemTitel?: string
  projectNaam?: string
  quote?: string
  ctaUrl?: string
  ctaLabel?: string
}

export async function sendSystemEmail(params: SystemEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResend()
  if (!resend) return { success: false, error: 'RESEND_API_KEY not configured' }

  try {
    await resend.emails.send({
      from: 'doen. <noreply@doen.team>',
      to: params.to,
      subject: params.subject,
      html: buildSystemEmailHtml(params),
    })
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[resend] system email failed:', msg)
    return { success: false, error: msg }
  }
}

// ─── Client email template (branded per bedrijf) ───
function buildClientEmailHtml(p: ClientEmailParams): string {
  const color = p.primaireKleur || '#1A535C'
  const colorLight = `${color}12`
  const font = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"

  // Cleanup heading: strip embedded greeting, URLs, signature
  let heading = p.heading
    .replace(/^Beste\s+[^,]+,\s*/i, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/Met vriendelijke groet,?\s*/gi, '')
    .replace(p.bedrijfsnaam || '___NOMATCH___', '')
    .replace(/Bekijk het via uw portaal:?\s*/gi, '')
    .replace(/\s+/g, ' ').trim()
  if (!heading) heading = 'Er is een update voor u.'

  const logoHtml = p.logoUrl
    ? `<img src="${escapeHtml(p.logoUrl)}" alt="${escapeHtml(p.bedrijfsnaam)}" style="max-height: 44px; max-width: 180px; object-fit: contain;" />`
    : `<span style="font-family: ${font}; font-size: 20px; font-weight: 700; color: #1A1A1A;">${escapeHtml(p.bedrijfsnaam)}</span>`

  const itemBlock = p.itemTitel ? `
    <tr><td style="padding: 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colorLight}; border-radius: 8px; border-left: 3px solid ${color};">
        <tr><td style="padding: 16px 20px;">
          <span style="font-family: ${font}; font-size: 15px; font-weight: 600; color: #1A1A1A;">${escapeHtml(p.itemTitel)}</span>
          ${p.beschrijving ? `<br><span style="font-family: ${font}; font-size: 13px; color: #6B6B66;">${escapeHtml(p.beschrijving)}</span>` : ''}
        </td></tr>
      </table>
    </td></tr>` : ''

  const quoteBlock = p.quote ? `
    <tr><td style="padding: 0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colorLight}; border-radius: 8px; border-left: 3px solid ${color};">
        <tr><td style="padding: 14px 20px; font-family: ${font}; font-size: 14px; color: #1A1A1A; font-style: italic; line-height: 1.6;">
          &ldquo;${escapeHtml(p.quote)}&rdquo;
        </td></tr>
      </table>
    </td></tr>` : ''

  const ctaBlock = p.ctaUrl ? `
    <tr><td style="padding: 24px 0 8px 0;" align="center">
      <a href="${escapeHtml(p.ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${color}; color: #FFFFFF; font-family: ${font}; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; line-height: 1;">
        ${escapeHtml(p.ctaLabel || 'Bekijk in portaal')}
      </a>
    </td></tr>` : ''

  // Klant naam uit de heading of origineel
  const klantNaam = p.heading.match(/^Beste\s+([^,]+),/i)?.[1] || ''
  const greetingBlock = klantNaam ? `
    <tr><td style="padding: 0 0 8px 0; font-family: ${font}; font-size: 15px; color: #3A3A36; line-height: 1.6;">
      Beste ${escapeHtml(klantNaam)},
    </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F5F4F1; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px;">
        <tr><td style="padding: 0 0 28px 0; text-align: center;">${logoHtml}</td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; border: 1px solid #EBEBEB;">
            <tr><td style="padding: 36px 36px 32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${greetingBlock}
                <tr><td style="padding: 0 0 4px 0; font-family: ${font}; font-size: 15px; color: #3A3A36; line-height: 1.6;">${escapeHtml(heading)}</td></tr>
                ${itemBlock}${quoteBlock}${ctaBlock}
                <tr><td style="padding: 24px 0 0 0; font-family: ${font}; font-size: 14px; color: #6B6B66; line-height: 1.8;">Met vriendelijke groet,<br><strong style="color: #1A1A1A;">${escapeHtml(p.bedrijfsnaam)}</strong></td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 20px 0 0 0; text-align: center;">
          <span style="font-family: ${font}; font-size: 11px; color: #9B9B95;">Verzonden via <span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> namens ${escapeHtml(p.bedrijfsnaam)}</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── System email template (doen. branded) ───
function buildSystemEmailHtml(p: SystemEmailParams): string {
  const itemBlock = p.itemTitel ? `
    <tr><td style="padding: 0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #EBEBEB; border-radius: 8px;">
        <tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: #1A1A1A;">${escapeHtml(p.itemTitel)}</td></tr>
        ${p.projectNaam ? `<tr><td style="padding: 0 20px 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #6B6B66;">Project: ${escapeHtml(p.projectNaam)}</td></tr>` : ''}
      </table>
    </td></tr>` : ''

  const quoteBlock = p.quote ? `
    <tr><td style="padding: 0 0 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F5; border-radius: 8px; border-left: 4px solid #1A535C;">
        <tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #1A1A1A; font-style: italic; line-height: 1.6;">&ldquo;${escapeHtml(p.quote)}&rdquo;</td></tr>
      </table>
    </td></tr>` : ''

  const ctaBlock = p.ctaUrl ? `
    <tr><td style="padding: 8px 0 0 0;" align="center">
      <a href="${escapeHtml(p.ctaUrl)}" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">${escapeHtml(p.ctaLabel || 'Bekijk in doen. →')}</a>
    </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F5F4F1; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
        <tr><td style="padding: 0 0 24px 0; text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #F15025;">.</span></td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);">
            <tr><td style="padding: 36px 36px 32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">${escapeHtml(p.heading)}</td></tr>
                ${itemBlock}${quoteBlock}${ctaBlock}
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 20px 0 0 0; text-align: center;">
          <div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div>
          <span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #9B9B95;"><span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> de kracht achter doeners.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
