import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { createHmac } from 'node:crypto'

export const config = { maxDuration: 60 }

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const AUDIENCE_NAAM = 'Sign Company nieuwsbrief'
const FROM = 'Sign Company <antony@signcompany.nl>'
const REPLY_TO = 'antony@signcompany.nl'
const APP_URL = (process.env.VITE_APP_URL || process.env.APP_URL || 'https://app.doen.team').replace(/\/$/, '')
// Gerichte verzendingen gaan per mail (batch van 100); bij inplannen per mail
// met scheduledAt, want de batch-API kent geen scheduledAt. Throttle voor de
// 10 req/s-limiet van Resend en de 60s-limiet van deze functie.
const BATCH_GROOTTE = 100
const MAX_GEPLAND_PER_RUN = 400
const THROTTLE_MS = 110

// Afmeldlink-sleutel: webhook-token als dat er is, anders afgeleid van de
// service-role-key (altijd aanwezig en geheim). Zelfde keuze in nieuwsbrief-afmelden.ts.
const AFMELD_GEHEIM = process.env.NIEUWSBRIEF_WEBHOOK_TOKEN || (process.env.SUPABASE_SERVICE_ROLE_KEY ? `afmeld:${process.env.SUPABASE_SERVICE_ROLE_KEY}` : '')

interface OntvangerSelectie {
  type?: 'alle' | 'filter' | 'handmatig'
  statussen?: string[]
  labels?: string[]
  klantIds?: string[]
  inclusiefContactpersonen?: boolean
}

interface MailStijl { font?: string; achtergrond?: string; kaart?: string; tekst?: string }

// Webfonts die de bouwer aanbiedt; alles daarbuiten valt terug op de
// systeemstack zodat niemand via de API een willekeurige @import injecteert.
const WEBFONTS: Record<string, string> = {
  'Hanken Grotesk': 'Hanken+Grotesk:wght@400;600;700;800',
  'Bricolage Grotesque': 'Bricolage+Grotesque:wght@400;600;700;800',
  'Inter': 'Inter:wght@400;600;700;800',
  'Source Serif 4': 'Source+Serif+4:wght@400;600;700',
}
const STANDAARD_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const RESPONSIVE_CSS = '@media only screen and (max-width:600px){ .stack{display:block!important;width:100%!important;padding-bottom:16px!important;} .stack-gap{display:none!important;} .mobiel-verbergen{display:none!important;max-height:0!important;overflow:hidden!important;} }'

const isKleur = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
const isFont = (v: unknown): v is string => typeof v === 'string' && v.length < 200 && /^[\w\s,'"\-]+$/.test(v)

function webfontImport(font: string): string {
  const naam = Object.keys(WEBFONTS).find(n => font.includes(n))
  return naam ? `@import url('https://fonts.googleapis.com/css2?family=${WEBFONTS[naam]}&display=swap');` : ''
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

function afmeldUrl(email: string): string {
  const token = createHmac('sha256', AFMELD_GEHEIM).update(email.toLowerCase()).digest('hex').slice(0, 32)
  return `${APP_URL}/api/nieuwsbrief-afmelden?e=${encodeURIComponent(email.toLowerCase())}&t=${token}`
}

function personaliseer(html: string, o: { email: string; voornaam: string; achternaam: string }): string {
  return html
    .replace(/\{\{\{contact\.first_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => o.voornaam || fb || '')
    .replace(/\{\{\{contact\.last_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => o.achternaam || fb || '')
    .replace(/\{\{\{contact\.email\}\}\}/g, o.email)
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, afmeldUrl(o.email))
}

interface Ontvanger { email: string; voornaam: string; achternaam: string }

function splitNaam(naam: string): { voornaam: string; achternaam: string } {
  const delen = naam.trim().split(/\s+/).filter(Boolean)
  if (delen.length === 0) return { voornaam: '', achternaam: '' }
  return { voornaam: delen[0], achternaam: delen.slice(1).join(' ') }
}

// Spiegelt src/services/nieuwsbriefService.ts :: verzamelOntvangers.
// PostgREST geeft maximaal 1000 rijen per aanroep, dus in pagina's ophalen.
async function allesVanOrg(tabel: string, kolommen: string, orgId: string): Promise<Record<string, unknown>[]> {
  const uit: Record<string, unknown>[] = []
  for (let van = 0; ; van += 1000) {
    const { data, error } = await supabase.from(tabel).select(kolommen).eq('organisatie_id', orgId).order('id').range(van, van + 999)
    if (error) throw error
    const rijen = (data ?? []) as unknown as Record<string, unknown>[]
    uit.push(...rijen)
    if (rijen.length < 1000) break
  }
  return uit
}

async function verzamelOntvangers(orgId: string, sel: OntvangerSelectie): Promise<Ontvanger[]> {
  const klanten = await allesVanOrg('klanten', 'id, email, bedrijfsnaam, contactpersoon, status, labels, is_demo_data', orgId)
  const statussen = sel.statussen ?? []
  const labels = sel.labels ?? []
  const klantIds = new Set(sel.klantIds ?? [])
  const gekozen = (klanten ?? []).filter(k => {
    const rij = k as Record<string, unknown>
    if (rij.is_demo_data) return false
    if (sel.type === 'handmatig') return klantIds.has(String(rij.id))
    if (sel.type === 'filter') {
      const kl = Array.isArray(rij.labels) ? (rij.labels as string[]) : []
      if (statussen.length > 0 && !statussen.includes(String(rij.status || 'actief'))) return false
      if (labels.length > 0 && !labels.some(l => kl.includes(l))) return false
    }
    return true
  })
  const gekozenIds = new Set(gekozen.map(k => String((k as Record<string, unknown>).id)))

  const { data: afmeldingen } = await supabase
    .from('nieuwsbrief_afmeldingen').select('email').eq('user_id', OWNER_USER_ID)
  const afgemeld = new Set((afmeldingen ?? []).map(a => String((a as Record<string, unknown>).email).toLowerCase()))

  const map = new Map<string, Ontvanger>()
  const voeg = (email: string, naam: string) => {
    const e = email.trim().toLowerCase()
    if (!isEmail(e) || map.has(e) || afgemeld.has(e)) return
    map.set(e, { email: e, ...splitNaam(naam) })
  }
  for (const k of gekozen) {
    const rij = k as Record<string, unknown>
    voeg(String(rij.email || ''), String(rij.contactpersoon || rij.bedrijfsnaam || ''))
  }
  if (sel.inclusiefContactpersonen !== false) {
    const cps = await allesVanOrg('contactpersonen', 'id, klant_id, email, naam', orgId)
    for (const c of cps) {
      const rij = c as Record<string, unknown>
      if (!gekozenIds.has(String(rij.klant_id))) continue
      voeg(String(rij.email || ''), String(rij.naam || ''))
    }
  }
  return Array.from(map.values())
}

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
function buildNieuwsbriefHtml(bodyHtml: string, onderwerp: string, preheader?: string, stijlIn?: MailStijl): string {
  const font = isFont(stijlIn?.font) ? stijlIn!.font! : STANDAARD_FONT
  const achtergrond = isKleur(stijlIn?.achtergrond) ? stijlIn!.achtergrond! : '#F5F4F1'
  const kaart = isKleur(stijlIn?.kaart) ? stijlIn!.kaart! : '#FFFFFF'
  const tekst = isKleur(stijlIn?.tekst) ? stijlIn!.tekst! : '#1A1A1A'
  const webfont = webfontImport(font)
  const preheaderBlok = preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${achtergrond};">${escapeHtml(preheader.trim())}${'&zwnj;&nbsp;'.repeat(40)}</div>`
    : ''
  // Spiegelt src/components/nieuwsbrief/nieuwsbriefShell.ts (preview).
  return `<!DOCTYPE html>
<html lang="nl" dir="ltr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(onderwerp)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
${webfont ? `<!--[if !mso]><!--><style>${webfont}</style><!--<![endif]-->` : ''}
<style>:root{color-scheme:light dark;supported-color-schemes:light dark;} body{margin:0;padding:0;} table{border-collapse:collapse;} img{-ms-interpolation-mode:bicubic;} ${RESPONSIVE_CSS}</style></head>
<body style="margin:0;padding:0;background-color:${achtergrond};-webkit-font-smoothing:antialiased;word-spacing:normal;">
  ${preheaderBlok}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${achtergrond};padding:32px 16px;">
    <tr><td align="center">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">
        <tr><td style="background-color:${kaart};border-radius:12px;padding:36px 36px 28px 36px;font-family:${font};font-size:15px;line-height:1.65;color:${tekst};">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 36px 0 36px;font-family:${font};font-size:12px;color:#9B9B95;text-align:center;line-height:1.6;">
          Je ontvangt deze mail omdat je contact bent van Sign Company.<br>
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9B9B95;text-decoration:underline;">Uitschrijven</a>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`
}

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for nieuwsbrief-verzend, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '3600 s'), prefix: 'rl:nieuwsbrief-verzend', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] nieuwsbrief-verzend id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] nieuwsbrief-verzend id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!resend) return res.status(500).json({ error: 'Resend is niet geconfigureerd' })

  try {
    if (!(await verifyOwner(req))) return res.status(403).json({ error: 'Geen toegang' })
    if (!(await enforceRateLimit(OWNER_USER_ID, res))) return

    const { nieuwsbriefId, onderwerp, html, preheader, scheduledAt, ontvangers, stijl } = (req.body ?? {}) as {
      nieuwsbriefId?: string; onderwerp?: string; html?: string; preheader?: string; scheduledAt?: string
      ontvangers?: OntvangerSelectie; stijl?: MailStijl
    }
    const selectie: OntvangerSelectie = ontvangers && typeof ontvangers === 'object' ? ontvangers : { type: 'alle' }
    if (scheduledAt) {
      const dt = new Date(scheduledAt)
      if (isNaN(dt.getTime()) || dt.getTime() < Date.now() + 30_000) return res.status(400).json({ error: 'Kies een moment in de toekomst' })
      if (dt.getTime() > Date.now() + 30 * 24 * 3600_000) return res.status(400).json({ error: 'Inplannen kan maximaal 30 dagen vooruit' })
    }
    if (!nieuwsbriefId) return res.status(400).json({ error: 'nieuwsbriefId ontbreekt' })
    if (!onderwerp?.trim()) return res.status(400).json({ error: 'Geef een onderwerp op' })
    if (!html?.trim()) return res.status(400).json({ error: 'De nieuwsbrief is nog leeg' })

    const { data: rij } = await supabase
      .from('nieuwsbrieven').select('id, user_id, status').eq('id', nieuwsbriefId).maybeSingle()
    if (!rij || (rij as Record<string, unknown>).user_id !== OWNER_USER_ID) {
      return res.status(404).json({ error: 'Nieuwsbrief niet gevonden' })
    }
    const huidigeStatus = (rij as Record<string, unknown>).status
    if (huidigeStatus === 'verzonden') return res.status(400).json({ error: 'Deze nieuwsbrief is al verzonden' })
    if (huidigeStatus === 'gepland') return res.status(400).json({ error: 'Deze nieuwsbrief staat al ingepland' })
    if (html.length > 500_000) return res.status(400).json({ error: 'De nieuwsbrief is te groot (max 500 kB HTML)' })
    if (onderwerp.trim().length > 200) return res.status(400).json({ error: 'Het onderwerp is te lang' })

    // Claim de rij vóór het verzenden: twee snelle klikken of twee tabbladen
    // mogen nooit twee broadcasts opleveren. Alleen wie van 'concept' naar
    // 'bezig' komt, mag door; bij een fout zetten we hem terug.
    const { data: geclaimd } = await supabase
      .from('nieuwsbrieven')
      .update({ status: 'gepland', gepland_op: scheduledAt || null, updated_at: new Date().toISOString() })
      .eq('id', nieuwsbriefId)
      .eq('status', 'concept')
      .select('id')
    if (!geclaimd || geclaimd.length === 0) return res.status(409).json({ error: 'Deze nieuwsbrief wordt al verstuurd' })
    const geefVrij = async (fout: string, code = 502) => {
      await supabase.from('nieuwsbrieven').update({ status: 'concept', gepland_op: null }).eq('id', nieuwsbriefId)
      return res.status(code).json({ error: fout })
    }

    const volledigeHtml = buildNieuwsbriefHtml(html, onderwerp.trim(), preheader, stijl)
    const gepland = Boolean(scheduledAt)
    const nu = new Date().toISOString()
    let aantal = 0
    let broadcastId: string | null = null

    if (!selectie.type || selectie.type === 'alle') {
      // Iedereen: via de Resend-lijst als broadcast. Resend regelt dan zelf de
      // afmeldlink per ontvanger en het inplannen op schaal.
      const audienceId = await vindAudienceId(resend)
      if (!audienceId) return geefVrij('Werk eerst je verzendlijst bij (stap Ontvangers)', 400)

      const { data: contacten } = await resend.contacts.list({ audienceId })
      const actief = (contacten?.data ?? []).filter(c => !c.unsubscribed)
      if (actief.length === 0) return geefVrij('Geen actieve contacten in de lijst. Werk eerst je verzendlijst bij.', 400)

      const { data: broadcast, error: bcErr } = await resend.broadcasts.create({
        audienceId,
        from: FROM,
        replyTo: REPLY_TO,
        subject: onderwerp.trim(),
        previewText: preheader?.trim() || undefined,
        html: volledigeHtml,
      })
      if (bcErr || !broadcast) return geefVrij(`Kon de nieuwsbrief niet aanmaken bij Resend: ${bcErr?.message ?? 'onbekend'}`)
      const { error: sendErr } = scheduledAt
        ? await resend.broadcasts.send(broadcast.id, { scheduledAt })
        : await resend.broadcasts.send(broadcast.id)
      if (sendErr) return geefVrij(`Verzenden mislukt bij Resend: ${sendErr.message}`)
      aantal = actief.length
      broadcastId = broadcast.id
    } else {
      // Selectie: per ontvanger gepersonaliseerd, met eigen afmeldlink.
      if (!AFMELD_GEHEIM) return geefVrij('NIEUWSBRIEF_WEBHOOK_TOKEN ontbreekt; de afmeldlink kan niet worden gemaakt', 500)
      const { data: profile } = await supabase
        .from('profiles').select('organisatie_id').eq('id', OWNER_USER_ID).maybeSingle()
      const orgId = (profile?.organisatie_id as string | null) ?? null
      if (!orgId) return geefVrij('Geen organisatie gevonden voor de eigenaar', 400)

      const lijst = await verzamelOntvangers(orgId, selectie)
      if (lijst.length === 0) return geefVrij('Je selectie bevat geen ontvangers met een e-mailadres', 400)
      if (gepland && lijst.length > MAX_GEPLAND_PER_RUN) {
        return geefVrij(`Inplannen voor een selectie kan tot ${MAX_GEPLAND_PER_RUN} ontvangers. Kies "Iedereen" of verstuur nu.`, 400)
      }

      const tags = [{ name: 'nieuwsbrief_id', value: nieuwsbriefId }]
      const maak = (o: Ontvanger) => ({
        from: FROM,
        to: [o.email],
        replyTo: REPLY_TO,
        subject: personaliseer(onderwerp.trim(), o),
        html: personaliseer(volledigeHtml, o),
        headers: {
          'List-Unsubscribe': `<${afmeldUrl(o.email)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags,
      })

      const mislukt: string[] = []
      if (gepland) {
        for (const o of lijst) {
          const { error } = await resend.emails.send({ ...maak(o), scheduledAt })
          if (error) mislukt.push(o.email)
          else aantal++
          await sleep(THROTTLE_MS)
        }
      } else {
        for (let i = 0; i < lijst.length; i += BATCH_GROOTTE) {
          const deel = lijst.slice(i, i + BATCH_GROOTTE)
          const { data, error } = await resend.batch.send(deel.map(maak))
          if (error) {
            console.error('[nieuwsbrief-verzend] batch mislukt:', error)
            mislukt.push(...deel.map(d => d.email))
          } else {
            aantal += data?.data?.length ?? deel.length
            const rijen = deel.map(d => ({ nieuwsbrief_id: nieuwsbriefId, email: d.email, type: 'sent' }))
            await supabase.from('nieuwsbrief_events').upsert(rijen, { onConflict: 'nieuwsbrief_id,email,type', ignoreDuplicates: true })
          }
          if (i + BATCH_GROOTTE < lijst.length) await sleep(THROTTLE_MS)
        }
      }
      if (aantal === 0) return geefVrij('Geen enkele mail kon worden verstuurd. Controleer de Resend-instellingen.')
      if (mislukt.length > 0) console.warn(`[nieuwsbrief-verzend] ${mislukt.length} mails mislukt:`, mislukt.slice(0, 10))
    }

    const { data: bijgewerkt, error: updErr } = await supabase
      .from('nieuwsbrieven')
      .update({
        onderwerp: onderwerp.trim(),
        html,
        preheader: preheader?.trim() || null,
        ontvangers: selectie,
        status: gepland ? 'gepland' : 'verzonden',
        resend_broadcast_id: broadcastId,
        aantal_ontvangers: aantal,
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
      aantalOntvangers: aantal,
      broadcastId,
      nieuwsbrief: bijgewerkt ?? null,
    })
  } catch (err) {
    console.error('[nieuwsbrief-verzend] fout:', err)
    const id = (req.body as { nieuwsbriefId?: string } | undefined)?.nieuwsbriefId
    if (id) await supabase.from('nieuwsbrieven').update({ status: 'concept', gepland_op: null }).eq('id', id).eq('status', 'gepland').is('resend_broadcast_id', null).is('verzonden_op', null).is('aantal_ontvangers', null)
    return res.status(500).json({ error: (err as Error).message || 'Verzenden mislukt' })
  }
}
