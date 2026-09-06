/**
 * IMAP IDLE: mail komt binnen in seconden in plaats van in minuten.
 *
 * WAT DIT IS. De mailsync-werker (api/cron-mailsync-werker.ts) haalt elke drie
 * minuten mail op. Dat is prima voor een archief en te traag voor een gesprek:
 * wie een offerte stuurt en op antwoord wacht, ziet dat antwoord tot drie
 * minuten later. IMAP kent daar een oplossing voor: IDLE. De server houdt de
 * verbinding open en zegt zelf wanneer er iets binnenkomt. Deze taak houdt die
 * verbinding open en roept bij elk signaal /api/fetch-emails aan met `snel`.
 *
 * DE SYNC ZELF VERANDERT NIET. Deze taak schrijft geen mail weg. Hij trekt
 * alleen aan de bel; het watermerk (email_sync_state.last_seen_uid), de
 * upsert en de foutafhandeling blijven precies waar ze zaten. Valt IDLE weg,
 * dan blijft de cron van drie minuten gewoon staan: dit is een versneller,
 * geen vervanging.
 *
 * DIT IS EEN PILOT, GEEN PLATFORM. Eén open IMAP-verbinding per postvak,
 * 24 uur per dag, betekent op Trigger.dev dat er 24 uur per dag een machine
 * draait per postvak. Voor de eigen vijf Gmail-postvakken is dat te overzien
 * (reken op enkele tientjes per maand op de kleinste machine). Boven ongeveer
 * tien postvakken hoort dit niet meer op Trigger.dev maar in één eigen proces
 * dat alle verbindingen in één Node-instantie multiplext (één socket per
 * postvak, één event-loop) — dan kost postvak nummer honderd geen honderdste
 * machine. `MAIL_IDLE_MAX` is de rem tot het zover is; op 0 staat IDLE uit.
 *
 * OPZET. `mail-idle-start` (cron, elke 10 minuten) kijkt welke postvakken een
 * IDLE-taak zouden moeten hebben en start de ontbrekende. `mail-idle` is de
 * taak per postvak: verbinden, INBOX openen, 25 minuten luisteren, netjes
 * afsluiten en zichzelf opnieuw inplannen. Vijfentwintig minuten omdat IDLE
 * volgens RFC 2177 binnen 29 minuten vernieuwd moet worden; imapflow doet dat
 * op protocolniveau al elke `maxIdleTime`, deze grens is de tweede lijn.
 *
 * ENV (Trigger.dev-dashboard): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * EMAIL_ENCRYPTION_KEY (voor postvakken met een app-wachtwoord), CRON_SECRET
 * (om /api/fetch-emails en /api/mail-oauth-token aan te mogen roepen),
 * CRON_SELF_URL (basis-URL van de app), MAIL_IDLE_MAX (standaard 10).
 */
import { logger, schedules, task, tasks, runs } from '@trigger.dev/sdk/v3'
import type { Task } from '@trigger.dev/sdk/v3'
import { ImapFlow } from 'imapflow'
import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './utils/supabase'

const TAAK_ID = 'mail-idle'
const IDLE_DUUR_MS = 25 * 60 * 1000
// imapflow verlengt IDLE zelf; vijf minuten is ruim binnen wat Gmail en
// Office 365 in de praktijk toestaan (beide sluiten rond de tien minuten).
const IDLE_VERNIEUW_MS = 5 * 60 * 1000
// Een reeks losse events (drie mails tegelijk) is één sync waard, geen drie.
const SAMENVOEG_MS = 2_000
const MINIMAAL_TUSSEN_SYNCS_MS = 10_000
const START_INTERVAL_MIN = 10
// Drie keer achter elkaar niet kunnen verbinden: een uur met rust laten. Een
// mailserver die weigert wordt niet beter van vaker aankloppen, en Gmail
// blokkeert accounts die dat wel doen.
const FOUT_DREMPEL = 3
const STRAF_MS = 60 * 60 * 1000
// Een ronde die geen minuut haalt is geen ronde maar een mislukte verbinding.
// Zonder deze grens gaf "connect lukt, verbinding valt meteen daarna weg" een
// lus van machinestarts: succes stond al weggeschreven, close vuurde zonder
// fout en de volgende ronde werd meteen ingepland.
const KORTE_RONDE_MS = 60_000

/**
 * Alles wat niet terminaal is telt als "er loopt al iets". PENDING_VERSION
 * hoort er nadrukkelijk bij: een run die op een nog niet uitgerolde versie
 * wacht was anders onzichtbaar en de starttaak zette er tijdens en vlak na een
 * deploy een tweede naast. Terminaal zijn COMPLETED, CANCELED, FAILED,
 * CRASHED, SYSTEM_FAILURE, EXPIRED en TIMED_OUT.
 */
const LOPENDE_STATUSSEN = ['PENDING_VERSION', 'QUEUED', 'DEQUEUED', 'EXECUTING', 'WAITING', 'DELAYED'] as const

interface IdleLading {
  userId: string
  ronde?: number
}

interface IdleUitkomst {
  reden?: string
  events?: number
  syncs?: number
  duurMs?: number
  opnieuw?: boolean
}

interface Postvak {
  id: string | null
  user_id: string
  gmail_address: string
  imap_host: string
  imap_port: number
  auth_type: string
  encrypted_app_password: string | null
}

function basisUrl(): string {
  if (process.env.CRON_SELF_URL) return process.env.CRON_SELF_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://app.doen.team'
}

function maxPostvakken(): number {
  const rauw = process.env.MAIL_IDLE_MAX
  if (rauw === undefined || rauw === '') return 10
  const getal = Number(rauw)
  // Onzin of een negatief getal betekent uit, niet "dan maar tien". Wie hier
  // iets raars neerzet wil geen tien machines aanzetten.
  if (!Number.isFinite(getal) || getal < 0) return 0
  return Math.floor(getal)
}

/**
 * Zelfde drie vormen als api/email-settings.ts: g1 (AES-256-GCM), het oude
 * CBC-formaat en de nog oudere b64-vorm. Bewust gekopieerd en niet gedeeld:
 * deze taak draait op Trigger.dev en api/* is standalone, er is geen laag waar
 * beide bij kunnen.
 */
function ontsleutel(waarde: string): string {
  if (waarde.startsWith('b64:')) return Buffer.from(waarde.slice(4), 'base64').toString('utf8')
  const sleutel = process.env.EMAIL_ENCRYPTION_KEY
  if (!sleutel) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  if (waarde.startsWith('g1:')) {
    const raw = Buffer.from(waarde.slice(3), 'base64')
    const salt = raw.subarray(0, 16)
    const iv = raw.subarray(16, 28)
    const tag = raw.subarray(28, 44)
    const ct = raw.subarray(44)
    const key = crypto.scryptSync(sleutel, salt, 32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  }
  const key = crypto.scryptSync(sleutel, 'salt', 32)
  const [ivHex, rest] = waarde.split(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'))
  return decipher.update(rest, 'hex', 'utf8') + decipher.final('utf8')
}

/**
 * Kolommen uit een migratie die nog niet gedraaid hoeft te zijn mogen
 * ontbreken. Bij een onbekende kolom valt de select een stap terug: eerst
 * zonder is_verified, dan zonder `id` (migratie 245) en tenslotte ook zonder
 * `auth_type` (migratie 244). Zonder die laatste stap vond de IDLE-worker op
 * een database van vóór 244 stil nul postvakken.
 */
async function haalPostvakken(supabase: SupabaseClient, userId?: string): Promise<Postvak[]> {
  const basis = 'user_id, gmail_address, imap_host, imap_port, auth_type, encrypted_app_password'
  const zonderAuthType = 'user_id, gmail_address, imap_host, imap_port, encrypted_app_password'
  for (const kolommen of [`id, ${basis}, is_verified`, `id, ${basis}`, zonderAuthType]) {
    let vraag = supabase.from('user_email_settings').select(kolommen)
    if (userId) vraag = vraag.eq('user_id', userId)
    const { data, error } = await vraag
    if (error) {
      // 42703 = kolom bestaat niet (is_verified, of id op een oude kolomlijst).
      if (error.code === '42703' || /column .* does not exist/i.test(error.message)) continue
      throw new Error(error.message)
    }
    const rijen = (data || []) as unknown as Array<Record<string, unknown>>
    return rijen
      .filter((r) => !!r.gmail_address)
      // is_verified ontbreekt in de database van vandaag (migratie 004 is nooit
      // gedraaid). Ontbreekt hij, dan telt elk postvak als geverifieerd; staat
      // hij er wel, dan is false een reden om niet te verbinden.
      .filter((r) => r.is_verified === undefined || r.is_verified === null || r.is_verified === true)
      .map((r) => ({
        id: (r.id as string) ?? null,
        user_id: r.user_id as string,
        gmail_address: r.gmail_address as string,
        imap_host: (r.imap_host as string) || 'imap.gmail.com',
        imap_port: Number(r.imap_port) || 993,
        auth_type: (r.auth_type as string) || 'wachtwoord',
        encrypted_app_password: (r.encrypted_app_password as string) ?? null,
      }))
  }
  return []
}

/**
 * Het access-token komt van /api/mail-oauth-token en niet uit een eigen
 * refresh-aanroep: dan staan de OAuth-clientgeheimen op één plek (Vercel) en
 * hoeft Trigger.dev ze niet te kennen.
 */
async function haalToegangstokenViaApi(userId: string, cronSecret: string): Promise<string> {
  const respons = await fetch(`${basisUrl()}/api/mail-oauth-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
    body: JSON.stringify({ service_user_id: userId }),
    signal: AbortSignal.timeout(15_000),
  })
  const antwoord = (await respons.json().catch(() => ({}))) as { access_token?: string; error?: string }
  if (!respons.ok || !antwoord.access_token) {
    throw new Error(antwoord.error || `mail-oauth-token gaf ${respons.status}`)
  }
  return antwoord.access_token
}

/** idle_laatst_op komt uit migratie 245 en mag ontbreken. */
async function tikIdleTijdstip(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('email_sync_state')
    .update({ idle_laatst_op: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('folder', 'inbox')
  if (error && error.code !== '42703') {
    logger.warn('idle_laatst_op schrijven mislukt', { userId, fout: error.message })
  }
}

/**
 * De teller van opeenvolgende verbindingsfouten leeft op een eigen
 * email_sync_state-rij met folder 'idle'. Die rij is onzichtbaar voor de
 * gezondheidskaart in de app (die leest folder 'inbox') en er is geen tabel
 * voor bijgekomen. De teller staat vooraan in laatste_fout ("3x ...") zodat
 * hij in de database leesbaar blijft zonder extra kolom.
 */
function leesFoutTeller(laatsteFout: string | null | undefined): number {
  const m = /^(\d+)x /.exec(laatsteFout || '')
  return m ? Number(m[1]) : 0
}

/**
 * Migratie 245 zet (account_id, folder) naast (user_id, folder); migratie 246
 * laat de oude sleutel vallen. Zolang beide werelden kunnen bestaan proberen
 * we de nieuwe sleutel eerst en vallen we terug op de oude. PostgREST geeft
 * 42703 als de kolom er nog niet is en 42P10 als er geen unieke index bij de
 * opgegeven kolommen te vinden is.
 */
function isOnbekendeSleutel(error: { code?: string; message: string }): boolean {
  return error.code === '42703' || error.code === '42P10'
    || /column .* does not exist|no unique or exclusion constraint/i.test(error.message)
}

async function upsertIdleStaat(supabase: SupabaseClient, postvak: Postvak, velden: Record<string, unknown>): Promise<string | null> {
  const pogingen: Array<{ onConflict: string; metAccount: boolean }> = postvak.id
    ? [
        { onConflict: 'account_id,folder', metAccount: true },
        { onConflict: 'user_id,folder', metAccount: true },
        { onConflict: 'user_id,folder', metAccount: false },
      ]
    : [{ onConflict: 'user_id,folder', metAccount: false }]

  let laatste = 'onbekend'
  for (const poging of pogingen) {
    const rij: Record<string, unknown> = { user_id: postvak.user_id, folder: 'idle', ...velden }
    if (poging.metAccount) rij.account_id = postvak.id
    const { error } = await supabase.from('email_sync_state').upsert(rij, { onConflict: poging.onConflict })
    if (!error) return null
    laatste = error.message
    if (!isOnbekendeSleutel(error)) return error.message
  }
  return laatste
}

async function schrijfIdleFout(supabase: SupabaseClient, postvak: Postvak, melding: string, vorigeTeller: number): Promise<void> {
  const nu = new Date().toISOString()
  const teller = vorigeTeller + 1
  const fout = await upsertIdleStaat(supabase, postvak, {
    status: 'fout',
    laatste_fout: `${teller}x ${melding.slice(0, 160)}`,
    laatste_fout_op: nu,
    updated_at: nu,
  })
  if (fout) logger.warn('IDLE-fout niet vastgelegd', { userId: postvak.user_id, fout })
}

async function schrijfIdleSucces(supabase: SupabaseClient, postvak: Postvak): Promise<void> {
  const nu = new Date().toISOString()
  const fout = await upsertIdleStaat(supabase, postvak, {
    status: 'ok',
    laatste_fout: null,
    laatste_fout_op: null,
    laatste_succes_op: nu,
    updated_at: nu,
  })
  if (fout) logger.warn('IDLE-succes niet vastgelegd', { userId: postvak.user_id, fout })
}

type MailIdleTaak = Task<typeof TAAK_ID, IdleLading, IdleUitkomst>

/**
 * Eén postvak, één open IMAP-verbinding, 25 minuten lang.
 *
 * retries staan uit: mislukt de verbinding, dan is opnieuw proberen binnen
 * seconden precies het verkeerde (zie FOUT_DREMPEL). De starttaak pakt hem
 * over tien minuten weer op, of laat hem een uur met rust.
 *
 * De queue met concurrencyLimit 1 plus een concurrencyKey per postvak is de
 * echte sluitboom. Kijken of er al een run loopt en dan pas triggeren is
 * check-dan-doe zonder claim: tussen die twee stappen past een tweede starter.
 * Met een eigen wachtrij per postvak wacht een tweede run in QUEUED tot de
 * eerste klaar is, dus staan er nooit twee IMAP-verbindingen naast elkaar.
 */
export const mailIdleWerker: MailIdleTaak = task({
  id: TAAK_ID,
  maxDuration: Math.floor(IDLE_DUUR_MS / 1000) + 120,
  machine: 'micro',
  queue: { concurrencyLimit: 1 },
  retry: { maxAttempts: 1 },
  run: async (lading: IdleLading): Promise<IdleUitkomst> => {
    const supabase = getSupabaseAdmin()
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) return { reden: 'geen-cron-secret' }

    const postvakken = await haalPostvakken(supabase, lading.userId)
    const postvak = postvakken[0]
    if (!postvak) return { reden: 'geen-postvak' }

    const { data: idleRij } = await supabase
      .from('email_sync_state')
      .select('laatste_fout')
      .eq('user_id', lading.userId)
      .eq('folder', 'idle')
      .maybeSingle()
    const vorigeTeller = leesFoutTeller(idleRij?.laatste_fout as string | undefined)

    let auth: { user: string; pass?: string; accessToken?: string }
    try {
      if (postvak.auth_type === 'google' || postvak.auth_type === 'microsoft') {
        auth = { user: postvak.gmail_address, accessToken: await haalToegangstokenViaApi(lading.userId, cronSecret) }
      } else {
        if (!postvak.encrypted_app_password) return { reden: 'geen-wachtwoord' }
        auth = { user: postvak.gmail_address, pass: ontsleutel(postvak.encrypted_app_password) }
      }
    } catch (err) {
      const melding = err instanceof Error ? err.message : String(err)
      await schrijfIdleFout(supabase, postvak, melding, vorigeTeller)
      logger.error('IDLE: inloggegevens niet bruikbaar', { userId: lading.userId, melding })
      return { reden: 'geen-toegang' }
    }

    const client = new ImapFlow({
      host: postvak.imap_host,
      port: postvak.imap_port,
      secure: postvak.imap_port === 993,
      auth,
      logger: false,
      emitLogs: false,
      greetingTimeout: 8_000,
      socketTimeout: IDLE_VERNIEUW_MS + 60_000,
      // imapflow gaat vanzelf in IDLE zodra er niets te doen is (auto-idle
      // staat aan tenzij disableAutoIdle) en breekt hem elke maxIdleTime af om
      // hem opnieuw te starten. Een eigen client.idle() zou daarnaast gaan
      // lopen; niet doen.
      maxIdleTime: IDLE_VERNIEUW_MS,
    })

    const begonnenOp = Date.now()
    let events = 0
    let syncs = 0
    let laatsteSync = 0
    let bezig = false
    let samenvoeger: NodeJS.Timeout | null = null

    const vraagSync = async (aanleiding: string) => {
      // Vlag vóór het wachten omhoog: anders glipt een tweede event binnen de
      // wachttijd langs de poort en staan er twee syncs naast elkaar.
      if (bezig) return
      bezig = true
      const wachten = Math.max(0, MINIMAAL_TUSSEN_SYNCS_MS - (Date.now() - laatsteSync))
      if (wachten > 0) await new Promise((r) => setTimeout(r, wachten))
      try {
        laatsteSync = Date.now()
        const respons = await fetch(`${basisUrl()}/api/fetch-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
          // snel: de sales- en lead-sweeps horen bij de cron van drie minuten,
          // niet bij een signaal waar iemand op zit te wachten.
          body: JSON.stringify({ folder: 'INBOX', limit: 50, snel: true, service_user_id: lading.userId }),
          signal: AbortSignal.timeout(45_000),
        })
        if (!respons.ok) {
          const tekst = await respons.text().catch(() => '')
          logger.warn('IDLE-sync mislukt', { userId: lading.userId, status: respons.status, tekst: tekst.slice(0, 200) })
        } else {
          syncs += 1
          const antwoord = (await respons.json().catch(() => ({}))) as { synced?: number }
          logger.info('IDLE-sync klaar', { userId: lading.userId, aanleiding, nieuw: Number(antwoord?.synced) || 0 })
        }
      } catch (err) {
        logger.warn('IDLE-sync gooide', { userId: lading.userId, err: err instanceof Error ? err.message : String(err) })
      } finally {
        bezig = false
        await tikIdleTijdstip(supabase, lading.userId)
      }
    }

    let verbindingsFout: string | null = null
    // logout in finally: elke uitgang, ook een onverwachte fout in de
    // luisterlus, hoort de socket te sluiten. Gmail telt open verbindingen mee
    // voor zijn limiet en blokkeert accounts die er te veel laten staan.
    try {
      try {
        await client.connect()
        await client.mailboxOpen('INBOX')
      } catch (err) {
        verbindingsFout = err instanceof Error ? err.message : String(err)
        await schrijfIdleFout(supabase, postvak, verbindingsFout, vorigeTeller)
        logger.error('IDLE: verbinden mislukt', { userId: lading.userId, melding: verbindingsFout })
        return { reden: 'verbinden-mislukt' }
      }

      await schrijfIdleSucces(supabase, postvak)
      logger.info('IDLE open', { userId: lading.userId, ronde: lading.ronde ?? 1, host: postvak.imap_host })

      await new Promise<void>((klaar) => {
        let gestopt = false
        const stop = () => {
          if (gestopt) return
          gestopt = true
          if (samenvoeger) clearTimeout(samenvoeger)
          clearTimeout(eindTimer)
          klaar()
        }
        const eindTimer = setTimeout(stop, IDLE_DUUR_MS)
        const opEvent = (aanleiding: string) => {
          events += 1
          if (samenvoeger) clearTimeout(samenvoeger)
          samenvoeger = setTimeout(() => { void vraagSync(aanleiding) }, SAMENVOEG_MS)
        }
        client.on('exists', () => opEvent('exists'))
        client.on('flags', () => opEvent('flags'))
        client.on('error', (err: Error) => {
          verbindingsFout = err?.message || 'IMAP-fout'
          stop()
        })
        client.on('close', () => stop())
      })
    } finally {
      try { await client.logout() } catch { /* al dicht */ }
    }

    const duurMs = Date.now() - begonnenOp
    // Een korte ronde telt als verbindingsfout, ook als `close` zonder fout
    // vuurde. Anders liep de foutteller nooit op en grepen FOUT_DREMPEL en
    // STRAF_MS nooit in.
    const teKort = duurMs < KORTE_RONDE_MS
    if (verbindingsFout || teKort) {
      const melding = verbindingsFout || `verbinding viel na ${Math.round(duurMs / 1000)} s weg`
      await schrijfIdleFout(supabase, postvak, melding, vorigeTeller)
      if (teKort) logger.warn('IDLE-ronde te kort, niet opnieuw ingepland', { userId: lading.userId, duurMs, melding })
    }

    // Zichzelf opnieuw inplannen. Het kind wordt getriggerd vóór deze run
    // afloopt, zodat de starttaak hem meteen als lopend ziet en er nooit twee
    // verbindingen naast elkaar staan. Na een te korte ronde niet: die wacht
    // op de starttaak, die de straftijd kent.
    let opnieuw = false
    if (maxPostvakken() > 0 && !teKort) {
      try {
        await tasks.trigger<MailIdleTaak>(TAAK_ID, { userId: lading.userId, ronde: (lading.ronde ?? 1) + 1 }, {
          tags: ['mail-idle', `mailbox:${lading.userId}`],
          concurrencyKey: lading.userId,
        })
        opnieuw = true
      } catch (err) {
        logger.warn('IDLE niet opnieuw ingepland', { userId: lading.userId, err: err instanceof Error ? err.message : String(err) })
      }
    }

    return { events, syncs, duurMs, opnieuw, reden: teKort ? 'te-kort' : undefined }
  },
})

/**
 * Startpost. Kijkt welke postvakken een IDLE-taak horen te hebben en start de
 * ontbrekende. Bewust elke tien minuten en niet elke minuut: de werker plant
 * zichzelf op en dit is het vangnet voor een run die is omgevallen.
 */
export const mailIdleStart = schedules.task({
  id: 'mail-idle-start',
  cron: { pattern: `*/${START_INTERVAL_MIN} * * * *` },
  maxDuration: 120,
  machine: 'micro',
  run: async () => {
    const max = maxPostvakken()
    if (max === 0) return { uit: true, gestart: 0 }
    if (!process.env.CRON_SECRET) return { reden: 'geen-cron-secret', gestart: 0 }

    const supabase = getSupabaseAdmin()
    const postvakken = await haalPostvakken(supabase)
    if (postvakken.length === 0) return { kandidaten: 0, gestart: 0 }

    const { data: staat } = await supabase
      .from('email_sync_state')
      .select('user_id, folder, status, laatste_fout, laatste_fout_op, laatste_succes_op')
      .in('folder', ['inbox', 'idle'])

    const rijen = (staat || []) as Array<Record<string, unknown>>
    const inbox = new Map(rijen.filter((r) => r.folder === 'inbox').map((r) => [r.user_id as string, r]))
    const idle = new Map(rijen.filter((r) => r.folder === 'idle').map((r) => [r.user_id as string, r]))
    const nu = Date.now()

    const kandidaten = postvakken
      .filter((p) => {
        const status = inbox.get(p.user_id)?.status as string | undefined
        // Een mailbox met een geweigerd wachtwoord of een uitgezette sync komt
        // hier niet aan de deur kloppen; die wacht op een nieuwe koppeling.
        if (status === 'fout' || status === 'uitgezet') return false
        const idleRij = idle.get(p.user_id)
        const teller = leesFoutTeller(idleRij?.laatste_fout as string | undefined)
        if (teller >= FOUT_DREMPEL) {
          const sinds = idleRij?.laatste_fout_op ? Date.parse(idleRij.laatste_fout_op as string) : 0
          if (nu - sinds < STRAF_MS) return false
        }
        return true
      })
      .sort((a, b) => {
        const ta = Date.parse((inbox.get(a.user_id)?.laatste_succes_op as string) || '') || 0
        const tb = Date.parse((inbox.get(b.user_id)?.laatste_succes_op as string) || '') || 0
        return tb - ta
      })
      .slice(0, max)

    let gestart = 0
    let lopend = 0
    for (const postvak of kandidaten) {
      let alLopend: boolean
      try {
        const bestaande = await runs.list({
          taskIdentifier: TAAK_ID,
          tag: `mailbox:${postvak.user_id}`,
          status: [...LOPENDE_STATUSSEN],
          limit: 1,
        })
        alLopend = bestaande.data.length > 0
      } catch (err) {
        // Faalt dicht. Twee IDLE-verbindingen naast elkaar op hetzelfde
        // postvak is erger dan tien minuten geen IDLE: Gmail telt verbindingen
        // en blokkeert accounts die er te veel openen.
        logger.warn('IDLE: lopende runs niet op te vragen, niet gestart', {
          userId: postvak.user_id,
          err: err instanceof Error ? err.message : String(err),
        })
        continue
      }
      if (alLopend) { lopend += 1; continue }
      await tasks.trigger<MailIdleTaak>(TAAK_ID, { userId: postvak.user_id, ronde: 1 }, {
        tags: ['mail-idle', `mailbox:${postvak.user_id}`],
        concurrencyKey: postvak.user_id,
      })
      gestart += 1
    }

    logger.info('IDLE-startronde', { kandidaten: kandidaten.length, gestart, lopend, max })
    return { kandidaten: kandidaten.length, gestart, lopend, max }
  },
})
