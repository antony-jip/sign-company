import { RESPONSIVE_CSS, type NieuwsbriefStijl, STANDAARD_STIJL, webfontImport } from './nieuwsbriefBlokken'

export const SAMPLE_CONTACT = { first_name: 'Jan', last_name: 'Jansen', email: 'jan@voorbeeld.nl' }

// Vult merge-tags met voorbeeldwaarden zodat de preview natuurlijk leest.
export function resolveMergeTags(html: string): string {
  return html
    .replace(/\{\{\{contact\.first_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || SAMPLE_CONTACT.first_name)
    .replace(/\{\{\{contact\.last_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || SAMPLE_CONTACT.last_name)
    .replace(/\{\{\{contact\.email\}\}\}/g, SAMPLE_CONTACT.email)
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, '#')
}

// Spiegelt de server-mailshell (api/nieuwsbrief-verzend.ts) zodat de preview
// toont wat de ontvanger krijgt. De afmeldlink is hier een dummy (#).
export function buildPreviewHtml(body: string, stijl: NieuwsbriefStijl = STANDAARD_STIJL, opties: { preheader?: string; leegTekst?: string } = {}): string {
  const inhoud = resolveMergeTags(body.trim())
    || `<p style="color:#9B9B95;margin:0;font-family:${stijl.font};">${opties.leegTekst ?? 'Nog geen inhoud.'}</p>`
  const preheader = opties.preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${opties.preheader.trim().replace(/</g, '&lt;')}</div>`
    : ''
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${webfontImport(stijl.font)}${RESPONSIVE_CSS}</style></head>
<body style="margin:0;padding:0;background:${stijl.achtergrond};-webkit-font-smoothing:antialiased;">
  ${preheader}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${stijl.achtergrond};padding:24px 12px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="background:${stijl.kaart};border-radius:12px;padding:32px 32px 24px;font-family:${stijl.font};font-size:15px;line-height:1.65;color:${stijl.tekst};">${inhoud}</td></tr>
      <tr><td style="padding:18px 32px 0;font-family:${stijl.font};font-size:12px;color:#9B9B95;text-align:center;line-height:1.6;">
        Je ontvangt deze mail omdat je contact bent van Sign Company.<br>
        <a href="#" style="color:#9B9B95;text-decoration:underline;">Uitschrijven</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
