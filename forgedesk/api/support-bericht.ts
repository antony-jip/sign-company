import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Service-role client — RLS-bypass, schrijven gebeurt server-side gecontroleerd.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Klantberichten notificeren alleen deze ene support-beheerder (niet de hele org).
const ADMIN_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const ADMIN_ORG_ID = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'

// Beheerder geldt als 'offline' als de laatste heartbeat ouder is dan dit.
const ONLINE_DREMPEL_MS = 3 * 60 * 1000

// ── Auth helper (inline; Vercel bundelt geen api/_helpers/ imports) ──
async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// ── Org + naam ophalen voor de ingelogde user (inline) ──
async function resolveOrg(userId: string): Promise<{ organisatieId: string; orgNaam: string }> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()

  const organisatieId = (profile?.organisatie_id as string | null) ?? null
  if (!organisatieId) throw new Error('Geen organisatie gekoppeld')

  const { data: org } = await supabaseAdmin
    .from('organisaties')
    .select('naam')
    .eq('id', organisatieId)
    .maybeSingle()

  return { organisatieId, orgNaam: (org?.naam as string | null) || 'Onbekend' }
}

// Is de support-beheerder recent actief geweest (heartbeat)?
async function isAdminOnline(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('support_presence')
    .select('laatste_actief')
    .eq('gebruiker_id', ADMIN_USER_ID)
    .maybeSingle()
  const laatste = data?.laatste_actief as string | null
  if (!laatste) return false
  return Date.now() - new Date(laatste).getTime() < ONLINE_DREMPEL_MS
}

async function getAdminEmail(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', ADMIN_USER_ID)
    .maybeSingle()
  return (data?.email as string | null) || 'hello@doen.team'
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Mail de beheerder dat een klant z'n e-mail heeft achtergelaten tijdens afwezigheid.
async function mailKlantEmailNaarBeheerder(orgNaam: string, klantEmail: string): Promise<void> {
  if (!resend) {
    console.warn('[support-bericht] RESEND_API_KEY ontbreekt, e-mailalert overgeslagen')
    return
  }
  const to = await getAdminEmail()
  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
    <p><strong>${escapeHtml(orgNaam)}</strong> heeft tijdens je afwezigheid om contact gevraagd.</p>
    <p>E-mailadres: <a href="mailto:${escapeHtml(klantEmail)}">${escapeHtml(klantEmail)}</a></p>
    <p style="color:#6B6B66;">Open de Support-inbox in doen. om te reageren.</p>
  </div>`
  await resend.emails.send({
    from: 'doen. <noreply@doen.team>',
    to,
    replyTo: klantEmail,
    subject: `Support: ${orgNaam} liet een e-mailadres achter`,
    html,
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const { bericht, email, gesprek_id: gesprekIdBody } = req.body as { bericht?: string; email?: string; gesprek_id?: string }

    // ── Klant laat e-mail achter tijdens afwezigheid ──
    if (email !== undefined) {
      const adres = (email || '').trim()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres)) return res.status(400).json({ error: 'Ongeldig e-mailadres' })
      if (!gesprekIdBody) return res.status(400).json({ error: 'gesprek_id ontbreekt' })

      const { organisatieId, orgNaam } = await resolveOrg(userId)
      const { data: g } = await supabaseAdmin
        .from('support_gesprekken')
        .select('id, organisatie_id')
        .eq('id', gesprekIdBody)
        .maybeSingle()
      if (!g || g.organisatie_id !== organisatieId) return res.status(403).json({ error: 'Geen toegang' })

      await supabaseAdmin.from('support_gesprekken').update({ klant_email: adres }).eq('id', gesprekIdBody)
      try { await mailKlantEmailNaarBeheerder(orgNaam, adres) } catch (e) { console.error('[support-bericht] mail', (e as Error).message) }
      return res.status(200).json({ ok: true })
    }

    const tekst = (bericht || '').trim()
    if (!tekst) return res.status(400).json({ error: 'Bericht is leeg' })
    if (tekst.length > 5000) return res.status(400).json({ error: 'Bericht is te lang' })

    const { organisatieId, orgNaam } = await resolveOrg(userId)

    // Bestaand open gesprek hergebruiken, anders aanmaken.
    const { data: bestaand } = await supabaseAdmin
      .from('support_gesprekken')
      .select('id')
      .eq('organisatie_id', organisatieId)
      .eq('status', 'open')
      .order('laatste_bericht_op', { ascending: false })
      .limit(1)
      .maybeSingle()

    let gesprekId = bestaand?.id as string | undefined

    if (!gesprekId) {
      const { data: nieuw, error: gesprekError } = await supabaseAdmin
        .from('support_gesprekken')
        .insert({ organisatie_id: organisatieId, org_naam: orgNaam })
        .select('id')
        .single()
      if (gesprekError || !nieuw) throw new Error('Gesprek aanmaken mislukt')
      gesprekId = nieuw.id as string
    }

    const nu = new Date().toISOString()

    const { data: nieuwBericht, error: berichtError } = await supabaseAdmin
      .from('support_berichten')
      .insert({ gesprek_id: gesprekId, afzender: 'klant', bericht: tekst })
      .select('*')
      .single()
    if (berichtError || !nieuwBericht) throw new Error('Bericht opslaan mislukt')

    // Gesprek terug op 'open' zetten + laatste_bericht_op bijwerken.
    await supabaseAdmin
      .from('support_gesprekken')
      .update({ laatste_bericht_op: nu, status: 'open' })
      .eq('id', gesprekId)

    // Melding alleen naar de support-beheerder (belletje + bulletje), niet de hele org.
    try {
      await supabaseAdmin.from('notificaties').insert({
        user_id: ADMIN_USER_ID,
        organisatie_id: ADMIN_ORG_ID,
        type: 'algemeen',
        titel: `Support — ${orgNaam}`,
        bericht: tekst.length > 140 ? tekst.slice(0, 137) + '…' : tekst,
        link: '/support',
        gelezen: false,
      })
    } catch (notifyErr) {
      console.error('[support-bericht] notify', (notifyErr as Error).message)
    }

    const online = await isAdminOnline()

    return res.status(200).json({ gesprek_id: gesprekId, bericht: nieuwBericht, offline: !online })
  } catch (err) {
    const message = (err as Error).message
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[support-bericht]', message)
    return res.status(500).json({ error: message || 'Interne fout' })
  }
}
