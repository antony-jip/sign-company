import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── GEDEELD-MET-API BEGIN ──────────────────────────────────────────────
// Letterlijke kopie in api/cron-mailsync-werker.ts en api/fetch-emails.ts.
// Bewust zonder imports, zodat het blok in een standalone api-bestand past.

type FlagStand = 'aan' | 'uit' | 'onbekend'

interface FeatureFlagRij {
  naam: string
  organisatie_id: string | null
  aan: boolean
}

// Serverkant van migratie 200. Zelfde rangorde als src/lib/featureFlags.ts:
// een globale false is een noodstop die geen org-rij kan overrulen, een
// org-rij gaat vóór een globale true, en géén rij is 'onbekend'.
function bepaalStand(
  naam: string,
  rijen: readonly FeatureFlagRij[],
  organisatieId: string | null,
): FlagStand {
  const vanDezeFlag = rijen.filter((r) => r.naam === naam)
  const globaal = vanDezeFlag.find((r) => r.organisatie_id == null)

  if (globaal && !globaal.aan) return 'uit'

  const perOrg = organisatieId
    ? vanDezeFlag.find((r) => r.organisatie_id === organisatieId)
    : undefined
  if (perOrg) return perOrg.aan ? 'aan' : 'uit'

  if (globaal) return 'aan'
  return 'onbekend'
}

// Faalt dicht: alles wat geen expliciete 'aan' is houdt het nieuwe pad uit.
function vlagStaatAan(
  naam: string,
  rijen: readonly FeatureFlagRij[],
  organisatieId: string | null,
): boolean {
  return bepaalStand(naam, rijen, organisatieId) === 'aan'
}

// Faalt dicht op transportniveau: een queryfout of een ontbrekende tabel
// levert nul rijen, dus staat geen enkele flag op 'aan'. De serverkant heeft
// geen bestaand gedrag te beschermen — hier is stil niets doen het juiste.
async function veiligeVlagRijen(
  laad: () => Promise<FeatureFlagRij[]>,
  onFout?: (fout: unknown) => void,
): Promise<FeatureFlagRij[]> {
  try {
    return await laad()
  } catch (fout) {
    onFout?.(fout)
    return []
  }
}

type TaakStatus = 'wachtend' | 'verwerken' | 'gedaan' | 'mislukt'
type FoutSoort = 'auth' | 'netwerk' | 'database' | 'onbekend'
// 'uitstel' is geen fout: de tijd was op vóór het werk klaar was. Die mag het
// foutbudget niet opmaken, anders belandt een grote mailbox die vier ronden
// nodig heeft om bij te komen in de dodebrievenbus.
type Aanleiding = FoutSoort | 'uitstel'

// Lease van 90s met 60s marge voor de opruimer. De marge dekt het klokverschil
// tussen de Vercel-runtime (die lease_tot berekent) en Postgres (dat now()
// levert), en garandeert dat een nog levende functie — maxDuration 60 — nooit
// onder zijn eigen taak wordt weggetrokken.
const LEASE_MS = 90_000
const LEASE_MARGE_MS = 60_000
// Tempo van de terugkerende incrementele taak: gelijk aan de oude cron
// (*/3 * * * *), zodat aanzetten geen tempoverandering is.
const HERPLAN_MS = 180_000
// Langer dan de [1, 5, 15] van ingeplande_berichten: daar wacht een mens op
// een mail, hier niet, en een kapotte mailserver is in 15 minuten niet heel.
// Zeven pogingen, samen ruim 10 uur.
const RETRY_DELAYS_MIN = [1, 3, 10, 30, 60, 180, 360]
// Plafond voor het uitstel dat géén fout is. Vangt de taak die binnen geen
// enkel venster af kan; zonder plafond draait die eeuwig rond.
const MAX_UITSTEL = 20

function leaseGrens(nu: number): string {
  return new Date(nu - LEASE_MARGE_MS).toISOString()
}

// Alleen de mailbox zelf is 'auth'. Die krijgt géén backoff maar meteen de
// dodebrievenbus: een verkeerd wachtwoord elke drie minuten opnieuw bij Gmail
// aanbieden is de manier om het account door Gmail geblokkeerd te krijgen.
const AUTH_PATROON = /authenticationfailed|invalid credentials|auth(?:enticatie)?\s*(?:mislukt|geweigerd|failed)|wachtwoord|password|encryption_key|geen email instellingen/i
const NETWERK_PATROON = /timeout|timed out|etimedout|econnreset|econnrefused|enotfound|eai_again|socket|network|aborted|abort/i
const DATABASE_PATROON = /\bupsert\b|postgrest|pgrst|does not exist|violates|constraint|database/i

function classificeerFout(bericht: string): FoutSoort {
  if (AUTH_PATROON.test(bericht)) return 'auth'
  if (NETWERK_PATROON.test(bericht)) return 'netwerk'
  if (DATABASE_PATROON.test(bericht)) return 'database'
  return 'onbekend'
}

// De HTTP-antwoorden van /api/fetch-emails apart, want de tekst alleen is hier
// misleidend. 401/403 betekent dat het cron-secret niet klopt: dat is een
// configuratiefout van de hele deploy en niet van deze mailbox, dus die mag
// niet elke taak in de dodebrievenbus duwen. 429 is de rate limit en dus
// uitstel, geen fout.
function classificeerHttp(status: number, tekst: string): Aanleiding {
  if (status === 429) return 'uitstel'
  if (status === 400) return classificeerFout(tekst)
  if (status === 401 || status === 403) return 'onbekend'
  if (status >= 500) return 'netwerk'
  return classificeerFout(tekst)
}

interface TaakUitkomst {
  status: Extract<TaakStatus, 'wachtend' | 'mislukt'>
  retry_count: number
  uitstel_count: number
  fout_soort: FoutSoort | null
  vertraging_ms: number
}

function bepaalFoutAfhandeling(
  aanleiding: Aanleiding,
  retryCount: number,
  uitstelCount: number,
): TaakUitkomst {
  if (aanleiding === 'uitstel') {
    const volgend = uitstelCount + 1
    return {
      status: volgend > MAX_UITSTEL ? 'mislukt' : 'wachtend',
      retry_count: retryCount,
      uitstel_count: volgend,
      fout_soort: volgend > MAX_UITSTEL ? 'onbekend' : null,
      vertraging_ms: 0,
    }
  }

  if (aanleiding === 'auth') {
    return {
      status: 'mislukt',
      retry_count: retryCount + 1,
      uitstel_count: uitstelCount,
      fout_soort: 'auth',
      vertraging_ms: 0,
    }
  }

  if (retryCount < RETRY_DELAYS_MIN.length) {
    return {
      status: 'wachtend',
      retry_count: retryCount + 1,
      uitstel_count: uitstelCount,
      fout_soort: aanleiding,
      vertraging_ms: RETRY_DELAYS_MIN[retryCount] * 60_000,
    }
  }

  return {
    status: 'mislukt',
    retry_count: retryCount + 1,
    uitstel_count: uitstelCount,
    fout_soort: aanleiding,
    vertraging_ms: 0,
  }
}

// De payload van de claim. Apart van de uitvoering zodat hij te testen is:
// api/* praat via supabase-js en PostgREST kan `now() + interval` niet in een
// UPDATE-payload uitdrukken, dus lease_tot wordt hier berekend. geclaimd_op
// blijft bewust óók een JS-tijd zodat beide velden uit dezelfde klok komen.
function claimWaarden(runId: string, nu: number): Record<string, unknown> {
  return {
    status: 'verwerken',
    geclaimd_op: new Date(nu).toISOString(),
    geclaimd_door: runId,
    lease_tot: new Date(nu + LEASE_MS).toISOString(),
    updated_at: new Date(nu).toISOString(),
  }
}

// Compare-and-swap: de uitvoerder MOET `status = 'wachtend'` in zijn WHERE
// zetten en false teruggeven als de UPDATE nul rijen raakte. Zo verliest bij
// twee gelijktijdige claims er precies één, en die slaat de taak over in
// plaats van hem naast de winnaar te verwerken.
type CasUitvoer = (
  waarden: Record<string, unknown>,
  verwachteStatus: TaakStatus,
) => Promise<boolean>

async function claimTaak(
  runId: string,
  nu: number,
  cas: CasUitvoer,
): Promise<Record<string, unknown> | null> {
  const waarden = claimWaarden(runId, nu)
  return (await cas(waarden, 'wachtend')) ? waarden : null
}

// Verlopen lease terugzetten. Verhoogt retry_count: zonder dat blijft een taak
// die structureel de functietijd overschrijdt eeuwig rondgaan zonder ooit in
// de dodebrievenbus te belanden.
function opruimWaarden(nu: number, retryCount: number): Record<string, unknown> {
  return {
    status: 'wachtend',
    retry_count: retryCount + 1,
    fout_soort: 'onbekend',
    foutmelding: 'lease verlopen: proces gestorven of functietijd op',
    scheduled_at: new Date(nu).toISOString(),
    geclaimd_op: null,
    geclaimd_door: null,
    lease_tot: null,
    updated_at: new Date(nu).toISOString(),
  }
}

// Ook de opruimer is een CAS, op `status = 'verwerken'`, zodat twee
// gelijktijdige opruimers dezelfde taak niet twee keer terugzetten en
// retry_count niet twee keer verhogen.
async function opruimTaak(
  nu: number,
  retryCount: number,
  cas: CasUitvoer,
): Promise<Record<string, unknown> | null> {
  const waarden = opruimWaarden(nu, retryCount)
  return (await cas(waarden, 'verwerken')) ? waarden : null
}

// Terugkerende taak hergebruiken in plaats van 'gedaan' zetten en een nieuwe
// inplannen. Zo blijft de coalescing-index betekenisvol (precies één rij per
// mailbox, altijd) en blijft de tabel klein.
function herplanWaarden(nu: number, duurMs: number | null): Record<string, unknown> {
  return {
    status: 'wachtend',
    scheduled_at: new Date(nu + HERPLAN_MS).toISOString(),
    retry_count: 0,
    uitstel_count: 0,
    fout_soort: null,
    foutmelding: null,
    gemeld_op: null,
    geclaimd_op: null,
    geclaimd_door: null,
    lease_tot: null,
    laatste_duur_ms: duurMs,
    updated_at: new Date(nu).toISOString(),
  }
}

// FNV-1a, 32 bits. Bewust geen crypto: dit blok moet zonder imports in een
// standalone api-bestand passen. Er hangt geen beveiliging aan de waarde, hij
// moet alleen deterministisch en kort zijn.
function korteHash(tekst: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < tekst.length; i++) {
    hash ^= tekst.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

// Mail zonder Message-ID dupliceert vandaag bij elke herhaalde ophaal: de
// constraint is UNIQUE (user_id, message_id) zonder NULLS NOT DISTINCT, en
// Postgres ziet twee NULL's als verschillend. Een id uit de IMAP-identiteit is
// stabiel zolang UIDVALIDITY niet wisselt, dus dekt de bestaande constraint
// daarna 100 procent van de rijen zonder tweede conflictdoel.
//
// Het domein maakt later leesbaar dat de waarde niet van de afzender komt. Een
// gesynthetiseerd id matcht nooit een In-Reply-To, en dat is correct: naar een
// bericht zonder Message-ID kan niemand verwijzen.
function synthetiseerMessageId(
  uid: number,
  uidvalidity: number,
  imapFolder: string,
): string {
  return `<uid-${uid}.${uidvalidity}.${korteHash(imapFolder)}@sync.doen.local>`
}

function messageIdVoorRij(
  headerMessageId: string | null | undefined,
  uid: number | null | undefined,
  uidvalidity: number,
  imapFolder: string,
): string | null {
  if (headerMessageId) return headerMessageId
  // Zonder UID is er geen stabiele identiteit; dan liever NULL dan een id dat
  // bij de volgende ronde anders is en alsnog dupliceert.
  if (!uid) return null
  return synthetiseerMessageId(uid, uidvalidity, imapFolder)
}

// ── GEDEELD-MET-API EINDE ──────────────────────────────────────────────

const VLAG_QUEUE = 'mailsync_queue'
// Kort in cache per invocatie, niet per request: dit is de warmste route van
// de app en een vlagquery per verversing is te duur.
const VLAG_CACHE_MS = 30_000
let vlagCache: { op: number; rijen: FeatureFlagRij[] } | null = null

/**
 * Serverkant van het feature-flag-mechanisme uit migratie 200. Zie de
 * uitgebreide toelichting in api/cron-mailsync-werker.ts; de resolutie staat in
 * het gedeelde blok hierboven, want api/* mag niets uit src/ importeren.
 *
 * Faalt dicht: elke fout, en ook een ontbrekende feature_flags-tabel, levert
 * nul rijen en dus 'onbekend'. Deze functie hangt in het pad waarlangs de mail
 * van een echt bedrijf binnenkomt, dus hij mag nooit gooien.
 */
async function queueVlagAan(organisatieId: string | null): Promise<boolean> {
  const nu = Date.now()
  let rijen = vlagCache && nu - vlagCache.op < VLAG_CACHE_MS ? vlagCache.rijen : null
  if (!rijen) {
    rijen = await veiligeVlagRijen(
      async () => {
        const { data, error } = await supabaseAdmin
          .from('feature_flags')
          .select('naam, organisatie_id, aan')
          .eq('naam', VLAG_QUEUE)
        if (error) throw new Error(error.message)
        return (data ?? []) as FeatureFlagRij[]
      },
      (fout) => console.warn('[fetch-emails] feature_flags niet leesbaar, mailsync_queue blijft uit:',
        fout instanceof Error ? fout.message : fout),
    )
    vlagCache = { op: nu, rijen }
  }
  return vlagStaatAan(VLAG_QUEUE, rijen, organisatieId)
}

async function isRateLimited(key: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: key, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]

  // Service-modus voor cron-email-sync: die draait zonder sessie en zegt zelf
  // voor welke gebruiker hij synct. Alleen geldig met het cron-secret, en het
  // secret moet gezet zijn — een lege env-var mag nooit als sleutel dienen.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && token === cronSecret) {
    const serviceUser = req.body?.service_user_id
    if (typeof serviceUser !== 'string' || !serviceUser) {
      throw new Error('Niet geautoriseerd')
    }
    return serviceUser
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

interface EmailCredentials {
  gmail_address: string
  app_password: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
}

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf8')
  }
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) {
    throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd — sla je wachtwoord opnieuw op in Instellingen > Email > Verbinding')
  }
  // g1: AES-256-GCM met willekeurige salt en auth-tag. Het oude CBC-formaat
  // gebruikte een vaste salt ('salt') en had geen integriteitscontrole, dus
  // geknoei aan de ciphertext viel niet op. Beide oude vormen blijven
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
    .select('gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port')
    .eq('user_id', userId)
    .single()

  if (error || !data?.gmail_address || !data?.encrypted_app_password) {
    throw new Error('Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.')
  }

  return {
    gmail_address: data.gmail_address,
    app_password: decryptPassword(data.encrypted_app_password),
    smtp_host: data.smtp_host || 'smtp.gmail.com',
    smtp_port: data.smtp_port || 587,
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
  }
}

// Folder name mapping — best effort. Werkt op Gmail-NL out of the box.
// Voor Gmail-EN, niet-Gmail, of accounts met andere folder-namen valt
// resolveImapFolder() hieronder terug op de IMAP folder listing.
const FOLDER_MAP: Record<string, string> = {
  'inbox': 'INBOX',
  'verzonden': '[Gmail]/Verzonden berichten',
  'sent': '[Gmail]/Sent Mail',
  'concepten': '[Gmail]/Concepten',
  'drafts': '[Gmail]/Drafts',
  'prullenbak': '[Gmail]/Prullenbak',
  'trash': '[Gmail]/Trash',
  'spam': '[Gmail]/Spam',
  'alle': '[Gmail]/Alle berichten',
  'all': '[Gmail]/All Mail',
}

// Special-use flags per logische folder. IMAP servers exposen deze via
// LIST extension (RFC 6154). Gmail, Outlook, FastMail e.a. ondersteunen het.
const SPECIAL_USE_MAP: Record<string, string> = {
  inbox: '\\Inbox',
  verzonden: '\\Sent',
  sent: '\\Sent',
  concepten: '\\Drafts',
  drafts: '\\Drafts',
  prullenbak: '\\Trash',
  trash: '\\Trash',
  spam: '\\Junk',
  alle: '\\All',
  all: '\\All',
}

// Naam-fallback patterns als special-use ontbreekt
const NAME_PATTERNS: Record<string, RegExp> = {
  verzonden: /sent|verzonden|gesendet|envoy/i,
  sent: /sent|verzonden|gesendet|envoy/i,
  concepten: /draft|concept|brouillon|entwurf/i,
  drafts: /draft|concept|brouillon|entwurf/i,
  prullenbak: /trash|deleted|prullen|corbeille|papierkorb/i,
  trash: /trash|deleted|prullen|corbeille|papierkorb/i,
  spam: /spam|junk|ongewenst/i,
  alle: /all\s*mail|alle\s*berichten|all messages/i,
  all: /all\s*mail|alle\s*berichten|all messages/i,
}

interface ImapMailbox {
  path: string
  name?: string
  specialUse?: string
  flags?: Set<string> | string[]
}

async function resolveImapFolder(client: ImapFlow, folder: string): Promise<string> {
  const lower = folder.toLowerCase()

  // 1. INBOX is universeel
  if (lower === 'inbox') return 'INBOX'

  // 2. Probeer eerst de hardcoded mapping (werkt op Gmail-NL)
  const mapped = FOLDER_MAP[lower]
  if (mapped) {
    try {
      const status = await client.status(mapped, { messages: true })
      if (status) return mapped
    } catch {
      // mailbox bestaat niet, ga door naar dynamische fallback
    }
  }

  // 3. Dynamische fallback: list alle folders en zoek op special-use of naam
  try {
    const mailboxes = (await client.list()) as ImapMailbox[]
    const wantedSpecialUse = SPECIAL_USE_MAP[lower]
    if (wantedSpecialUse) {
      const bySpecialUse = mailboxes.find((m) => m.specialUse === wantedSpecialUse)
      if (bySpecialUse) return bySpecialUse.path
    }
    const namePattern = NAME_PATTERNS[lower]
    if (namePattern) {
      // Voorkeur voor folders direct onder root (geen sub-folders), exact match eerst
      const candidates = mailboxes.filter((m) => namePattern.test(m.path) || namePattern.test(m.name || ''))
      if (candidates.length > 0) {
        // Voorkeur voor [Gmail]/... varianten als die er zijn
        const gmailVariant = candidates.find((m) => m.path.startsWith('[Gmail]/'))
        return (gmailVariant || candidates[0]).path
      }
    }
  } catch (err) {
    console.error('[fetch-emails] folder list lookup failed:', err)
  }

  // 4. Last resort: gebruik de input zoals hij is
  return folder
}

export const config = { maxDuration: 60 }

/**
 * "We hebben gekeken" vastleggen, zonder de waterlijn aan te raken.
 *
 * De cron sorteert op deze kolom en pakt de acht oudste. Tikt een pad hem niet
 * aan, dan blijft dat account permanent vooraan en verdringt het de mailboxen
 * die wel post krijgen. Dat gold aanvankelijk voor de stille mailbox, en het
 * geldt net zo voor de kapotte: een fout app-password of een onbereikbare
 * server bezet anders eeuwig een plek.
 *
 * Bewust een partiele update en geen upsert: bestaat de rij niet, dan is dit een
 * no-op en dat is juist. Een nieuwe rij aanmaken zou een waterlijn van 0
 * suggereren op een mailbox die nooit gelezen is.
 */
async function tikSyncTijdstip(user_id: string, mapValue: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('email_sync_state')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('folder', mapValue)
  } catch {
    // Mag de sync nooit laten falen: dit is administratie, geen mail.
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let client: ImapFlow | null = null
  // Buiten de try, zodat de catch nog weet welke folder we probeerden. mapValue
  // zelf staat binnen de try en is daar niet in scope.
  let mapValueVoorTik: string | null = null
  let userIdVoorTik: string | null = null

  try {
    // `snel`: alleen mail ophalen en wegschrijven, zonder de nabewerking
    // (sales-match, lead-match). Die twee sweeps kosten samen tot 18 seconden
    // en de client wacht op deze respons voordat hij de lijst opnieuw leest —
    // op een telefoon is dat het verschil tussen "mail is er" en een halve
    // minuut naar een lege inbox kijken. De cron draait ze wel, dus het werk
    // gebeurt nog steeds, alleen niet in het pad van de gebruiker.
    const { folder = 'INBOX', limit = 100, snel = false } = req.body

    const user_id = await verifyUser(req)
    userIdVoorTik = user_id

    // E-mails horen org-gestempeld de tabel in: de nachtploeg-briefing en
    // andere org-brede lezers filteren op organisatie_id, en RLS-backfills
    // (047/083) draaien niet voor nieuwe rijen.
    const { data: orgProfiel } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id')
      .eq('id', user_id)
      .maybeSingle()
    const mailOrgId = (orgProfiel?.organisatie_id as string | null) ?? null

    // Staat de wachtrij aan, dan krijgt mail zonder Message-ID er een uit zijn
    // IMAP-identiteit. Zie messageIdVoorRij hierboven en het gebruik verderop;
    // zonder vlag blijft de kolom NULL, precies zoals vandaag.
    const queueVlag = await queueVlagAan(mailOrgId)

    // IMAP-verbindingen zijn duur — begrens per gebruiker
    if (await isRateLimited(`fetch-emails:${user_id}`, 30, 60)) {
      return res.status(429).json({ error: 'Te veel synchronisatieverzoeken. Probeer het zo opnieuw.' })
    }

    // Get credentials (DB first, fallback to request body)
    let gmail_address: string, app_password: string, imap_host: string, imap_port: number
    try {
      const creds = await getEmailCredentials(user_id)
      gmail_address = creds.gmail_address
      app_password = creds.app_password
      imap_host = creds.imap_host
      imap_port = creds.imap_port
    } catch {
      gmail_address = req.body.gmail_address
      app_password = req.body.app_password
      imap_host = req.body.imap_host || 'imap.gmail.com'
      imap_port = req.body.imap_port || 993
      if (!gmail_address || !app_password) {
        return res.status(400).json({ error: 'Geen email instellingen gevonden.' })
      }
    }

    const mapValue = folder.toUpperCase() === 'INBOX' ? 'inbox' : folder.toLowerCase()
    mapValueVoorTik = mapValue

    // ─── Connect to IMAP ───
    client = new ImapFlow({
      host: imap_host,
      port: imap_port,
      secure: imap_port === 993,
      auth: { user: gmail_address, pass: app_password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    })

    await client.connect()
    // Dynamische folder lookup — werkt voor Gmail-NL/EN, Outlook, FastMail, etc.
    const imapFolder = await resolveImapFolder(client, folder)
    console.log('[fetch-emails] folder resolved', { input: folder, imap: imapFolder })
    const mailbox = await client.mailboxOpen(imapFolder)
    const total = mailbox.exists

    if (total === 0) {
      // Een lege mailbox is wel bekeken, dus hij hoort achteraan in de wachtrij.
      await tikSyncTijdstip(user_id, mapValue)
      await client.logout()
      return res.status(200).json({ synced: 0, total: 0, fetched: 0 })
    }

    // ─── Sync-modus: UID-incrementeel waar mogelijk ───
    // Met een geldige sync-state halen we alleen UIDs boven de waterlijn op
    // (oudste eerst, zodat last_seen_uid contigu opschuift; bij meer dan
    // MAX_PER_RUN komt de rest in de volgende call — response.remaining).
    // Zonder state (eerste keer, UIDVALIDITY-wissel, of migratie 131 nog
    // niet gedraaid) bootstrappen we met het oude laatste-N-gedrag.
    const uidValidity = Number(mailbox.uidValidity ?? 0)
    const MAX_PER_RUN = 600

    const { data: syncState } = await supabaseAdmin
      .from('email_sync_state')
      .select('uidvalidity, last_seen_uid')
      .eq('user_id', user_id)
      .eq('folder', mapValue)
      .maybeSingle()

    const stateBruikbaar = !!syncState
      && Number(syncState.uidvalidity) === uidValidity
      && Number(syncState.last_seen_uid) > 0

    if (syncState && Number(syncState.uidvalidity) !== uidValidity) {
      // UIDVALIDITY-wissel: alle UIDs (incl. backfill-voortgang) zijn ongeldig.
      // Re-bootstrap is correct — al gesyncte mails blijven gededupliceerd
      // in de DB, de backfill scant alleen opnieuw.
      console.warn('[fetch-emails] UIDVALIDITY gewijzigd, re-bootstrap', {
        folder: mapValue, oud: syncState.uidvalidity, nieuw: uidValidity,
      })
    }

    let fetchQuery: { seq?: string; uid?: string } | null = null
    let incremental = false
    let remaining = 0

    // Buiten het else-blok, want de flags-resync verderop gebruikt hem ook.
    // Stond hij binnen dat blok, dan gooide die regel een ReferenceError die
    // stil werd weggevangen, waardoor elders-gelezen mail hier ongelezen bleef.
    const gevraagdeLimit = Number(limit)
    const veiligeLimit = Number.isFinite(gevraagdeLimit) && gevraagdeLimit > 0
      ? Math.min(Math.floor(gevraagdeLimit), MAX_PER_RUN)
      : 100

    if (stateBruikbaar) {
      incremental = true
      const lastSeen = Number(syncState!.last_seen_uid)
      const nieuweUids = ((await client.search({ uid: `${lastSeen + 1}:*` }, { uid: true })) || [])
        .filter((u: number) => u > lastSeen)
        .sort((a: number, b: number) => a - b)
      remaining = Math.max(0, nieuweUids.length - MAX_PER_RUN)
      const teHalen = nieuweUids.slice(0, MAX_PER_RUN)
      if (teHalen.length > 0) fetchQuery = { uid: teHalen.join(',') }
    } else {
      // Begrensd: `limit` komt uit de request body. Zonder plafond probeert
      // een mailbox met tienduizenden berichten alles in één run op te halen
      // en loopt de functie tegen maxDuration aan. De rest volgt vanzelf in
      // de volgende call, want daarna is de sync-state incrementeel.
      const fetchCount = Math.min(veiligeLimit, total)
      const startSeq = Math.max(1, total - fetchCount + 1)
      fetchQuery = { seq: `${startSeq}:${total}` }
    }

    const newEmails: Array<Record<string, unknown>> = []
    // Parallel aan newEmails: de message-id van de ouder, afgeleid uit
    // In-Reply-To of anders uit References. Bewust niet in de rij zelf, want
    // in_reply_to hoort de letterlijke header te blijven en een onbekende
    // kolom breekt de upsert.
    const ouderIds: Array<string | null> = []
    let minUidGezien = 0
    let maxUidGezien = 0

    if (fetchQuery) for await (const message of client.fetch(
      fetchQuery,
      // headers: References zit NIET in de IMAP ENVELOPE (RFC 3501), dus
      // zonder deze regel is de threading-fallback hieronder dode code.
      { envelope: true, flags: true, uid: true, bodyStructure: true, headers: ['references'] }
    )) {
      if (!message.envelope) continue

      if (message.uid) {
        if (!minUidGezien || message.uid < minUidGezien) minUidGezien = message.uid
        if (message.uid > maxUidGezien) maxUidGezien = message.uid
      }

      const from = message.envelope.from?.[0]
      const toAddresses = (message.envelope.to || []).map((t: { address?: string; name?: string }) => ({
        email: t.address || '',
        name: t.name || '',
      }))
      const ccAddresses = (message.envelope.cc || []).map((c: { address?: string; name?: string }) => ({
        email: c.address || '',
        name: c.name || '',
      }))

      const messageId = message.envelope.messageId || ''
      const inReplyTo = message.envelope.inReplyTo || null
      // Sommige clients vullen alleen References en laten In-Reply-To leeg.
      // Zonder deze fallback vielen die gesprekken uiteen in losse mails.
      // Laatste entry = de directe ouder (RFC 5322 §3.6.4).
      const referenties = parseReferences(message.headers)
      const ouderId = inReplyTo || (referenties.length > 0 ? referenties[referenties.length - 1] : null)
      const hasAttachments = hasAttachmentParts(message.bodyStructure)

      ouderIds.push(ouderId)
      newEmails.push({
        user_id,
        organisatie_id: mailOrgId,
        uid: message.uid,
        // Zonder vlag letterlijk het oude gedrag: `messageId || null`. Met vlag
        // vult messageIdVoorRij het NULL-geval met een deterministisch id, zodat
        // UNIQUE (user_id, message_id) ook die mail dedupliceert — nu levert elke
        // herhaalde ophaal daarvan een nieuwe rij op (migratie 038 regel 9-10).
        message_id: queueVlag
          ? messageIdVoorRij(messageId, message.uid, uidValidity, imapFolder)
          : (messageId || null),
        in_reply_to: inReplyTo,
        imap_folder: imapFolder,
        map: mapValue,
        from_address: from?.address || '',
        from_name: from?.name || '',
        van: from?.name ? `${from.name} <${from.address}>` : (from?.address || ''),
        aan: toAddresses.map((t: { email: string }) => t.email).join(', '),
        to_addresses: toAddresses,
        cc_addresses: ccAddresses.length > 0 ? ccAddresses : null,
        onderwerp: message.envelope.subject || '(geen onderwerp)',
        datum: message.envelope.date?.toISOString() || new Date().toISOString(),
        gelezen: message.flags?.has('\\Seen') || false,
        bijlagen: hasAttachments ? 1 : 0,
        has_attachments: hasAttachments,
        gmail_id: String(message.uid),
        cached_at: new Date().toISOString(),
      })
    }

    // ─── Flags-resync: leesstatus van recente mails ophalen ───
    // De upsert hieronder raakt bestaande rijen niet aan (ignoreDuplicates),
    // dus mails die elders (telefoon, webmail) gelezen zijn worden hier
    // bijgewerkt. Bewust één richting (ongelezen → gelezen): doen. zet zelf
    // geen \Seen op IMAP, dus andersom zou lokaal-gelezen mail terugflippen.
    const seenByUid = new Map<number, boolean>()
    try {
      const flagsCount = Math.min(Math.max(veiligeLimit, 100), 200, total)
      const flagsStart = Math.max(1, total - flagsCount + 1)
      for await (const msg of client.fetch({ seq: `${flagsStart}:${total}` }, { uid: true, flags: true })) {
        if (msg.uid) seenByUid.set(msg.uid, msg.flags?.has('\\Seen') || false)
      }
    } catch (flagErr) {
      console.warn('[fetch-emails] flags-resync overgeslagen:', flagErr instanceof Error ? flagErr.message : flagErr)
    }

    await client.logout()
    client = null

    // ─── Thread ID berekening ───
    // Zoek voor elke mail of de ouder al in de DB zit. Zo ja → gebruik
    // dezelfde thread_id. Zo niet → maak een nieuwe aan. De ouder komt uit
    // In-Reply-To, of anders uit de laatste entry van References (zie
    // ouderIds hierboven), zodat clients die alleen References zetten hun
    // gesprekken niet uiteen zien vallen.
    const ouderMessageIds = ouderIds.filter((id): id is string => !!id)

    const threadMap = new Map<string, string>() // message_id → thread_id

    if (ouderMessageIds.length > 0) {
      // Scope op user_id: service-role omzeilt RLS, dus zonder filter
      // zou de scan globaal over alle organisaties gaan.
      const { data: parentRows } = await supabaseAdmin
        .from('emails')
        .select('message_id, thread_id')
        .eq('user_id', user_id)
        .in('message_id', ouderMessageIds)
        .not('thread_id', 'is', null)

      for (const row of parentRows || []) {
        if (row.message_id && row.thread_id) {
          threadMap.set(row.message_id, row.thread_id)
        }
      }
    }

    // Wijs thread_id toe aan elke email
    for (const [i, email] of newEmails.entries()) {
      const parentReply = ouderIds[i]
      if (parentReply && threadMap.has(parentReply)) {
        // Parent gevonden in DB → zelfde thread
        email.thread_id = threadMap.get(parentReply)
      } else if (!email.thread_id) {
        // Geen parent → nieuw thread_id
        email.thread_id = crypto.randomUUID()
      }
      // Voeg eigen message_id toe aan threadMap zodat mails binnen dezelfde
      // batch ook elkaars thread_id kunnen vinden (bv. reply + origineel
      // worden tegelijk gesyncet).
      if (email.message_id && email.thread_id) {
        threadMap.set(email.message_id as string, email.thread_id as string)
      }
    }

    // ─── Upsert into Supabase ───
    // Strategy: batch upsert first, individual insert fallback on error
    let synced = 0
    const errors: string[] = []

    if (newEmails.length > 0) {
      for (let i = 0; i < newEmails.length; i += 50) {
        const batch = newEmails.slice(i, i + 50)

        // Try batch upsert with onConflict. `select()` erbij zodat we tellen
        // wat er echt is ingevoegd: met ignoreDuplicates worden bestaande
        // rijen overgeslagen en telde batch.length structureel te hoog.
        const { data: ingevoegd, error } = await supabaseAdmin
          .from('emails')
          .upsert(batch, {
            onConflict: 'user_id,message_id',
            ignoreDuplicates: true,
          })
          .select('id')

        if (!error) {
          synced += ingevoegd?.length ?? 0
          continue
        }

        // Batch upsert failed — try individual inserts
        console.error('[fetch-emails] Batch upsert failed:', error.message)
        errors.push(`batch ${i}: ${error.message}`)

        for (const email of batch) {
          // For emails with message_id: check if exists, then insert or update
          if (email.message_id) {
            const { data: existing } = await supabaseAdmin
              .from('emails')
              .select('id')
              .eq('user_id', user_id)
              .eq('message_id', email.message_id)
              .maybeSingle()

            if (existing) {
              // Update existing — only update flags (gelezen) and uid
              const { error: updateErr } = await supabaseAdmin
                .from('emails')
                .update({ gelezen: email.gelezen, uid: email.uid, cached_at: email.cached_at })
                .eq('id', existing.id)
              if (!updateErr) synced++
            } else {
              // Insert new
              const { error: insertErr } = await supabaseAdmin
                .from('emails')
                .insert(email)
              if (!insertErr) synced++
              else errors.push(`insert ${email.message_id}: ${insertErr.message}`)
            }
          } else {
            // No message_id: check by uid + folder to avoid duplicates
            const { data: existing } = await supabaseAdmin
              .from('emails')
              .select('id')
              .eq('user_id', user_id)
              .eq('uid', email.uid)
              .eq('imap_folder', email.imap_folder)
              .maybeSingle()

            if (!existing) {
              const { error: insertErr } = await supabaseAdmin
                .from('emails')
                .insert(email)
              if (!insertErr) synced++
            } else {
              synced++ // Already exists
            }
          }
        }
      }
    }

    // ─── Flags toepassen: elders-gelezen mails ook hier op gelezen ───
    if (seenByUid.size > 0) {
      try {
        const { data: bestaande } = await supabaseAdmin
          .from('emails')
          .select('id, uid, gelezen')
          .eq('user_id', user_id)
          .eq('imap_folder', imapFolder)
          .eq('gelezen', false)
          .in('uid', [...seenByUid.keys()])
        const markeerGelezen = (bestaande || [])
          .filter((row) => seenByUid.get(Number(row.uid)) === true)
          .map((row) => row.id)
        if (markeerGelezen.length > 0) {
          await supabaseAdmin.from('emails').update({ gelezen: true }).in('id', markeerGelezen)
        }
      } catch (flagErr) {
        console.warn('[fetch-emails] flags toepassen mislukt:', flagErr instanceof Error ? flagErr.message : flagErr)
      }
    }

    // ─── Sync-state bijwerken ───
    // last_seen_uid schuift op naar de hoogste opgehaalde UID; bij bootstrap
    // wordt ook de backfill-ondergrens gezet zodat fase-1b weet waar oudere
    // mail begint. Mislukt dit (migratie 131 niet gedraaid), dan blijft
    // alles werken in bootstrap-modus.
    //
    // De waterlijn schuift ALLEEN op als de upsert-fase foutloos was —
    // anders zou mail die niet is opgeslagen bij de volgende run buiten het
    // incrementele venster vallen en stilletjes verdwijnen.
    if (errors.length === 0 && (maxUidGezien > 0 || !stateBruikbaar)) {
      const nieuweLastSeen = Math.max(stateBruikbaar ? Number(syncState!.last_seen_uid) : 0, maxUidGezien)
      const stateRow: Record<string, unknown> = {
        user_id,
        folder: mapValue,
        imap_folder: imapFolder,
        uidvalidity: uidValidity,
        last_seen_uid: nieuweLastSeen,
        updated_at: new Date().toISOString(),
      }
      if (!stateBruikbaar) {
        stateRow.backfill_low_uid = minUidGezien > 0 ? minUidGezien : null
        stateRow.backfill_done = false
      }
      const { error: stateErr } = await supabaseAdmin
        .from('email_sync_state')
        .upsert(stateRow, { onConflict: 'user_id,folder' })
      if (stateErr) {
        console.warn('[fetch-emails] sync-state opslaan mislukt (migratie 131 gedraaid?):', stateErr.message)
      }
    } else if (errors.length === 0 && stateBruikbaar) {
      // Foutloze ronde zonder nieuwe mail. De waterlijn mag hier NIET opschuiven
      // (dat is de voorwaarde hierboven), maar "we hebben gekeken" moet wel
      // vastgelegd worden, en dat stond op dezelfde kolom.
      //
      // Zonder dit verhongert de cron precies de actieve mailboxen:
      // cron-email-sync.ts:139 sorteert op updated_at, oudste eerst, en pakt er
      // acht. Schrijft een stille mailbox die kolom nooit, dan blijft hij
      // permanent vooraan staan en komen de mailboxen waar wél mail binnenkomt
      // achteraan. De sortering betekende dus "langst geen mail ontvangen
      // eerst" in plaats van "langst niet gesynct eerst", wat de comment daar
      // belooft.
      //
      // Een partiële update, dus PostgREST schrijft uitsluitend updated_at. Niet
      // een upsert met last_seen_uid erbij: die waarde komt uit een read van
      // eerder in deze functie, en terugschrijven zou precies de reset-race
      // introduceren die dit blok moet vermijden.
      const { error: tikErr } = await supabaseAdmin
        .from('email_sync_state')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('folder', mapValue)
      if (tikErr) {
        console.warn('[fetch-emails] sync-tijdstip bijwerken mislukt:', tikErr.message)
      }
    }

    // ─── Sales Inbox auto-match v2 ───
    // Retroactieve sweep: alle inkomende mails uit laatste 72u tegen alle
    // wachtende outbounds van laatste 60d, in 2 parallel SELECTs + N UPDATEs.
    // Vervangt v1's per-newcomer storedRow-lookup (2N queries) — de net-
    // toegevoegde rijen uit deze fetch zitten al in de DB en vallen binnen
    // het 72u-venster van de sweep. 72u dekt weekend-patroon (gebruiker
    // niet actief za/zo, refresht maandag, weekend-replies blijven matchen).
    //
    // Soft deadline (10s) voorkomt dat een grote inbox de hele endpoint
    // laat timeouten — was de oorzaak van 504s in productie. RLS-readiness:
    // service_role omzeilt RLS, dus user_id-filter expliciet op alle queries
    // en updates.
    //
    // Idempotent: outbound.beantwoord=false-filter sluit reeds-gematchte
    // uit (incl. handmatig gemarkeerde via UI); UPDATE WHERE bevat
    // race-guard op beantwoord=false; in-memory alreadyMatched Set
    // voorkomt dubbele match in dezelfde sweep; niet_match_email_ids
    // sluit user-gecorrigeerde uit.
    //
    // Out of scope v2: thread-match via in_reply_to/references — natuurlijke
    // upgrade die false-positives reduceert, eigen feature later.
    //
    // Bij `snel` slaan we beide sweeps over: de cron draait ze even later
    // alsnog voor dezelfde mailbox, en de sweeps zijn retroactief (72u-venster)
    // dus overslaan verliest niets — het stelt alleen uit.
    const matchStartedAt = Date.now()
    const MATCH_DEADLINE_MS = 10_000
    const INBOX_WINDOW_HOURS = 72
    const OUTBOUND_WINDOW_DAYS = 60

    if (!snel) try {
      const inkomendeWindow = new Date(Date.now() - INBOX_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
      const outboundWindow = new Date(Date.now() - OUTBOUND_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

      const [inkomendeQ, kandidatenQ] = await Promise.all([
        supabaseAdmin
          .from('emails')
          .select('id, from_address, datum')
          .eq('user_id', user_id)
          .eq('map', 'inbox')
          .gte('datum', inkomendeWindow)
          .not('from_address', 'is', null)
          .order('datum', { ascending: false })
          .limit(500),
        supabaseAdmin
          .from('emails')
          .select('id, aan, datum, niet_match_email_ids')
          .eq('user_id', user_id)
          .eq('wacht_op_reactie', true)
          .eq('beantwoord', false)
          .gte('datum', outboundWindow)
          .order('datum', { ascending: false })
          .limit(200),
      ])

      const inkomendeRecent = inkomendeQ.data || []
      const kandidatenAll = kandidatenQ.data || []
      const alreadyMatched = new Set<string>()

      if (kandidatenAll.length > 0 && inkomendeRecent.length > 0) {
        for (let i = 0; i < inkomendeRecent.length; i++) {
          if (Date.now() - matchStartedAt > MATCH_DEADLINE_MS) {
            console.warn('[fetch-emails] auto-match: soft deadline reached', {
              processed: i,
              total: inkomendeRecent.length,
            })
            break
          }
          const inkomend = inkomendeRecent[i]
          const fromLower = (inkomend.from_address as string).toLowerCase()
          const inkomendDatum = inkomend.datum as string

          const matches = kandidatenAll.filter((k) =>
            !alreadyMatched.has(k.id as string) &&
            (k.aan as string).toLowerCase().includes(fromLower) &&
            (k.datum as string) < inkomendDatum &&
            !((k.niet_match_email_ids as string[] | null) || []).includes(inkomend.id as string)
          )
          if (matches.length === 0) continue

          // kandidatenAll is al gesorteerd op datum DESC → matches[0] = nieuwste
          const match = matches[0]

          const { error: updateErr } = await supabaseAdmin
            .from('emails')
            .update({ beantwoord: true, beantwoord_door_email_id: inkomend.id })
            .eq('id', match.id)
            .eq('user_id', user_id)
            .eq('beantwoord', false)
          if (updateErr) {
            console.error('[fetch-emails] auto-match update mislukt:', updateErr)
          } else {
            alreadyMatched.add(match.id as string)
          }
        }
      }
    } catch (matchErr) {
      // Niet fataal — fetch-resultaat blijft gewoon staan
      console.error('[fetch-emails] auto-match-loop mislukt:', matchErr)
    }

    // ─── Leads: reactie van een benaderde lead zet de status op 'gereageerd' ───
    // Zelfde 72u-inbound-venster als de sales-match hierboven. Alleen mail
    // nieuwer dan status_sinds telt: een al verwerkte reply mag een handmatig
    // teruggezette status (bv. follow-up_later) niet opnieuw omzetten.
    // 'gereageerd' en 'geen_interesse' blijven altijd staan.
    const leadStartedAt = Date.now()
    const LEAD_DEADLINE_MS = 8_000
    if (!snel) try {
      const { data: openLeads } = await supabaseAdmin
        .from('leads')
        .select('id, email, status_sinds')
        .limit(500)
        .eq('user_id', user_id)
        .in('status', ['nieuw', 'benaderd', 'follow-up_later'])
        .neq('email', '')

      if (openLeads && openLeads.length > 0) {
        const leadWindow = new Date(Date.now() - INBOX_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
        const { data: inkomendVanLeads } = await supabaseAdmin
          .from('emails')
          .select('from_address, datum')
          .eq('user_id', user_id)
          .eq('map', 'inbox')
          .gte('datum', leadWindow)
          .not('from_address', 'is', null)
          .limit(500)

        const nieuwsteVanAfzender = new Map<string, string>()
        for (const mail of inkomendVanLeads || []) {
          const adres = (mail.from_address as string).toLowerCase()
          const datum = mail.datum as string
          const huidig = nieuwsteVanAfzender.get(adres)
          if (!huidig || datum > huidig) nieuwsteVanAfzender.set(adres, datum)
        }

        // Eén update voor alle gereageerde leads samen. Was N sequentiële
        // round-trips zonder deadline; de sales-match hierboven had die wel.
        const gereageerdeIds = openLeads
          .filter((lead) => {
            const replyDatum = nieuwsteVanAfzender.get((lead.email as string).toLowerCase())
            return !!replyDatum && replyDatum > (lead.status_sinds as string)
          })
          .map((lead) => lead.id)

        // Eigen deadline: de klok van de sales-sweep hierboven start eerder en
        // is per definitie op als die zijn eigen limiet raakt. Daarop gaten
        // zou juist deze update — nu één query — structureel overslaan.
        if (gereageerdeIds.length > 0 && Date.now() - leadStartedAt <= LEAD_DEADLINE_MS) {
          // In blokken: honderden UUID's in één .in() maken de querystring
          // te lang voor de gateway, en dan faalt de hele batch in plaats van
          // één lead.
          for (let i = 0; i < gereageerdeIds.length; i += 100) {
            const { error: leadErr } = await supabaseAdmin
              .from('leads')
              .update({ status: 'gereageerd', status_sinds: new Date().toISOString() })
              .in('id', gereageerdeIds.slice(i, i + 100))
              .eq('user_id', user_id)
            if (leadErr) console.error('[fetch-emails] leadstatus-update mislukt:', leadErr)
          }
        } else if (gereageerdeIds.length > 0) {
          console.warn('[fetch-emails] lead-match: soft deadline bereikt, overgeslagen', {
            leads: gereageerdeIds.length,
          })
        }
      }
    } catch (leadMatchErr) {
      console.error('[fetch-emails] lead-reply-match mislukt:', leadMatchErr)
    }

    return res.status(200).json({
      synced,
      total,
      fetched: newEmails.length,
      incremental,
      snel: snel || undefined,
      remaining: remaining > 0 ? remaining : undefined,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Emails sync mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ synced: 0, total: 0, error: msg })
    }
    console.error('[fetch-emails] Fatal error:', error)
    // Ook een mislukte poging is een poging. Zonder deze tik bezet een account
    // met een verlopen app-password of een onbereikbare server voor altijd een
    // van de acht plekken per cron-ronde.
    if (userIdVoorTik && mapValueVoorTik) await tikSyncTijdstip(userIdVoorTik, mapValueVoorTik)
    return res.status(500).json({ synced: 0, total: 0, error: msg })
  } finally {
    // Ensure IMAP connection is always closed
    if (client) {
      try { await client.logout() } catch { /* ignore */ }
    }
  }
}

// References is per RFC 5322 een spatie-gescheiden lijst van message-ids,
// oudste eerst; de laatste is de directe ouder. Komt binnen als ruwe
// headerbuffer omdat het veld niet in de IMAP ENVELOPE zit. De header mag
// over meerdere regels gevouwen zijn (leading whitespace = vervolgregel).
function parseReferences(headers: unknown): string[] {
  if (!headers) return []
  const tekst = Buffer.isBuffer(headers) ? headers.toString('utf8') : String(headers)
  const match = tekst.match(/^references:\s*([\s\S]*?)(?:\r?\n(?![ \t])|$)/im)
  if (!match) return []
  return (match[1].match(/<[^<>\s]+>/g) || [])
}

function hasAttachmentParts(structure: unknown): boolean {
  if (!structure || typeof structure !== 'object') return false
  const s = structure as Record<string, unknown>
  if (s.disposition === 'attachment') return true
  if (Array.isArray(s.childNodes)) {
    for (const child of s.childNodes) {
      if (hasAttachmentParts(child)) return true
    }
  }
  return false
}
