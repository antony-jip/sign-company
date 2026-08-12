import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { gzipSync } from 'zlib'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  const SENS = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
  const scrub = (v: unknown, d = 0): unknown => {
    if (d > 6 || v == null) return v
    if (Array.isArray(v)) return v.map(x => scrub(x, d + 1))
    if (typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENS.test(k) ? '[Filtered]' : scrub(val, d + 1)
      return o
    }
    return v
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ============================================================
// Welke tabellen in de uitvoer zitten
//
// Alleen tabellen met een organisatie_id-kolom. Dat is geen willekeurige
// grens maar de enige die veilig is: elke query hieronder filtert
// verplicht op .eq('organisatie_id', <org van de beller>). Bestaat die
// kolom niet, dan geeft PostgREST fout 42703 in plaats van alle rijen.
// Het faalt dus naar de kant waar niemand data van een andere
// organisatie ziet.
//
// De lijst komt NIET uit de migratiemap. Die map liegt hier: hij zegt dat
// offerte_items, factuur_items, werkbon_regels en 34 andere tabellen geen
// organisatie_id hebben, terwijl ze die in de database wél hebben. Een
// uitvoer op basis van de migratiemap had dus offertes zonder regels en
// facturen zonder regels opgeleverd. De lijst hieronder komt uit het
// live PostgREST-schema: 107 tabellen met de kolom, min de 8 die bij
// NIET_OPGENOMEN staan, is 99. Elke tabel is gecontroleerd met exact de
// query die hieronder gebruikt wordt (select *, order, range).
//
// Bij het toevoegen van een tabel: kijk in de database of de kolom er is,
// niet in supabase/migrations.
//
// `sorteer` is de kolom waarop gepagineerd wordt. Zonder ORDER BY mag
// Postgres per .range()-verzoek een andere rijvolgorde teruggeven, en dan
// mist of dubbelt een uitvoer van meer dan 1000 rijen.
// ============================================================
const TABELLEN: { tabel: string; sorteer: string }[] = [
  // Klant en contact
  { tabel: 'klanten', sorteer: 'id' },
  { tabel: 'contactpersonen', sorteer: 'id' },
  { tabel: 'klant_historie', sorteer: 'id' },
  { tabel: 'klant_activiteiten', sorteer: 'id' },
  { tabel: 'deals', sorteer: 'id' },
  { tabel: 'deal_activiteiten', sorteer: 'id' },
  { tabel: 'lead_formulieren', sorteer: 'id' },
  { tabel: 'lead_inzendingen', sorteer: 'id' },

  // Werk
  { tabel: 'projecten', sorteer: 'id' },
  { tabel: 'project_toewijzingen', sorteer: 'id' },
  { tabel: 'project_fotos', sorteer: 'id' },
  { tabel: 'taken', sorteer: 'id' },
  { tabel: 'werkbonnen', sorteer: 'id' },
  { tabel: 'werkbon_items', sorteer: 'id' },
  { tabel: 'werkbon_regels', sorteer: 'id' },
  { tabel: 'werkbon_fotos', sorteer: 'id' },
  { tabel: 'werkbon_afbeeldingen', sorteer: 'id' },
  { tabel: 'tekening_goedkeuringen', sorteer: 'id' },
  { tabel: 'signing_visualisaties', sorteer: 'id' },
  { tabel: 'visualizer_chats', sorteer: 'id' },
  { tabel: 'visualizer_credits', sorteer: 'id' },
  { tabel: 'credit_transacties', sorteer: 'id' },

  // Offertes
  { tabel: 'offertes', sorteer: 'id' },
  { tabel: 'offerte_items', sorteer: 'id' },
  { tabel: 'offerte_versies', sorteer: 'id' },
  { tabel: 'offerte_templates', sorteer: 'id' },
  { tabel: 'offerte_opvolg_schemas', sorteer: 'id' },
  { tabel: 'calculatie_producten', sorteer: 'id' },
  { tabel: 'calculatie_templates', sorteer: 'id' },
  { tabel: 'kortingen', sorteer: 'id' },

  // Geld
  { tabel: 'facturen', sorteer: 'id' },
  { tabel: 'factuur_items', sorteer: 'id' },
  { tabel: 'factuur_bijlagen', sorteer: 'id' },
  { tabel: 'uitgaven', sorteer: 'id' },
  { tabel: 'kostenplaatsen', sorteer: 'id' },
  { tabel: 'grootboek', sorteer: 'id' },
  { tabel: 'btw_codes', sorteer: 'id' },
  { tabel: 'abonnement_facturen', sorteer: 'id' },

  // Inkoop en voorraad
  { tabel: 'leveranciers', sorteer: 'id' },
  { tabel: 'inkoop_offertes', sorteer: 'id' },
  { tabel: 'inkoop_regels', sorteer: 'id' },
  { tabel: 'inkoopfacturen', sorteer: 'id' },
  { tabel: 'inkoopfactuur_inbox_config', sorteer: 'id' },
  { tabel: 'bestelbonnen', sorteer: 'id' },
  { tabel: 'bestelbon_regels', sorteer: 'id' },
  { tabel: 'leveringsbonnen', sorteer: 'id' },
  { tabel: 'leveringsbon_regels', sorteer: 'id' },
  { tabel: 'voorraad_artikelen', sorteer: 'id' },
  { tabel: 'voorraad_mutaties', sorteer: 'id' },

  // Mensen en planning
  { tabel: 'profiles', sorteer: 'id' },
  { tabel: 'medewerkers', sorteer: 'id' },
  { tabel: 'uitnodigingen', sorteer: 'id' },
  { tabel: 'vestigingen', sorteer: 'id' },
  { tabel: 'montage_afspraken', sorteer: 'id' },
  { tabel: 'events', sorteer: 'id' },
  { tabel: 'tijdregistraties', sorteer: 'id' },
  { tabel: 'verlof', sorteer: 'id' },
  { tabel: 'bedrijfssluitingsdagen', sorteer: 'id' },
  { tabel: 'planning_afwezigheid', sorteer: 'id' },
  { tabel: 'planning_vrij_patronen', sorteer: 'id' },
  { tabel: 'planning_dag_notities', sorteer: 'id' },
  { tabel: 'booking_slots', sorteer: 'id' },
  { tabel: 'booking_afspraken', sorteer: 'id' },
  { tabel: 'maatjes', sorteer: 'id' },

  // Documenten en portaal
  { tabel: 'documenten', sorteer: 'id' },
  { tabel: 'document_styles', sorteer: 'id' },
  { tabel: 'project_portalen', sorteer: 'id' },
  { tabel: 'portaal_items', sorteer: 'id' },
  { tabel: 'portaal_bestanden', sorteer: 'id' },
  { tabel: 'portaal_reacties', sorteer: 'id' },
  { tabel: 'app_notificaties', sorteer: 'id' },

  // Communicatie (los van `emails`, zie NIET_OPGENOMEN)
  { tabel: 'email_templates', sorteer: 'id' },
  { tabel: 'email_opvolgingen', sorteer: 'id' },
  { tabel: 'email_project_koppelingen', sorteer: 'id' },
  { tabel: 'email_sequences', sorteer: 'id' },
  { tabel: 'ingeplande_emails', sorteer: 'id' },
  { tabel: 'herinnering_templates', sorteer: 'id' },
  { tabel: 'notificaties', sorteer: 'id' },
  { tabel: 'support_gesprekken', sorteer: 'id' },
  { tabel: 'website_aanvragen', sorteer: 'id' },
  { tabel: 'website_chat_gesprekken', sorteer: 'id' },
  { tabel: 'website_chat_berichten', sorteer: 'id' },
  // Geen id-kolom: organisatie_id is hier de primaire sleutel.
  { tabel: 'website_chat_aanwezigheid', sorteer: 'organisatie_id' },

  // Instellingen en kennisbank
  { tabel: 'app_settings', sorteer: 'id' },
  { tabel: 'kb_categories', sorteer: 'id' },
  { tabel: 'kb_articles', sorteer: 'id' },
  { tabel: 'import_logs', sorteer: 'id' },

  // Daan (AI-geheugen over dit bedrijf)
  { tabel: 'ai_geheugen', sorteer: 'id' },
  { tabel: 'ai_conventies', sorteer: 'id' },
  { tabel: 'ai_rondes', sorteer: 'id' },
  { tabel: 'ai_sporen', sorteer: 'id' },
  { tabel: 'ai_briefings', sorteer: 'id' },
  { tabel: 'ai_chats', sorteer: 'id' },
  { tabel: 'ai_chat_history', sorteer: 'id' },
  { tabel: 'ai_imported_data', sorteer: 'id' },
  { tabel: 'ai_usage', sorteer: 'id' },
  { tabel: 'ai_usage_org', sorteer: 'id' },

  // Logboek
  { tabel: 'audit_log', sorteer: 'id' },
  { tabel: 'audit_log_feature', sorteer: 'id' },
]

// Wat er bewust NIET in zit, en waarom. Deze uitleg gaat mee in de
// uitvoer zodat de ontvanger ziet waar de grens ligt. Zie docs/AVG.md
// voor de volledige verantwoording.
const NIET_OPGENOMEN: Record<string, string> = {
  emails: 'De gesynchroniseerde mailbox (bij de grootste organisatie ruim 19.000 berichten, meer dan 30 MB) past niet in één antwoord van een serverless functie. De berichten staan bovendien onveranderd in de mailbox bij je eigen mailprovider; doen. houdt daar een kopie van. Opvragen kan met een bericht aan de support.',
  bestanden: 'Bestanden in de opslag (pdf\'s, foto\'s, logo\'s, bijlagen) zitten niet in de database en dus niet in dit bestand. De verwijzingen ernaar (paden en URL\'s) staan wel in de rijen hieronder.',
  'user_email_settings, exact_tokens': 'Je mailkoppeling en je boekhoudkoppeling. Dit zijn inloggegevens, geen bedrijfsgegevens, en ze staan per persoon en niet per organisatie. Ze horen in geen enkele uitvoer.',
  'tabellen zonder organisatie_id': 'Een handvol tabellen heeft die kolom niet en is daarom niet per organisatie af te bakenen: inkoopfactuur_regels (de regels onder een inkoopfactuur), leads, offerte_opvolg_log, offerte_opvolg_stappen, portaal_activiteiten, ingeplande_berichten, support_berichten, nieuwsbrieven, nieuwsbrief_afmeldingen, nieuwsbrief_events, email_attachment_cache, push_abonnementen. Ze hangen aan een bovenliggende rij en vragen een tweede ronde queries over die sleutel.',
  email_send_idempotency: 'Technisch logboek dat dubbele verzending voorkomt (hashes van verstuurde berichten). Staat niets in dat niet al elders in de uitvoer staat.',
  seo_kansen: 'Hoort bij de website signcompany.nl en niet bij de app. Wordt daar door een eigen cron gevuld.',
  'rijen met een lege organisatie_id': 'De uitvoer selecteert op organisatie_id. Rijen waarin die kolom leeg is gebleven vallen daarmee buiten elke uitvoer, van welke organisatie ook. Dat raakt nu portaal_reacties, ai_chats, ai_chat_history, ai_usage, credit_transacties, werkbon_items, portaal_items en portaal_bestanden. Zie docs/AVG.md; dit vraagt een backfill, niet een ruimere selectie.',
  'backup-tabellen': 'Momentopnames uit eerdere opschoonacties (klanten_merge_backup_20260722, credit_transacties_backup_20260726, visualizer_credits_backup_20260726, klanten_debiteurennummer_backup_20260722). Kopieën van een oudere toestand van rijen die hierboven al in hun huidige vorm staan.',
}

// Kolommen die er per definitie uit gaan. Het filter werkt op KOLOMNAAM
// en niet op tabelnaam: een nieuwe tabel met een geheim erin is dan
// vanzelf gedekt, ook als niemand deze lijst bijwerkt.
//
// Naast de vier voor de hand liggende woorden (encrypted, token,
// password, api_key) staan hier `secret`, `sleutel`, `credential` en
// `geheim`. Zonder die aanvulling lekt app_settings twee echte geheimen:
// `exact_online_client_secret` en `snelstart_koppelsleutel`. Beide zijn
// gecontroleerd tegen de live database.
//
// Het filter is ruimer dan strikt nodig en dat is de bedoeling: het
// haalt ook `publiek_token_verloopt_op` en de teller-kolommen
// `input_tokens` / `output_tokens` weg. Een vervaldatum of een aantal
// tokens te veel gewist is hinderlijk; een geheim te veel meegestuurd is
// een datalek. De weggelaten kolomnamen staan in de uitvoer onder
// `verwijderde_kolommen`, zodat zichtbaar is wát er ontbreekt.
const GEVOELIGE_KOLOM = /encrypted|token|password|api_key|secret|sleutel|credential|geheim/i

const PAGINA_GROOTTE = 1000

// Bovengrens per tabel. Voorkomt dat een uitgelopen tabel de functie
// laat aflopen; als hij geraakt wordt staat dat in `afgekapt`.
const MAX_RIJEN_PER_TABEL = 50000

// Vercel begrenst het antwoord van een serverless functie op 4,5 MB.
// Onder deze grens gaat het antwoord ongecomprimeerd de deur uit; komt
// het erboven en accepteert de client gzip, dan gaat het gecomprimeerd.
// Past het gecomprimeerd ook niet, dan volgt een 413 met de aantallen
// per tabel: liever een duidelijke fout dan een half bestand dat zich
// voordoet als een volledige uitvoer.
const MAX_ANTWOORD_BYTES = 4 * 1024 * 1024

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
// Streng: een volledige uitvoer is tientallen queries over de hele
// organisatie. Twee per uur is genoeg om een keer opnieuw te proberen na
// een mislukte download, en te weinig om de database mee plat te leggen.
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for org-export, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(2, '3600 s'), prefix: 'rl:org-export', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] org-export id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Een volledige uitvoer kan twee keer per uur.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] org-export id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

function getClientIp(req: VercelRequest): string | null {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim() || null
  if (Array.isArray(fwd)) return fwd[0] || null
  return null
}

async function logAuditEvent(
  supabase: SupabaseClient,
  event: {
    organisatie_id?: string | null
    actor_user_id?: string | null
    actor_email?: string | null
    action: string
    resource_type?: string
    resource_id?: string
    metadata?: Record<string, unknown>
    ip?: string | null
  },
): Promise<void> {
  try {
    const ipHash = event.ip
      ? crypto.createHash('sha256').update(event.ip).digest('hex').slice(0, 32)
      : null
    await supabase.from('audit_log').insert({
      organisatie_id: event.organisatie_id ?? null,
      actor_user_id: event.actor_user_id ?? null,
      actor_email: event.actor_email ?? null,
      action: event.action,
      resource_type: event.resource_type ?? null,
      resource_id: event.resource_id ?? null,
      metadata: event.metadata ?? {},
      ip_hash: ipHash,
    })
  } catch (err) {
    console.warn('[audit] log failed:', err)
  }
}

type Rij = Record<string, unknown>

// Haalt alle rijen van één tabel voor één organisatie op. PostgREST geeft
// standaard maximaal 1000 rijen per verzoek; `klanten` en
// `klant_historie` zitten daar ruim boven, dus wordt er doorgebladerd met
// .range(). Zelfde patroon als src/services/supabaseHelpers.ts
// (fetchAllPages), hier inline omdat api/* niets uit src/ mag importeren.
async function haalAlleRijen(
  tabel: string,
  filterKolom: string,
  filterWaarde: string,
  sorteer: string,
): Promise<{ rijen: Rij[]; afgekapt: boolean }> {
  const alles: Rij[] = []
  for (let van = 0; van < MAX_RIJEN_PER_TABEL; van += PAGINA_GROOTTE) {
    const tot = Math.min(van + PAGINA_GROOTTE, MAX_RIJEN_PER_TABEL) - 1
    const { data, error } = await supabaseAdmin
      .from(tabel)
      .select('*')
      .eq(filterKolom, filterWaarde)
      .order(sorteer, { ascending: true })
      .range(van, tot)
    if (error) throw error
    if (!data || data.length === 0) return { rijen: alles, afgekapt: false }
    alles.push(...(data as Rij[]))
    if (data.length < PAGINA_GROOTTE) return { rijen: alles, afgekapt: false }
  }
  return { rijen: alles, afgekapt: true }
}

// Verwijdert gevoelige kolommen, ook als ze in een JSONB-veld genest
// zitten. Houdt bij welke namen zijn weggehaald zodat de uitvoer daar
// verantwoording over aflegt.
function stripGevoelig(waarde: unknown, tabel: string, gevonden: Set<string>, diepte = 0): unknown {
  if (diepte > 8 || waarde == null) return waarde
  if (Array.isArray(waarde)) return waarde.map(v => stripGevoelig(v, tabel, gevonden, diepte + 1))
  if (typeof waarde === 'object') {
    const uit: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(waarde as Record<string, unknown>)) {
      if (GEVOELIGE_KOLOM.test(k)) {
        gevonden.add(`${tabel}.${k}`)
        continue
      }
      uit[k] = stripGevoelig(v, tabel, gevonden, diepte + 1)
    }
    return uit
  }
  return waarde
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const userId = await verifyUser(req)

    // De organisatie komt uit het profiel van de beller, nooit uit het
    // verzoek. Wie hem toch meestuurt krijgt een fout in plaats van een
    // stille afwijzing: dan is duidelijk dat de parameter niets doet en
    // gaat niemand ervan uit dat hij werkt.
    if (req.query.organisatie_id || req.query.organisatie) {
      return res.status(400).json({ error: 'organisatie_id wordt niet geaccepteerd; de uitvoer gaat altijd over je eigen organisatie' })
    }

    const { data: profiel } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, rol, email')
      .eq('id', userId)
      .single()

    if (!profiel || profiel.rol !== 'admin') {
      return res.status(403).json({ error: 'Alleen admins kunnen een volledige uitvoer opvragen' })
    }

    const organisatieId = profiel.organisatie_id as string | null
    if (!organisatieId) {
      return res.status(403).json({ error: 'Je account hangt niet aan een organisatie' })
    }

    if (!(await enforceRateLimit(userId, res))) return

    const { data: organisatie } = await supabaseAdmin
      .from('organisaties')
      .select('*')
      .eq('id', organisatieId)
      .maybeSingle()

    const verwijderdeKolommen = new Set<string>()
    const tabellen: Record<string, Rij[]> = {}
    const rijenPerTabel: Record<string, number> = {}
    const afgekapt: string[] = []
    const fouten: Record<string, string> = {}

    for (const { tabel, sorteer } of TABELLEN) {
      try {
        const { rijen, afgekapt: capBereikt } = await haalAlleRijen(tabel, 'organisatie_id', organisatieId, sorteer)
        tabellen[tabel] = rijen.map(r => stripGevoelig(r, tabel, verwijderdeKolommen) as Rij)
        rijenPerTabel[tabel] = rijen.length
        if (capBereikt) afgekapt.push(tabel)
      } catch (err) {
        // Eén onbereikbare tabel mag de hele uitvoer niet slopen. De fout
        // gaat mee in het bestand, want een ontbrekende tabel die stil
        // wegvalt is erger dan een zichtbare foutmelding.
        const melding = (err as { message?: string }).message || String(err)
        console.error(`org-export: tabel ${tabel} mislukt:`, melding)
        fouten[tabel] = melding
        rijenPerTabel[tabel] = 0
      }
    }

    const uitvoer = {
      formaat: 'doen-org-export/1',
      gegenereerd_op: new Date().toISOString(),
      grondslag: 'AVG artikel 15 en 20: recht op inzage en op overdraagbaarheid van gegevens',
      organisatie: {
        id: organisatieId,
        naam: (organisatie as Rij | null)?.naam ?? null,
        record: organisatie ? stripGevoelig(organisatie, 'organisaties', verwijderdeKolommen) : null,
      },
      opgevraagd_door: { user_id: userId, email: profiel.email ?? null },
      rijen_per_tabel: rijenPerTabel,
      totaal_rijen: Object.values(rijenPerTabel).reduce((a, b) => a + b, 0),
      verwijderde_kolommen: [...verwijderdeKolommen].sort(),
      toelichting_verwijderde_kolommen:
        'Kolomnamen met encrypted, token, password, api_key, secret, sleutel, credential of geheim erin zijn weggelaten. Dat zijn inloggegevens en toegangssleutels; die horen niet in een uitvoer, ook niet in je eigen uitvoer.',
      niet_opgenomen: NIET_OPGENOMEN,
      ...(afgekapt.length ? { afgekapt, toelichting_afgekapt: `Deze tabellen zijn afgekapt op ${MAX_RIJEN_PER_TABEL} rijen.` } : {}),
      ...(Object.keys(fouten).length ? { fouten } : {}),
      tabellen,
    }

    await logAuditEvent(supabaseAdmin, {
      organisatie_id: organisatieId,
      actor_user_id: userId,
      actor_email: profiel.email ?? null,
      action: 'org.data_exported',
      resource_type: 'organisatie',
      resource_id: organisatieId,
      metadata: {
        totaal_rijen: uitvoer.totaal_rijen,
        tabellen: TABELLEN.length,
        mislukte_tabellen: Object.keys(fouten),
      },
      ip: getClientIp(req),
    })

    const json = JSON.stringify(uitvoer)
    const platteBytes = Buffer.byteLength(json, 'utf8')
    const bestandsnaam = `doen-export-${organisatieId}-${new Date().toISOString().slice(0, 10)}.json`

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${bestandsnaam}"`)
    res.setHeader('Cache-Control', 'no-store')

    if (platteBytes <= MAX_ANTWOORD_BYTES) {
      return res.status(200).send(json)
    }

    const accepteertGzip = /gzip/i.test(String(req.headers['accept-encoding'] || ''))
    if (accepteertGzip) {
      const gz = gzipSync(Buffer.from(json, 'utf8'))
      if (gz.byteLength <= MAX_ANTWOORD_BYTES) {
        res.setHeader('Content-Encoding', 'gzip')
        res.setHeader('Vary', 'Accept-Encoding')
        return res.status(200).send(gz)
      }
    }

    console.warn(`org-export: te groot org=${organisatieId} bytes=${platteBytes}`)
    res.removeHeader('Content-Disposition')
    return res.status(413).json({
      error: 'De uitvoer is te groot voor één antwoord. Vraag hem per e-mail aan; we leveren hem dan als bestand.',
      bytes: platteBytes,
      rijen_per_tabel: rijenPerTabel,
    })
  } catch (error) {
    const melding = (error as Error).message
    if (melding === 'Niet geautoriseerd' || melding === 'Ongeldige sessie') {
      return res.status(401).json({ error: melding })
    }
    console.error('org-export error:', error)
    Sentry.captureException(error)
    return res.status(500).json({ error: 'Er ging iets mis bij het maken van de uitvoer' })
  }
}
