import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

/**
 * Venster waarin één gesprek maximaal één mail buiten de app oplevert.
 *
 * Dubbel sturen wordt hiermee op twee manieren voorkomen: dezelfde request die
 * opnieuw wordt uitgevoerd (retry) valt in hetzelfde venster, en een klant die
 * vijf regels achter elkaar typt levert één mail op in plaats van vijf.
 *
 * Bewuste onnauwkeurigheid: twee berichten die net een vensterrand overschrijden
 * geven wel twee mails. Dat is de goede kant om op te falen -- het doel is dat
 * een klant niet in stilte blijft wachten, dus liever een mail te veel dan een
 * gemiste melding.
 */
const MELDING_VENSTER_MS = 15 * 60 * 1000

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
  return (data?.email as string | null) || 'antony@signcompany.nl'
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

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for support-bericht, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:support-bericht', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] support-bericht id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] support-bericht id=${identifier} err=${(err as Error).message}`)
    return true

/**
 * Sleutel voor het idempotency-venster van één gesprek.
 *
 * Geëxporteerd zodat tests hem kunnen vastpinnen; Vercel gebruikt alleen de
 * default export, extra named exports zijn onschuldig.
 */
export function meldingIdempotencySleutel(
  gesprekId: string,
  tijdstipMs: number,
  vensterMs = MELDING_VENSTER_MS
): string {
  return `support-melding:${gesprekId}:${Math.floor(tijdstipMs / vensterMs)}`
}

/**
 * Moet er een melding buiten de app uit?
 *
 * De beheerder die de app openstaan heeft ziet het belletje al; dan is mail
 * ruis, en ruis leidt tot uitgezette meldingen. Staat de app dicht, dan is dit
 * precies het geval uit de audit: de klant wacht tot iemand toevallig het
 * tabblad opent.
 *
 * De laatste voorwaarde is de lus-beveiliging. Een melding over een
 * supportbericht mag zelf nooit een supportbericht of een nieuwe melding
 * veroorzaken; support die via het widget met zichzelf praat mailt zichzelf dus
 * niet. De zwaardere helft van die beveiliging is structureel: dit pad zit
 * alleen in het klant-endpoint, waar afzender per definitie 'klant' is. Een
 * admin-antwoord loopt via api/support-inbox.ts en komt hier nooit langs.
 */
export function moetBuitenAppMelden(ctx: {
  adminOnline: boolean
  organisatieId: string
  adminOrgId?: string
}): boolean {
  if (ctx.adminOnline) return false
  return ctx.organisatieId !== (ctx.adminOrgId ?? ADMIN_ORG_ID)
}

/**
 * Claimt het meldingsvenster voor dit gesprek.
 *
 * Claimen gebeurt vóór het versturen, want een claim ná een gelukte send laat
 * een gelijktijdige tweede request alsnog mailen. Hergebruikt de tabel uit
 * migratie 104 op naam van de supportorganisatie.
 *
 * Een andere fout dan een unique-violation (tabel ontbreekt, netwerk) houdt de
 * mail niet tegen: stilte is hier het ergste dat kan gebeuren, dus bij twijfel
 * gaat de melding eruit.
 */
async function claimMeldingVenster(sleutel: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('email_send_idempotency')
    .insert({ organisatie_id: ADMIN_ORG_ID, idempotency_key: sleutel })

  if (!error) return true
  if (error.code === '23505') return false

  console.error('[support-bericht] idempotency-claim onbruikbaar, melding gaat door', error.message)
  return true
}

// Claim vrijgeven zodat een mislukte mail niet het hele venster stilzet.
async function geefMeldingVensterVrij(sleutel: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_send_idempotency')
    .delete()
    .eq('organisatie_id', ADMIN_ORG_ID)
    .eq('idempotency_key', sleutel)
  if (error) console.error('[support-bericht] claim vrijgeven mislukt', error.message)
}

/**
 * Mailt de beheerder dat er een supportbericht ligt.
 *
 * Bewust zonder replyTo: een antwoord hoort in de inbox thuis, en een replyTo
 * naar een door de klant opgegeven adres is een pad waarlangs een melding
 * alsnog nieuwe post kan veroorzaken.
 */
async function mailSupportBerichtNaarBeheerder(orgNaam: string, tekst: string): Promise<void> {
  if (!resend) throw new Error('RESEND_API_KEY ontbreekt')
  const to = await getAdminEmail()
  const preview = tekst.length > 500 ? tekst.slice(0, 497) + '…' : tekst
  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #1A1A1A; line-height: 1.6;">
    <p><strong>${escapeHtml(orgNaam)}</strong> heeft een bericht gestuurd naar support.</p>
    <blockquote style="margin:12px 0; padding:10px 14px; border-left:3px solid #F15025; background:#FAFAF8; white-space:pre-wrap;">${escapeHtml(preview)}</blockquote>
    <p style="color:#6B6B66;">Open de Support-inbox in doen. om te reageren.</p>
  </div>`
  // Resend GOOIT NIET bij een API-fout, hij geeft { data, error } terug. De
  // returnwaarde negeren betekent dus: ongeldige key, rate limit of domeinfout
  // gaat geruisloos langs, én de idempotency-claim blijft staan, dus dat gesprek
  // is een kwartier stil. Zie api/nieuwsbrief-test.ts voor hetzelfde patroon.
  const { error } = await resend.emails.send({
    from: 'doen. <noreply@doen.team>',
    to,
    subject: `Support: nieuw bericht van ${orgNaam}`,
    html,
  })
  if (error) throw new Error(`Resend weigerde de supportmelding: ${error.message}`)
}

/**
 * Melding buiten de app, volledig losgekoppeld van het opslaan van het bericht.
 *
 * Gooit nooit: het bericht staat op dit punt al in de database en die uitkomst
 * mag niet meer omvallen door een mailfout.
 */
async function meldBuitenApp(gesprekId: string, orgNaam: string, tekst: string): Promise<void> {
  const sleutel = meldingIdempotencySleutel(gesprekId, Date.now())
  let geclaimd = false
  try {
    geclaimd = await claimMeldingVenster(sleutel)
    if (!geclaimd) return
    await mailSupportBerichtNaarBeheerder(orgNaam, tekst)
  } catch (err) {
    console.error('[support-bericht] melding buiten app mislukt', (err as Error).message)
    if (geclaimd) await geefMeldingVensterVrij(sleutel).catch(() => {})
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    if (!(await enforceRateLimit(userId, res))) return

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

    // Vanaf hier is het bericht opgeslagen. Alles wat volgt is melden, en geen
    // enkele melding mag die opslag nog ongedaan maken of de response laten falen.

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

    if (moetBuitenAppMelden({ adminOnline: online, organisatieId })) {
      await meldBuitenApp(gesprekId, orgNaam, tekst)
    }

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
