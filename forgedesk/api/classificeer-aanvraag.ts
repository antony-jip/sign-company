import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Aanvraagherkenning. Draait direct na een mailsync: beoordeelt binnengekomen
// inbox-mail op de vraag "is dit iemand die werk bij ons wil neerleggen?".
//
// Drie lagen, in deze volgorde:
//   1. SQL-selectie   — alleen nog niet beoordeelde inbox-mail.
//   2. Voorfilter     — gratis, op afzender en onderwerp. Filtert het gros weg.
//   3. Claude Haiku   — alleen wat overblijft, op de mailtekst.
//
// De sync mag hier nooit op stuklopen: elke fout wordt gelogd en overgeslagen.

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const supabase = supabaseAdmin

// ── Daan spoor (inline; grondstof voor de nachtelijke consolidatie) ──
async function schrijfSpoor(
  orgId: string | null,
  userId: string | null,
  agent: string,
  inhoud: Record<string, unknown>,
  klantId: string | null = null
): Promise<void> {
  if (!orgId) return
  try {
    await supabase.from('ai_sporen').insert({
      organisatie_id: orgId,
      user_id: userId,
      agent,
      klant_id: klantId,
      inhoud,
    })
  } catch {
    // Sporen zijn niet-kritiek; het antwoord gaat gewoon door.
  }
}

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_KANDIDATEN_PER_RUN = 25
const MAX_TEKST_TEKENS = 4000
const MAX_LEEFTIJD_DAGEN = 14
const TOON_DREMPEL = 70
// Zelfde maandplafond als api/ai-email.ts; één budget voor alle AI in doen.
// Anthropic factureert in dollars; doen. rekent en toont in euro's. Alles wat
// in geschatte_kosten belandt is dus EUR, zodat de maandlimiet, de meter in
// Instellingen en de blokkade-melding dezelfde eenheid hebben. Zelfde koers
// als de Visualizer gebruikt (utils/visualizerDefaults.ts).
const USD_NAAR_EUR = 0.92

// Vangnet per gebruiker, in euro's. Deze check draait onvoorwaardelijk, dus
// ook mét organisatie; normaal bijt hij nooit omdat het eigen verbruik per
// definitie kleiner is dan het org-totaal. Hij is er voor gebruikers zonder
// organisatie, want dan kan de org-check niet draaien. Gelijk aan de
// org-limiet: een eenpitter mag niet op een derde van zijn budget stoppen.
const MONTHLY_LIMIT = 15.0

// Houd gelijk aan de DEFAULT van ai_usage_org.maandlimiet (migratie 161).
const STANDAARD_MAANDLIMIET_EUR = 15.0

// Haiku 4.5, tarief per miljoen tokens.
const TARIEF = { in: 1, uit: 5 }

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// ───── Credentials (inline; api/ mag niet uit src/ of api/_helpers/ importeren) ─────

interface EmailCredentials {
  gmail_address: string
  app_password: string
  imap_host: string
  imap_port: number
}

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf8')
  }
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  // g1: AES-256-GCM met willekeurige salt en auth-tag. Het oude CBC-formaat
  // had een vaste salt en geen integriteitscontrole. Beide oude vormen blijven
  // leesbaar zodat niemand buitengesloten raakt.
  if (encrypted.startsWith('g1:')) {
    try {
      const raw = Buffer.from(encrypted.slice(3), 'base64')
      const salt = raw.subarray(0, 16)
      const iv = raw.subarray(16, 28)
      const tag = raw.subarray(28, 44)
      const ct = raw.subarray(44)
      const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32)
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
    } catch {
      throw new Error('Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op')
    }
  }
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const [ivHex, encryptedHex] = encrypted.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    throw new Error('Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op')
  }
}

async function getEmailCredentials(userId: string): Promise<EmailCredentials> {
  const { data, error } = await supabaseAdmin
    .from('user_email_settings')
    .select('gmail_address, encrypted_app_password, imap_host, imap_port')
    .eq('user_id', userId)
    .single()

  if (error || !data?.gmail_address || !data?.encrypted_app_password) {
    throw new Error('Geen email instellingen gevonden')
  }

  return {
    gmail_address: data.gmail_address,
    app_password: decryptPassword(data.encrypted_app_password),
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
  }
}

// ───── Laag 2: voorfilter op afzender en onderwerp ─────

// Systeemafzenders. Mail hiervandaan is per definitie geen aanvraag.
const AFZENDER_UITSLUITINGEN = [
  'no-reply', 'noreply', 'no_reply', 'donotreply', 'do-not-reply',
  'mailer-daemon', 'postmaster', 'bounce', 'notification', 'notifications',
  'nieuwsbrief', 'newsletter', 'marketing', 'mailing', 'automated',
  'billing', 'facturatie', 'invoice', 'boekhouding', 'administratie',
  'support@', 'noreply@', 'info@linkedin', 'via linkedin',
]

// Onderwerpen die op transactie- of bulkmail wijzen, niet op een vraag om werk.
const ONDERWERP_UITSLUITINGEN = [
  'factuur', 'invoice', 'betalingsherinnering', 'aanmaning', 'incasso',
  'nieuwsbrief', 'newsletter', 'uitschrijven', 'unsubscribe', 'afmelden',
  'bestelbevestiging', 'orderbevestiging', 'pakbon', 'track & trace',
  'verzendbevestiging', 'bezorgd', 'levering onderweg',
  'automatisch antwoord', 'automatic reply', 'out of office', 'afwezig',
  'undelivered', 'delivery status', 'mail delivery',
  'vacature', 'sollicitatie', 'stage', 'cv',
  'webinar', 'aanbieding', 'actie', 'korting', 'black friday',
  'wachtwoord', 'password', 'verificatie', 'verify', 'inloggen',
  'contract', 'abonnement', 'verlenging', 'opzegging',
]

function bevat(haystack: string, naalden: string[]): boolean {
  const h = haystack.toLowerCase()
  return naalden.some((n) => h.includes(n))
}

interface KandidaatRij {
  id: string
  uid: number | null
  imap_folder: string | null
  from_address: string | null
  from_name: string | null
  onderwerp: string | null
  body_text: string | null
  thread_id: string | null
  datum: string
}

/** Header-only uitsluitingen. Kost niets en haalt het gros eruit. */
function komtDoorVoorfilter(mail: KandidaatRij, eigenAdres: string): boolean {
  const afzender = `${mail.from_address || ''} ${mail.from_name || ''}`.toLowerCase()
  const onderwerp = (mail.onderwerp || '').toLowerCase()

  if (!mail.from_address) return false
  if (mail.from_address.toLowerCase() === eigenAdres.toLowerCase()) return false
  if (bevat(afzender, AFZENDER_UITSLUITINGEN)) return false
  if (bevat(onderwerp, ONDERWERP_UITSLUITINGEN)) return false
  // Re: en Fwd: duiden op lopende correspondentie. De eerste mail van een
  // thread is de aanvraag, niet het antwoord erop.
  if (/^\s*(re|antw|aw|fwd?|doorst)\s*:/i.test(mail.onderwerp || '')) return false

  return true
}

// ───── Laag 3: Claude ─────

const SYSTEM_PROMPT = `Je beoordeelt e-mail voor een signbedrijf (lichtbakken, gevelreclame, belettering, bewegwijzering).

Eén vraag: legt de afzender hier werk bij ons neer of vraagt hij om een prijs of mogelijkheid?

WEL een aanvraag:
- een klant of prospect vraagt om een offerte, prijsopgave of levertijd
- iemand beschrijft een klus die hij uitgevoerd wil hebben
- iemand vraagt of iets kan, met de duidelijke bedoeling het te laten maken

GEEN aanvraag:
- facturen, betalingsherinneringen, aanmaningen
- nieuwsbrieven, reclame, uitnodigingen, webinars
- leveranciers die iets aanbieden of verkopen
- sollicitaties, stageverzoeken, wervingsmail
- lopende correspondentie over werk dat al loopt: planningsvragen, akkoord op een offerte, vragen over een lopende opdracht
- algemene vragen zonder opdracht erachter

Wees streng. Twijfel je, dan is het geen aanvraag. Een gemiste aanvraag is minder erg dan een kaart die er onterecht staat.`

const TOOL_SCHEMA = {
  name: 'beoordeel',
  description: 'Geef het oordeel over deze e-mail.',
  input_schema: {
    type: 'object' as const,
    properties: {
      is_aanvraag: {
        type: 'boolean',
        description: 'True als de afzender werk of een prijs vraagt.',
      },
      zekerheid: {
        type: 'integer',
        description: 'Hoe zeker je bent, 0 tot 100.',
      },
      samenvatting: {
        type: 'string',
        description:
          'Wat er gevraagd wordt, in één zin, bruikbaar als projectomschrijving. Leeg als het geen aanvraag is.',
      },
    },
    required: ['is_aanvraag', 'zekerheid', 'samenvatting'],
  },
}

interface Oordeel {
  is_aanvraag: boolean
  zekerheid: number
  samenvatting: string
}

async function beoordeelMail(
  mail: KandidaatRij,
  tekst: string,
  apiKey: string
): Promise<{ oordeel: Oordeel; inputTokens: number; outputTokens: number } | null> {
  const inhoud = [
    `Afzender: ${mail.from_name || ''} <${mail.from_address || ''}>`,
    `Onderwerp: ${mail.onderwerp || '(geen onderwerp)'}`,
    '',
    tekst.slice(0, MAX_TEKST_TEKENS),
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: 'beoordeel' },
      messages: [{ role: 'user', content: inhoud }],
    }),
  })

  if (!response.ok) {
    console.error('[classificeer-aanvraag] Anthropic fout:', response.status)
    return null
  }

  const data = await response.json() as {
    content?: Array<{ type: string; name?: string; input?: unknown }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const toolBlock = (data.content || []).find((c) => c.type === 'tool_use')
  if (!toolBlock?.input) return null

  const ruw = toolBlock.input as Partial<Oordeel>
  if (typeof ruw.is_aanvraag !== 'boolean') return null

  return {
    oordeel: {
      is_aanvraag: ruw.is_aanvraag,
      zekerheid: Math.max(0, Math.min(100, Number(ruw.zekerheid) || 0)),
      samenvatting: String(ruw.samenvatting || '').slice(0, 500),
    },
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  }
}

// ───── Usage ─────

function getCurrentMonth(): string {
  const now = new Date()
  // UTC, niet lokaal: migratie 093 legt de maandsleutel als UTC vast. Zou de
  // runtime ooit op Europe/Amsterdam staan, dan schrijven routes rond de
  // maandwisseling anders naar twee verschillende maandrijen voor dezelfde org.
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

async function budgetOver(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('ai_usage')
    .select('geschatte_kosten')
    .eq('user_id', userId)
    .eq('maand', getCurrentMonth())
    .maybeSingle()
  return !data || (data.geschatte_kosten ?? 0) < MONTHLY_LIMIT
}

async function boekUsage(userId: string, inputTokens: number, outputTokens: number, calls: number): Promise<void> {
  if (!calls) return
  const maand = getCurrentMonth()
  const kosten = ((inputTokens / 1_000_000 * TARIEF.in) + (outputTokens / 1_000_000 * TARIEF.uit)) * USD_NAAR_EUR

  const { data: bestaand } = await supabaseAdmin
    .from('ai_usage')
    .select('id, aantal_calls, input_tokens, output_tokens, geschatte_kosten, aanvraag_calls, aanvraag_kosten')
    .eq('user_id', userId)
    .eq('maand', maand)
    .maybeSingle()

  if (bestaand) {
    await supabaseAdmin
      .from('ai_usage')
      .update({
        aantal_calls: (bestaand.aantal_calls || 0) + calls,
        input_tokens: (bestaand.input_tokens || 0) + inputTokens,
        output_tokens: (bestaand.output_tokens || 0) + outputTokens,
        geschatte_kosten: Number(((bestaand.geschatte_kosten || 0) + kosten).toFixed(4)),
        aanvraag_calls: (bestaand.aanvraag_calls || 0) + calls,
        aanvraag_kosten: Number(((bestaand.aanvraag_kosten || 0) + kosten).toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bestaand.id)
  } else {
    await supabaseAdmin.from('ai_usage').insert({
      user_id: userId,
      maand,
      aantal_calls: calls,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      geschatte_kosten: Number(kosten.toFixed(4)),
      aanvraag_calls: calls,
      aanvraag_kosten: Number(kosten.toFixed(4)),
    })
  }

  // Ook op de organisatie boeken. Zonder dit telt aanvraagherkenning niet mee
  // in de €15-limiet, terwijl het juist de grootste structurele verbruiker is:
  // het draait per binnenkomende mail, niet per handeling van een gebruiker.
  const orgId = await resolveOrgId(userId)
  if (orgId) await boekOrgUsage(orgId, kosten, calls)
}

async function resolveOrgId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()
  return (data?.organisatie_id as string | null) ?? null
}

async function boekOrgUsage(organisatieId: string, kosten: number, calls: number): Promise<void> {
  const maand = getCurrentMonth()
  // Atomair bijschrijven via de RPC (migratie 174). Een read-modify-write laat
  // twee gelijktijdige calls over elkaar heen schrijven, en dat verlies is
  // altijd in het nadeel van doen.: de teller loopt achter en de rem grijpt
  // te laat in.
  const { error } = await supabaseAdmin.rpc('ai_usage_org_bijschrijf', {
    p_organisatie_id: organisatieId,
    p_route: 'classificeer-aanvraag',
    p_maand: maand,
    p_kosten: Number(kosten.toFixed(4)),
    p_calls: calls,
  })
  if (error) console.error('boekOrgUsage: bijschrijven mislukt', organisatieId, error)
}

/**
 * De maandlimiet hoort bij het abonnement, niet bij een verbruiksrij. Volgorde:
 * de staffel op de organisatie (migratie 172), anders de oude waarde op
 * ai_usage_org, anders de constante. Zolang migratie 172 niet gedraaid is faalt
 * de eerste select stil en blijft het oude gedrag intact. Gelijk houden aan de
 * zes ai-routes: als deze route op 15 blijft hangen terwijl de rest 30 doorlaat,
 * valt de aanvraagherkenning stil zonder dat iemand het merkt.
 */
async function haalMaandlimiet(
  organisatieId: string,
  maand: string
): Promise<{ limiet: number; betrouwbaar: boolean }> {
  const { data: org, error: orgFout } = await supabaseAdmin
    .from('organisaties')
    .select('ai_maandlimiet')
    .eq('id', organisatieId)
    .maybeSingle()
  if (orgFout && !kolomOntbreekt(orgFout)) {
    console.error('haalMaandlimiet: organisatie onleesbaar', organisatieId, orgFout)
    return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  }
  const uitStaffel = Number(org?.ai_maandlimiet ?? NaN)
  if (Number.isFinite(uitStaffel) && uitStaffel >= 0) {
    return { limiet: uitStaffel, betrouwbaar: true }
  }

  const { data: rijen, error: rijenFout } = await supabaseAdmin
    .from('ai_usage_org')
    .select('maandlimiet')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (rijenFout) {
    console.error('haalMaandlimiet: ai_usage_org onleesbaar', organisatieId, rijenFout)
    return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: false }
  }
  if (rijen && rijen.length > 0) {
    return {
      limiet: Math.max(...rijen.map(r => Number(r.maandlimiet ?? STANDAARD_MAANDLIMIET_EUR))),
      betrouwbaar: true,
    }
  }
  return { limiet: STANDAARD_MAANDLIMIET_EUR, betrouwbaar: true }
}

/**
 * 42703 is undefined_column; PGRST204 is dezelfde situatie via de schema-cache.
 * Bewust alleen op foutcode en niet op de tekst van de melding: een RLS- of
 * permissiefout die de kolomnaam echoot zou anders als "niet gemigreerd" gelezen
 * worden, en dan valt een organisatie stilletjes terug naar de standaardlimiet.
 */
function kolomOntbreekt(fout: { code?: string }): boolean {
  return fout.code === '42703' || fout.code === 'PGRST204'
}

/** Blokkeert de hele run zodra de organisatie door haar maandbudget heen is. */
async function orgBudgetOp(organisatieId: string): Promise<boolean> {
  const maand = getCurrentMonth()
  const { data: rows, error: verbruikFout } = await supabaseAdmin
    .from('ai_usage_org')
    .select('geschatte_kosten')
    .eq('organisatie_id', organisatieId)
    .eq('maand', maand)
  if (verbruikFout) {
    console.error('orgBudgetOp: verbruik onleesbaar', organisatieId, verbruikFout)
  }
  const huidig = (rows ?? []).reduce((s, r) => s + Number(r.geschatte_kosten ?? 0), 0)
  const { limiet, betrouwbaar } = await haalMaandlimiet(organisatieId, maand)
  return !verbruikFout && betrouwbaar && huidig >= limiet
}

// ───── Bodies ophalen voor kandidaten die nog geen tekst hebben ─────

/**
 * Eén IMAP-sessie voor alle kandidaten zonder body_text. Dit is hetzelfde werk
 * dat read-email later bij het openen zou doen, dus de body wordt meteen
 * gecacht: die mails openen daarna sneller.
 *
 * De HTML gaat bewust mee terug. Alleen de tekst wegschrijven maakte de rij
 * voor read-email "al gecacht", waarna de reader eeuwig de kale tekstversie
 * toonde — bij nieuwsbrieven is dat het "bekijk deze mail online"-regeltje.
 */
async function haalBodies(
  creds: EmailCredentials,
  kandidaten: KandidaatRij[]
): Promise<{ bodies: Map<string, { tekst: string; html: string | null }>; sessieOk: boolean }> {
  const resultaat = new Map<string, { tekst: string; html: string | null }>()
  let sessieOk = false
  const perMap = new Map<string, KandidaatRij[]>()
  for (const mail of kandidaten) {
    if (!mail.uid) continue
    const folder = mail.imap_folder || 'INBOX'
    const lijst = perMap.get(folder) || []
    lijst.push(mail)
    perMap.set(folder, lijst)
  }
  if (!perMap.size) return { bodies: resultaat, sessieOk: true }

  const client = new ImapFlow({
    host: creds.imap_host,
    port: creds.imap_port,
    secure: creds.imap_port === 993,
    auth: { user: creds.gmail_address, pass: creds.app_password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  })

  try {
    await client.connect()
    sessieOk = true
    for (const [folder, mails] of perMap) {
      try {
        await client.mailboxOpen(folder, { readOnly: true })
      } catch (err) {
        console.warn('[classificeer-aanvraag] map openen mislukt:', folder, err)
        continue
      }
      for (const mail of mails) {
        try {
          let source: Buffer | null = null
          for await (const msg of client.fetch({ uid: `${mail.uid}:${mail.uid}` }, { source: true })) {
            if ('source' in msg && msg.source) source = msg.source as Buffer
            break
          }
          if (!source) continue
          const parsed = await simpleParser(source, {
            skipImageLinks: true,
            skipTextLinks: true,
            skipTextToHtml: true,
          })
          const tekst = (parsed.text || '').trim()
          let html = typeof parsed.html === 'string' ? parsed.html : ''
          // Inline beeld zit in de HTML als cid:-verwijzing naar een deel van
          // de mail. Zelfde vervanging als read-email doet, anders staat de
          // reader straks naar gebroken logo's te kijken. Wordt het daarmee
          // te zwaar voor een DB-rij, dan slaan we de HTML over: read-email
          // haalt hem bij het openen alsnog compleet op.
          if (html && parsed.attachments?.length) {
            for (const att of parsed.attachments) {
              if (!att.contentId || !att.content) continue
              const cid = att.contentId.replace(/^<|>$/g, '')
              const dataUri = `data:${att.contentType || 'application/octet-stream'};base64,${att.content.toString('base64')}`
              html = html.split(`cid:${cid}`).join(dataUri)
            }
          }
          // null = niet wegschrijven; een lege string zou de rij markeren als
          // "geparsed, geen HTML" en de reader op de tekstversie vastzetten.
          const teZwaar = html.length > 2_000_000
          if (tekst || html) resultaat.set(mail.id, { tekst, html: teZwaar ? null : html })
        } catch (err) {
          console.warn('[classificeer-aanvraag] body ophalen mislukt voor', mail.id, err)
        }
      }
    }
  } catch (err) {
    console.error('[classificeer-aanvraag] IMAP-sessie mislukt:', err)
    sessieOk = false
  } finally {
    try { await client.logout() } catch { /* verbinding al dicht */ }
  }

  return { bodies: resultaat, sessieOk }
}

// ───── Handler ─────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let userId: string
  try {
    userId = await verifyUser(req)
  } catch (err) {
    return res.status(401).json({ error: err instanceof Error ? err.message : 'Niet geautoriseerd' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(200).json({ beoordeeld: 0, reden: 'geen_api_key' })

  try {
    if (!await budgetOver(userId)) {
      return res.status(200).json({ beoordeeld: 0, reden: 'budget_bereikt' })
    }

    // Ook de organisatielimiet respecteren. Deze route draait automatisch na
    // elke sync, dus zonder deze poort loopt hij door nadat de org op is.
    const orgIdVoorBudget = await resolveOrgId(userId)
    if (orgIdVoorBudget && await orgBudgetOp(orgIdVoorBudget)) {
      return res.status(200).json({ beoordeeld: 0, reden: 'org_budget_bereikt' })
    }

    // ── Laag 1: nog niet beoordeelde inbox-mail van de laatste twee weken ──
    const grens = new Date(Date.now() - MAX_LEEFTIJD_DAGEN * 24 * 60 * 60 * 1000).toISOString()
    const { data: rijen, error } = await supabaseAdmin
      .from('emails')
      .select('id, uid, imap_folder, from_address, from_name, onderwerp, body_text, thread_id, datum')
      .eq('user_id', userId)
      .eq('map', 'inbox')
      .is('is_aanvraag', null)
      .gte('datum', grens)
      .order('datum', { ascending: false })
      .limit(MAX_KANDIDATEN_PER_RUN * 4)
    if (error) throw error

    const alle = (rijen || []) as KandidaatRij[]
    if (!alle.length) return res.status(200).json({ beoordeeld: 0, aanvragen: 0 })

    const creds = await getEmailCredentials(userId)

    // ── Laag 2: voorfilter ──
    let kandidaten = alle.filter((m) => komtDoorVoorfilter(m, creds.gmail_address))

    // Threads waar al een project aan hangt zijn lopend werk, geen aanvraag.
    const threadIds = [...new Set(kandidaten.map((m) => m.thread_id).filter(Boolean))] as string[]
    if (threadIds.length) {
      const { data: gekoppeld } = await supabaseAdmin
        .from('email_project_koppelingen')
        .select('thread_id')
        .in('thread_id', threadIds)
      const bezet = new Set((gekoppeld || []).map((r) => r.thread_id as string))
      kandidaten = kandidaten.filter((m) => !m.thread_id || !bezet.has(m.thread_id))
    }

    // Bekende leveranciers vallen af, op adres en op domein.
    const { data: leveranciers } = await supabaseAdmin
      .from('leveranciers')
      .select('email')
      .eq('user_id', userId)
      .not('email', 'is', null)
    const levAdressen = new Set<string>()
    const levDomeinen = new Set<string>()
    for (const l of leveranciers || []) {
      const adres = String(l.email || '').toLowerCase().trim()
      if (!adres.includes('@')) continue
      levAdressen.add(adres)
      levDomeinen.add(adres.split('@')[1])
    }
    if (levAdressen.size) {
      kandidaten = kandidaten.filter((m) => {
        const adres = (m.from_address || '').toLowerCase()
        const domein = adres.split('@')[1] || ''
        return !levAdressen.has(adres) && !levDomeinen.has(domein)
      })
    }

    // De rest van deze run markeren we als beoordeeld-en-niet-aanvraag, zodat
    // de voorfilter niet elke sync opnieuw over dezelfde mail loopt.
    const afgevallen = alle.filter((m) => !kandidaten.some((k) => k.id === m.id))
    kandidaten = kandidaten.slice(0, MAX_KANDIDATEN_PER_RUN)

    if (afgevallen.length) {
      await supabaseAdmin
        .from('emails')
        .update({
          is_aanvraag: false,
          aanvraag_zekerheid: 0,
          aanvraag_beoordeeld_op: new Date().toISOString(),
        })
        .in('id', afgevallen.map((m) => m.id))
    }

    if (!kandidaten.length) {
      return res.status(200).json({ beoordeeld: 0, aanvragen: 0, voorgefilterd: afgevallen.length })
    }

    // ── Bodies ophalen waar nodig ──
    const zonderTekst = kandidaten.filter((m) => !m.body_text || m.body_text.trim().length < 20)
    const { bodies: opgehaald, sessieOk } = zonderTekst.length
      ? await haalBodies(creds, zonderTekst)
      : { bodies: new Map<string, { tekst: string; html: string | null }>(), sessieOk: true }

    for (const [emailId, body] of opgehaald) {
      await supabaseAdmin
        .from('emails')
        .update({
          body_text: body.tekst || null,
          // Lege string, geen null: dat is voor read-email het teken dat de
          // mail geparsed is en simpelweg geen HTML-deel heeft. Bij null laten
          // we de kolom met rust, zodat read-email hem alsnog ophaalt.
          ...(body.html === null ? {} : { body_html: body.html }),
          cached_at: new Date().toISOString(),
        })
        .eq('id', emailId)
    }

    // ── Laag 3: beoordelen ──
    let inputTokens = 0
    let outputTokens = 0
    let calls = 0
    let aanvragen = 0
    const voorbeelden: string[] = []

    // Mail-leerpad (fase 3): per beoordeelde mail van een bekende klant een
    // kern-spoor voor de nachtploeg. Org-toggle uit Instellingen > Daan;
    // fail-closed: bestaat de kolom nog niet (migratie 166 niet gedraaid)
    // of staat hij uit, dan wordt er niets geschreven. Alleen afzenders die
    // exact matchen op een klant-adres gaan mee; dat is tegelijk de ruis-
    // en de privacygrens.
    let mailLeertMee = false
    const klantAdressen = new Map<string, string>()
    if (orgIdVoorBudget) {
      const { data: leerInstelling, error: leerFout } = await supabaseAdmin
        .from('app_settings')
        .select('daan_leert_uit_email')
        .eq('organisatie_id', orgIdVoorBudget)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      mailLeertMee = !leerFout && ((leerInstelling?.daan_leert_uit_email as boolean | null) ?? true)
      if (mailLeertMee) {
        const { data: klanten } = await supabaseAdmin
          .from('klanten')
          .select('id, email')
          .eq('organisatie_id', orgIdVoorBudget)
        for (const k of klanten ?? []) {
          const adres = String(k.email || '').trim().toLowerCase()
          if (!adres) continue
          // Delen twee klanten één adres, dan is de afzender niet eenduidig
          // herleidbaar: niet gokken, dus geen attributie en geen spoor.
          if (klantAdressen.has(adres) && klantAdressen.get(adres) !== (k.id as string)) {
            klantAdressen.set(adres, '')
          } else {
            klantAdressen.set(adres, k.id as string)
          }
        }
      }
    }

    // Mail waar ook na het ophalen geen leesbare tekst in zit (losse HTML-
    // mailings, alleen een plaatje) valt niet te beoordelen. Die vinken we af,
    // anders blijft hij tot in lengte van dagen kandidaat en haalt elke run
    // opnieuw dezelfde bodies over IMAP op. Alleen als de IMAP-sessie het deed:
    // na een mislukte verbinding weten we niets en mag er niets afgeschreven.
    const onbruikbaar: string[] = []

    for (const mail of kandidaten) {
      const tekst = opgehaald.get(mail.id)?.tekst || mail.body_text || ''
      if (tekst.trim().length < 20) {
        if (sessieOk) onbruikbaar.push(mail.id)
        continue
      }

      let oordeel: Oordeel | null = null
      try {
        const uitkomst = await beoordeelMail(mail, tekst, apiKey)
        if (uitkomst) {
          oordeel = uitkomst.oordeel
          inputTokens += uitkomst.inputTokens
          outputTokens += uitkomst.outputTokens
          calls++
          if (voorbeelden.length < 3) voorbeelden.push(mail.onderwerp || '')
        }
      } catch (err) {
        console.warn('[classificeer-aanvraag] beoordeling mislukt voor', mail.id, err)
      }
      if (!oordeel) continue

      const teltAlsAanvraag = oordeel.is_aanvraag && oordeel.zekerheid >= TOON_DREMPEL
      if (teltAlsAanvraag) aanvragen++

      await supabaseAdmin
        .from('emails')
        .update({
          is_aanvraag: teltAlsAanvraag,
          aanvraag_zekerheid: oordeel.zekerheid,
          aanvraag_samenvatting: teltAlsAanvraag ? oordeel.samenvatting : null,
          aanvraag_beoordeeld_op: new Date().toISOString(),
        })
        .eq('id', mail.id)

      if (mailLeertMee) {
        const klantId = klantAdressen.get((mail.from_address || '').trim().toLowerCase()) ?? null
        if (klantId) {
          await schrijfSpoor(orgIdVoorBudget, userId, 'email-inzicht', {
            van: (mail.from_address || '').slice(0, 200),
            onderwerp: (mail.onderwerp || '').slice(0, 200),
            kern: tekst.replace(/\s+/g, ' ').slice(0, 600),
          }, klantId)
        }
      }
    }

    if (onbruikbaar.length) {
      await supabaseAdmin
        .from('emails')
        .update({
          is_aanvraag: false,
          aanvraag_zekerheid: 0,
          aanvraag_beoordeeld_op: new Date().toISOString(),
        })
        .in('id', onbruikbaar)
    }

    await boekUsage(userId, inputTokens, outputTokens, calls)

    await schrijfSpoor(orgIdVoorBudget, userId, 'classificeer-aanvraag', {
      verwerkt: calls,
      aanvragen,
      voorbeelden: voorbeelden.map(s => s.slice(0, 120)),
    })

    return res.status(200).json({
      beoordeeld: calls,
      aanvragen,
      voorgefilterd: afgevallen.length,
    })
  } catch (err) {
    console.error('[classificeer-aanvraag] mislukt:', err)
    // Bewust 200: de mailsync mag hier niet op stuklopen.
    return res.status(200).json({ beoordeeld: 0, fout: err instanceof Error ? err.message : 'onbekend' })
  }
}
