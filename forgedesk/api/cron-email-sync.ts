/**
 * Haalt nieuwe mail op zonder dat er iemand in de app zit.
 *
 * Zonder deze cron landde mail pas in de database op het moment dat een
 * client erom vroeg. Wie de app op zijn telefoon opende, wachtte dus op een
 * volledige IMAP-ronde voordat er iets te zien was. Nu staat de mail er al en
 * is openen een database-read.
 *
 * Roept /api/fetch-emails per postvak aan in plaats van de IMAP-logica te
 * kopiëren: api/*-bestanden mogen niets delen (zie CLAUDE.md), en een tweede
 * exemplaar van 500 regels sync-code loopt gegarandeerd uit de pas.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET}. Datzelfde secret
 * gebruikt fetch-emails om de service-modus te herkennen.
 *
 * Handmatig testen (na deploy):
 * curl -H "Authorization: Bearer $CRON_SECRET" \
 *   https://app.doen.team/api/cron-email-sync
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
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

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Slapende accounts (afgelopen trial, opgezegd) hoeven geen IMAP-verbindingen
// te kosten. Wie inlogt is de eerstvolgende ronde weer mee.
const ACTIEF_BINNEN_DAGEN = 7
// Per ronde, zodat één ronde binnen maxDuration past. De rest komt de
// volgende ronde: de sortering zet het langst-niet-gesyncte postvak vooraan.
// Telt postvakken, niet gebruikers: wie twee mailboxen heeft kost twee slots,
// want het zijn twee IMAP-verbindingen naar twee servers.
const MAX_PER_RONDE = 8
// Ruim onder maxDuration, zodat de samenvatting nog terugkomt.
const DEADLINE_MS = 50_000

function basisUrl(): string {
  if (process.env.CRON_SELF_URL) return process.env.CRON_SELF_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://app.doen.team'
}

interface Postvak {
  /** Rij-id van user_email_settings. Null zolang de kolom niet leesbaar is. */
  id: string | null
  user_id: string
  is_standaard: boolean
}

function isKolomFout(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  if (fout.code === '42703' || fout.code === 'PGRST204') return true
  return /column .* does not exist|could not find the .* column/i.test(fout.message || '')
}

/**
 * Eén rij per postvak in plaats van één per gebruiker. Tot vandaag selecteerde
 * deze ronde alleen user_id en ontdubbelde hij niet: met twee postvakken kwam
 * dezelfde gebruiker twee keer in de ronde en openden er twee verbindingen naar
 * hetzelfde eerste postvak.
 *
 * `is_standaard` komt uit migratie 245 en mag ontbreken; dan telt elk postvak
 * als standaard en verandert er niets. Ontbreekt ook `id`, dan valt de sleutel
 * terug op user_id: zonder id kan deze ronde twee rijen niet uit elkaar houden
 * én kan fetch-emails niet weten welke bedoeld is, dus is één ronde per
 * gebruiker precies het oude gedrag.
 */
async function haalPostvakken(): Promise<Postvak[]> {
  for (const kolommen of ['id, user_id, is_standaard', 'id, user_id', 'user_id']) {
    const { data, error } = await supabaseAdmin
      .from('user_email_settings')
      .select(kolommen)
      .not('gmail_address', 'is', null)
      .not('encrypted_app_password', 'is', null)
    if (error) {
      if (isKolomFout(error)) continue
      throw new Error(error.message)
    }
    const gezien = new Set<string>()
    const postvakken: Postvak[] = []
    for (const rij of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const userId = rij.user_id as string
      if (!userId) continue
      const id = (rij.id as string) ?? null
      const sleutel = id ?? userId
      if (gezien.has(sleutel)) continue
      gezien.add(sleutel)
      postvakken.push({
        id,
        user_id: userId,
        is_standaard: rij.is_standaard === undefined || rij.is_standaard === null || rij.is_standaard === true,
      })
    }
    return postvakken
  }
  return []
}

interface SyncTijden {
  perAccount: Map<string, number>
  perUser: Map<string, number>
}

/**
 * Wie het langst niet gesynct is gaat voor. Met account_id (migratie 245) telt
 * dat per postvak; zonder die kolom per gebruiker, en dan is de oudste rij van
 * die gebruiker de maat — dat is het postvak dat de ronde het hardst nodig heeft.
 */
async function laatsteInboxSync(postvakken: Postvak[]): Promise<SyncTijden> {
  const perAccount = new Map<string, number>()
  const perUser = new Map<string, number>()
  const userIds = [...new Set(postvakken.map((p) => p.user_id))]
  if (userIds.length === 0) return { perAccount, perUser }

  for (const kolommen of ['account_id, user_id, updated_at', 'user_id, updated_at']) {
    const { data, error } = await supabaseAdmin
      .from('email_sync_state')
      .select(kolommen)
      .eq('folder', 'inbox')
      .in('user_id', userIds)
    if (error) {
      if (isKolomFout(error)) continue
      console.warn('[cron-email-sync] sync-state lezen mislukt:', error.message)
      return { perAccount, perUser }
    }
    for (const rij of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const op = Date.parse(rij.updated_at as string) || 0
      const accountId = (rij.account_id as string) ?? null
      if (accountId) perAccount.set(accountId, op)
      const userId = rij.user_id as string
      const bekend = perUser.get(userId)
      if (userId && (bekend === undefined || op < bekend)) perUser.set(userId, op)
    }
    return { perAccount, perUser }
  }
  return { perAccount, perUser }
}

async function actieveUserIds(): Promise<Set<string>> {
  const grens = Date.now() - ACTIEF_BINNEN_DAGEN * 24 * 60 * 60 * 1000
  const actief = new Set<string>()
  // listUsers pagineert; een paar pagina's dekt het ledenbestand ruim.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    for (const u of data.users) {
      const laatst = u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0
      if (laatst >= grens) actief.add(u.id)
    }
    if (data.users.length < 200) break
  }
  return actief
}

/**
 * Meldt binnengekomen mail op het toestel. Faalt stil: de sync is geslaagd en
 * dat is wat telt — een mislukte melding mag de ronde niet omver halen.
 *
 * Bewust geen berichttekst in de melding: die staat op een vergrendelscherm dat
 * anderen kunnen zien. Afzender en onderwerp is genoeg om te weten of het kan
 * wachten. Bij meerdere mails één melding met een telling; één melding per mail
 * maakt je scherm na een ochtend onbruikbaar.
 */
async function meldNieuweMail(userId: string, aantal: number, cronSecret: string, url: string) {
  try {
    const { data: profiel } = await supabaseAdmin
      .from('profiles')
      .select('push_nieuwe_mail')
      .eq('id', userId)
      .maybeSingle()
    if (!profiel?.push_nieuwe_mail) return

    const { data: laatste } = await supabaseAdmin
      .from('emails')
      .select('van, from_name, onderwerp')
      .eq('user_id', userId)
      .eq('map', 'inbox')
      .order('datum', { ascending: false })
      .limit(1)
      .maybeSingle()

    const afzender = (laatste?.from_name as string) || (laatste?.van as string) || 'Nieuwe mail'
    const onderwerp = (laatste?.onderwerp as string) || ''
    const titel = aantal > 1 ? `${aantal} nieuwe berichten` : afzender
    const tekst = aantal > 1 ? `Laatste: ${afzender} · ${onderwerp}` : onderwerp

    await fetch(`${url}/api/push-verstuur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ service_user_id: userId, titel, tekst, url: '/email', tag: 'doen-mail' }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.warn('[cron-email-sync] melding niet verstuurd', { userId, err: err instanceof Error ? err.message : err })
  }
}

/**
 * Tweede ronde per mailbox: de Verzonden-map, met een eigen email_sync_state-rij
 * en een klein venster. `snel` omdat de sweeps al in de INBOX-ronde zijn gedaan.
 * Faalt stil: de INBOX-sync is al geslaagd.
 */
async function syncVerzonden(postvak: Postvak, cronSecret: string, url: string, resterendMs: number): Promise<number> {
  if (resterendMs < 8_000) return 0
  const userId = postvak.user_id
  try {
    const respons = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ folder: 'verzonden', limit: 200, snel: true, service_user_id: userId, ...(postvak.id ? { account_id: postvak.id } : {}) }),
      signal: AbortSignal.timeout(resterendMs - 1_000),
    })
    if (!respons.ok) {
      const tekst = await respons.text().catch(() => '')
      console.warn('[cron-email-sync] verzonden-sync mislukt', { userId, status: respons.status, tekst: tekst.slice(0, 200) })
      return 0
    }
    const antwoord = (await respons.json().catch(() => ({}))) as { synced?: number }
    return Number(antwoord?.synced) || 0
  } catch (err) {
    console.warn('[cron-email-sync] verzonden-sync gooide', { userId, err: err instanceof Error ? err.message : err })
    return 0
  }
}

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const gestartOp = Date.now()

  try {
    const postvakken = await haalPostvakken()
    if (!postvakken.length) return res.status(200).json({ gesynct: 0, overgeslagen: 0 })

    const actief = await actieveUserIds()
    const kandidaten = postvakken.filter((p) => actief.has(p.user_id))

    // Langst niet gesynct eerst. Wie nog geen sync-state heeft (nieuw postvak)
    // komt vooraan, want die heeft de ronde het hardst nodig. Bij gelijkspel
    // gaat het standaardpostvak voor.
    const tijden = await laatsteInboxSync(kandidaten)
    const laatstGesynct = (p: Postvak) =>
      (p.id ? tijden.perAccount.get(p.id) : undefined) ?? tijden.perUser.get(p.user_id) ?? 0
    kandidaten.sort((a, b) =>
      (laatstGesynct(a) - laatstGesynct(b)) || (Number(b.is_standaard) - Number(a.is_standaard)))

    const ronde = kandidaten.slice(0, MAX_PER_RONDE)
    const url = `${basisUrl()}/api/fetch-emails`

    // Parallel: elk postvak opent zijn eigen IMAP-verbinding naar zijn eigen
    // server, dus ze staan elkaar niet in de weg. Sequentieel zou bij acht
    // mailboxen gegarandeerd de deadline halen.
    const uitkomsten = await Promise.all(ronde.map(async (postvak) => {
      const userId = postvak.user_id
      const accountId = postvak.id
      const resterend = DEADLINE_MS - (Date.now() - gestartOp)
      if (resterend <= 5_000) return { userId, accountId, ok: false, reden: 'deadline' }
      const afbreken = AbortSignal.timeout(resterend)
      try {
        const respons = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          // snel blijft uit: de sales- en lead-sweeps die de client op mobiel
          // overslaat horen juist hier thuis, waar niemand op ze wacht.
          // account_id erbij zodra migratie 245 gedraaid is: zonder dat pakt
          // fetch-emails het eerste postvak van deze gebruiker.
          body: JSON.stringify({ folder: 'INBOX', limit: 200, service_user_id: userId, ...(accountId ? { account_id: accountId } : {}) }),
          signal: afbreken,
        })
        if (!respons.ok) {
          const tekst = await respons.text().catch(() => '')
          console.warn('[cron-email-sync] sync mislukt', { userId, accountId, status: respons.status, tekst: tekst.slice(0, 200) })
          return { userId, accountId, ok: false, reden: `http_${respons.status}` }
        }
        const uitkomst = (await respons.json().catch(() => ({}))) as { synced?: number }
        const nieuw = Number(uitkomst?.synced) || 0
        if (nieuw > 0) await meldNieuweMail(userId, nieuw, cronSecret, basisUrl())
        await syncVerzonden(postvak, cronSecret, url, DEADLINE_MS - (Date.now() - gestartOp))
        return { userId, accountId, ok: true, synced: nieuw }
      } catch (err) {
        console.warn('[cron-email-sync] sync gooide', { userId, accountId, err: err instanceof Error ? err.message : err })
        return { userId, accountId, ok: false, reden: 'exception' }
      }
    }))

    const gelukt = uitkomsten.filter((u) => u.ok)
    return res.status(200).json({
      kandidaten: kandidaten.length,
      geprobeerd: ronde.length,
      gesynct: gelukt.length,
      nieuweMail: gelukt.reduce((som, u) => som + (Number(u.synced) || 0), 0),
      mislukt: uitkomsten.filter((u) => !u.ok).map((u) => ({ userId: u.userId, accountId: u.accountId, reden: u.reden })),
      duurMs: Date.now() - gestartOp,
    })
  } catch (err) {
    console.error('[cron-email-sync] Fatal:', err)
    Sentry.captureException(err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Sync mislukt' })
  }
}
