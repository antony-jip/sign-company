import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Afmeldpagina voor gerichte verzendingen (per mail via Resend, niet via een
// broadcast). De link bevat een HMAC van het adres, gesleuteld met hetzelfde
// token als de webhook, zodat niemand anderen kan afmelden. GET toont een
// bevestigingspagina; POST (List-Unsubscribe one-click) meldt direct af.
const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const AUDIENCE_NAAM = 'Sign Company nieuwsbrief'
const GEHEIM = process.env.NIEUWSBRIEF_WEBHOOK_TOKEN || (process.env.SUPABASE_SERVICE_ROLE_KEY ? `afmeld:${process.env.SUPABASE_SERVICE_ROLE_KEY}` : '')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

// De nieuwsbrief-id zit in de HMAC, niet alleen in de URL: anders kan iemand
// zijn afmelding aan een willekeurige nieuwsbrief hangen en klopt het
// afmeldpercentage per verzending niet meer.
function tokenVoor(email: string, nieuwsbriefId: string): string {
  const basis = nieuwsbriefId ? `${email.toLowerCase()}:${nieuwsbriefId}` : email.toLowerCase()
  return createHmac('sha256', GEHEIM).update(basis).digest('hex').slice(0, 32)
}

function tokenKlopt(email: string, nieuwsbriefId: string, token: string): boolean {
  if (!GEHEIM || !/^[0-9a-f]{32}$/.test(token)) return false
  const a = Buffer.from(tokenVoor(email, nieuwsbriefId))
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Waarom iemand weggaat is het enige signaal dat zegt wat je fout doet. Vier
// vaste keuzes, want een tekstveld op een afmeldpagina vult niemand in.
const REDENEN: { waarde: string; label: string }[] = [
  { waarde: 'te_vaak', label: 'Ik krijg te veel mail' },
  { waarde: 'niet_relevant', label: 'Het gaat niet over mijn werk' },
  { waarde: 'niet_aangemeld', label: 'Ik heb me hier nooit voor aangemeld' },
  { waarde: 'anders', label: 'Een andere reden' },
]

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pagina(titel: string, tekst: string, knop?: { label: string; email: string; token: string; nieuwsbriefId: string }): string {
  const keuzes = knop
    ? REDENEN.map(r => `<label style="display:flex;align-items:center;gap:10px;padding:9px 0;font-size:14px;color:#57574F;cursor:pointer;">
        <input type="radio" name="r" value="${r.waarde}" style="accent-color:#F15025;width:16px;height:16px;">${escapeHtml(r.label)}</label>`).join('')
    : ''
  const formulier = knop
    ? `<form method="post" style="margin-top:24px;">
        <input type="hidden" name="e" value="${escapeHtml(knop.email)}"><input type="hidden" name="t" value="${escapeHtml(knop.token)}"><input type="hidden" name="n" value="${escapeHtml(knop.nieuwsbriefId)}">
        <div style="margin:0 0 20px;padding-top:4px;border-top:1px solid #EAE8E3;">
          <div style="margin:16px 0 4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9B9B95;">Mag ik vragen waarom?</div>
          ${keuzes}
        </div>
        <button type="submit" style="background:#F15025;color:#fff;border:0;border-radius:10px;padding:13px 26px;font-size:15px;font-weight:700;cursor:pointer;">${escapeHtml(knop.label)}</button>
      </form>`
    : ''
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titel)}</title></head>
<body style="margin:0;background:#F5F4F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A1A;">
  <div style="max-width:520px;margin:64px auto;padding:0 20px;">
    <div style="background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 8px 24px -12px rgba(26,26,26,0.12);">
      <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">Sign Company<span style="color:#F15025;">.</span></div>
      <h1 style="margin:24px 0 0;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(titel)}</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.65;color:#57574F;">${tekst}</p>
      ${formulier}
    </div>
    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#9B9B95;">Vragen? Mail <a href="mailto:antony@signcompany.nl" style="color:#9B9B95;">antony@signcompany.nl</a></p>
  </div>
</body></html>`
}

async function meldAf(email: string, reden: string, nieuwsbriefId: string): Promise<void> {
  await supabase
    .from('nieuwsbrief_afmeldingen')
    .upsert(
      { user_id: OWNER_USER_ID, email, reden: reden || 'uitgeschreven', nieuwsbrief_id: nieuwsbriefId || null },
      { onConflict: 'user_id,email', ignoreDuplicates: true },
    )
  // Ook als event, zodat het afmeldpercentage van deze verzending klopt.
  if (nieuwsbriefId) {
    const { error } = await supabase.rpc('nieuwsbrief_event_registreren', {
      p_nieuwsbrief_id: nieuwsbriefId, p_email: email, p_type: 'unsubscribed', p_link: null,
    })
    if (error) console.warn('[nieuwsbrief-afmelden] event registreren mislukt:', error.message)
  }
  if (!resend) return
  try {
    const { data: lijst } = await resend.audiences.list()
    const audienceId = (lijst?.data ?? []).find(a => a.name === AUDIENCE_NAAM)?.id
    if (audienceId) await resend.contacts.update({ audienceId, email, unsubscribed: true })
  } catch (err) {
    console.warn('[nieuwsbrief-afmelden] Resend-contact bijwerken mislukt:', (err as Error).message)
  }
}

function leesParams(req: VercelRequest): { email: string; token: string; nieuwsbriefId: string; reden: string } {
  const bron = (req.method === 'POST' ? { ...(req.query ?? {}), ...((req.body as Record<string, unknown>) ?? {}) } : (req.query ?? {})) as Record<string, unknown>
  const email = String(bron.e ?? '').trim().toLowerCase()
  const token = String(bron.t ?? '').trim()
  const ruweId = String(bron.n ?? '').trim()
  const nieuwsbriefId = /^[0-9a-f-]{36}$/i.test(ruweId) ? ruweId : ''
  const ruweReden = String(bron.r ?? '').trim()
  const reden = REDENEN.some(r => r.waarde === ruweReden) ? ruweReden : ''
  return { email, token, nieuwsbriefId, reden }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  const { email, token, nieuwsbriefId, reden } = leesParams(req)

  if (!isEmail(email) || !tokenKlopt(email, nieuwsbriefId, token)) {
    return res.status(400).send(pagina('Deze link klopt niet', 'De afmeldlink is onvolledig of verlopen. Reageer op de nieuwsbrief en we halen je handmatig van de lijst.'))
  }

  if (req.method === 'POST') {
    await meldAf(email, reden, nieuwsbriefId)
    return res.status(200).send(pagina('Je bent afgemeld', `Je ontvangt geen nieuwsbrieven meer op <strong>${escapeHtml(email)}</strong>. Bedankt voor de tijd dat je meelas.`))
  }

  if (req.method === 'GET') {
    return res.status(200).send(pagina(
      'Afmelden voor de nieuwsbrief',
      `Wil je geen nieuwsbrieven van Sign Company meer ontvangen op <strong>${escapeHtml(email)}</strong>?`,
      { label: 'Ja, meld me af', email, token, nieuwsbriefId },
    ))
  }

  return res.status(405).send(pagina('Niet toegestaan', 'Deze aanvraag wordt niet ondersteund.'))
}
