import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const config = { maxDuration: 60 }

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const AUDIENCE_NAAM = 'Sign Company nieuwsbrief'
const FROM = 'Sign Company <antony@signcompany.nl>'
const REPLY_TO = 'antony@signcompany.nl'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function verifyOwner(req: VercelRequest): Promise<boolean> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false
  return user.id === OWNER_USER_ID
}

async function vindAudienceId(client: Resend): Promise<string | null> {
  const { data: lijst } = await client.audiences.list()
  return (lijst?.data ?? []).find(a => a.name === AUDIENCE_NAAM)?.id ?? null
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Wikkelt de opgestelde body in een neutrale, responsieve mailshell met een
// verplichte afmeldlink. {{{RESEND_UNSUBSCRIBE_URL}}} wordt door Resend per
// ontvanger vervangen door een geldige uitschrijf-URL.
function buildNieuwsbriefHtml(bodyHtml: string, onderwerp: string, preheader?: string): string {
  const preheaderBlok = preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader.trim())}</div>`
    : ''
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(onderwerp)}</title></head>
<body style="margin:0;padding:0;background-color:#F5F4F1;-webkit-font-smoothing:antialiased;">
  ${preheaderBlok}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F4F1;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="background-color:#ffffff;border-radius:12px;padding:36px 36px 28px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#1A1A1A;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 36px 0 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9B9B95;text-align:center;line-height:1.6;">
          Je ontvangt deze mail omdat je contact bent van Sign Company.<br>
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9B9B95;text-decoration:underline;">Uitschrijven</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!resend) return res.status(500).json({ error: 'Resend is niet geconfigureerd' })

  try {
    if (!(await verifyOwner(req))) return res.status(403).json({ error: 'Geen toegang' })

    const { nieuwsbriefId, onderwerp, html, preheader, scheduledAt } = (req.body ?? {}) as {
      nieuwsbriefId?: string; onderwerp?: string; html?: string; preheader?: string; scheduledAt?: string
    }
    if (!nieuwsbriefId) return res.status(400).json({ error: 'nieuwsbriefId ontbreekt' })
    if (!onderwerp?.trim()) return res.status(400).json({ error: 'Geef een onderwerp op' })
    if (!html?.trim()) return res.status(400).json({ error: 'De nieuwsbrief is nog leeg' })

    const { data: rij } = await supabase
      .from('nieuwsbrieven').select('id, user_id, status').eq('id', nieuwsbriefId).maybeSingle()
    if (!rij || (rij as Record<string, unknown>).user_id !== OWNER_USER_ID) {
      return res.status(404).json({ error: 'Nieuwsbrief niet gevonden' })
    }
    if ((rij as Record<string, unknown>).status === 'verzonden') {
      return res.status(400).json({ error: 'Deze nieuwsbrief is al verzonden' })
    }

    const audienceId = await vindAudienceId(resend)
    if (!audienceId) return res.status(400).json({ error: 'Synchroniseer eerst je contacten' })

    const { data: contacten } = await resend.contacts.list({ audienceId })
    const actief = (contacten?.data ?? []).filter(c => !c.unsubscribed)
    if (actief.length === 0) return res.status(400).json({ error: 'Geen actieve contacten in de lijst. Synchroniseer eerst je contacten.' })

    const { data: broadcast, error: bcErr } = await resend.broadcasts.create({
      audienceId,
      from: FROM,
      replyTo: REPLY_TO,
      subject: onderwerp.trim(),
      html: buildNieuwsbriefHtml(html, onderwerp.trim(), preheader),
    })
    if (bcErr || !broadcast) {
      return res.status(502).json({ error: `Kon de nieuwsbrief niet aanmaken bij Resend: ${bcErr?.message ?? 'onbekend'}` })
    }

    const { error: sendErr } = scheduledAt
      ? await resend.broadcasts.send(broadcast.id, { scheduledAt })
      : await resend.broadcasts.send(broadcast.id)
    if (sendErr) {
      return res.status(502).json({ error: `Verzenden mislukt bij Resend: ${sendErr.message}` })
    }

    const nu = new Date().toISOString()
    const gepland = Boolean(scheduledAt)
    const { data: bijgewerkt, error: updErr } = await supabase
      .from('nieuwsbrieven')
      .update({
        onderwerp: onderwerp.trim(),
        html,
        preheader: preheader?.trim() || null,
        status: gepland ? 'gepland' : 'verzonden',
        resend_broadcast_id: broadcast.id,
        aantal_ontvangers: actief.length,
        gepland_op: gepland ? scheduledAt : null,
        verzonden_op: gepland ? null : nu,
        updated_at: nu,
      })
      .eq('id', nieuwsbriefId)
      .select('*')
      .single()
    if (updErr) {
      // Verzending is al gelukt; log de mismatch maar faal de request niet hard.
      console.error('[nieuwsbrief-verzend] rij-update mislukt na verzenden:', updErr)
    }

    return res.status(200).json({
      ok: true,
      status: gepland ? 'gepland' : 'verzonden',
      aantalOntvangers: actief.length,
      broadcastId: broadcast.id,
      nieuwsbrief: bijgewerkt ?? null,
    })
  } catch (err) {
    console.error('[nieuwsbrief-verzend] fout:', err)
    return res.status(500).json({ error: (err as Error).message || 'Verzenden mislukt' })
  }
}
