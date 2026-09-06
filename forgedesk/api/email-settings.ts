import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || ''

/**
 * Het enige schrijfpad voor mailwachtwoorden in de hele codebase.
 *
 * AES-256-GCM met een willekeurige salt per wachtwoord en een auth-tag. Het
 * oude CBC-formaat leidde de sleutel af met een vaste, in de code
 * opgeschreven salt en had geen integriteitscontrole, dus geknoei aan de
 * opgeslagen ciphertext viel niet op.
 *
 * Bestaande rijen in het oude CBC-formaat en de nog oudere `b64:`-vorm
 * blijven leesbaar: alle tien de leespaden herkennen alle drie de vormen.
 * Een rij schuift pas op naar g1 zodra iemand zijn wachtwoord opnieuw
 * opslaat, dus niemand raakt buitengesloten.
 */
function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')
  const salt = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return 'g1:' + Buffer.concat([salt, iv, tag, ct]).toString('base64')
}

function decrypt(encryptedText: string): string {
  // Oudste vorm: base64, dus feitelijk leesbaar. Blijft ondersteund tot de
  // laatste rij is omgezet.
  if (encryptedText.startsWith('b64:')) {
    return Buffer.from(encryptedText.slice(4), 'base64').toString('utf8')
  }
  if (!ENCRYPTION_KEY) throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd')

  if (encryptedText.startsWith('g1:')) {
    try {
      const raw = Buffer.from(encryptedText.slice(3), 'base64')
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

  // Oud CBC-formaat.
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const [ivHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    throw new Error('Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op')
  }
}

/**
 * Opnieuw opslaan is het herstelpad na een uitgezette mailbox (contract
 * sectie 5): de gezondheid gaat terug naar 'ok' en de mailsync-taak wordt
 * weer 'wachtend', zodat de werker de mailbox de eerstvolgende ronde meeneemt.
 * Mag het opslaan zelf nooit laten falen.
 */
async function herstelSyncStatus(userId: string, accountId?: string | null): Promise<void> {
  const nu = new Date().toISOString()
  try {
    // Per postvak: zonder dit filter zet het opslaan van postvak A ook de
    // storingsmelding van postvak B op 'ok' en verdwijnt die uit beeld zonder
    // dat er iets aan verholpen is. account_id komt uit migratie 245; ontbreekt
    // de kolom, dan is er per definitie één postvak en klopt het oude filter.
    const staatFilter = () => {
      const vraag = supabaseAdmin.from('email_sync_state').update({ status: 'ok', laatste_fout: null, laatste_fout_op: null })
      return accountId ? vraag.eq('account_id', accountId) : vraag.eq('user_id', userId)
    }
    let stateErr = (await staatFilter()).error
    if (stateErr && accountId && isOnbekendeSleutel(stateErr)) {
      stateErr = (await supabaseAdmin
        .from('email_sync_state')
        .update({ status: 'ok', laatste_fout: null, laatste_fout_op: null })
        .eq('user_id', userId)).error
    }
    if (stateErr) console.warn('[email-settings] sync-status herstellen mislukt:', stateErr.message)

    // Eén 'mislukt'-taak terugzetten: de partiele unieke index laat maar één
    // open taak per mailbox toe, dus niet blind alle rijen tegelijk.
    const misluktVraag = supabaseAdmin
      .from('mailsync_taken')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'mislukt')
      .order('updated_at', { ascending: false })
      .limit(1)
    const { data: mislukt } = await (accountId
      ? misluktVraag.eq('account_id', accountId).maybeSingle().then(async (uit) => (uit.error && isOnbekendeSleutel(uit.error)
        ? await supabaseAdmin.from('mailsync_taken').select('id').eq('user_id', userId).eq('status', 'mislukt').order('updated_at', { ascending: false }).limit(1).maybeSingle()
        : uit))
      : misluktVraag.maybeSingle())
    if (mislukt?.id) {
      const { error: taakErr } = await supabaseAdmin
        .from('mailsync_taken')
        .update({
          status: 'wachtend', retry_count: 0, uitstel_count: 0, fout_soort: null, foutmelding: null,
          gemeld_op: null, geclaimd_op: null, geclaimd_door: null, lease_tot: null,
          scheduled_at: nu, updated_at: nu,
        })
        .eq('id', mislukt.id)
        .eq('status', 'mislukt')
      if (taakErr && taakErr.code !== '23505') console.warn('[email-settings] mailsync-taak terugzetten mislukt:', taakErr.message)
    }
    // Een wachtende taak meteen aan de beurt, niet pas over drie minuten.
    await supabaseAdmin
      .from('mailsync_taken')
      .update({ scheduled_at: nu, updated_at: nu })
      .eq('user_id', userId)
      .eq('status', 'wachtend')
  } catch (err) {
    console.warn('[email-settings] herstelSyncStatus gooide:', err instanceof Error ? err.message : err)
  }
}

// ── GEDEELD-MET-API: credentials per postvak ──────────────────────────────
// Een gebruiker kan meer postvakken hebben (migratie 245, activering in 246),
// dus `.maybeSingle()` op user_id klapt zodra er een tweede rij bijkomt.
// Volgorde: het meegestuurde account_id, anders het postvak met `is_standaard`,
// anders de enige rij. auth_type en de oauth-kolommen komen uit migratie 244;
// ontbreken die, dan antwoordt PostgREST met 42703 of PGRST204 en faalt de HELE
// select, waarna deze GET 404 gaf en Instellingen "geen mailbox gekoppeld"
// meldde terwijl de mailbox gewoon bestond. Vandaar de terugval op de kolommen
// van vóór 244.
// Dezelfde helper hoort in fetch-emails, read-email, prefetch-email-bodies,
// email-imap-action, backfill-emails, test-email-connection, send-email,
// cron-verzend-geplande-berichten en de twee mail-oauth-routes.
interface InstellingenRij {
  id?: string | null
  gmail_address: string | null
  encrypted_app_password: string | null
  smtp_host: string | null
  smtp_port: number | null
  imap_host: string | null
  imap_port: number | null
  auth_type: string | null
  oauth_refresh_token_enc: string | null
}

const INSTELLINGEN_KOLOMMEN_VOOR_244 = 'gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port'
const INSTELLINGEN_KOLOMMEN = `${INSTELLINGEN_KOLOMMEN_VOOR_244}, auth_type, oauth_refresh_token_enc`

function isKolomFout(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  if (fout.code === '42703' || fout.code === 'PGRST204') return true
  return /column .* does not exist|could not find the .* column/i.test(fout.message || '')
}

/** Kolommen uit 244 mogen ontbreken; de rij zelf moet dan nog wel terugkomen. */
async function leesInstellingenRij(
  userId: string,
  kolommen: string,
  kolommenVoor244: string,
  accountId?: string | null,
): Promise<Record<string, unknown> | null> {
  async function haalRij(keuze: 'account' | 'standaard' | 'enige') {
    const bouw = (kols: string) => {
      let vraag = supabaseAdmin.from('user_email_settings').select(`id, ${kols}`).eq('user_id', userId)
      if (keuze === 'account') vraag = vraag.eq('id', accountId as string)
      if (keuze === 'standaard') vraag = vraag.eq('is_standaard', true)
      return vraag.maybeSingle()
    }
    const volledig = await bouw(kolommen)
    if (!isKolomFout(volledig.error)) {
      return { rij: (volledig.data as unknown as Record<string, unknown> | null) ?? null, fout: volledig.error }
    }
    const oud = await bouw(kolommenVoor244)
    const rij = (oud.data as unknown as Record<string, unknown> | null) ?? null
    return { rij: rij ? { ...rij, auth_type: 'wachtwoord', oauth_refresh_token_enc: null } : null, fout: oud.error }
  }

  if (accountId) {
    const uitkomst = await haalRij('account')
    return uitkomst.fout ? null : uitkomst.rij
  }
  // is_standaard bestaat pas sinds migratie 245; ontbreekt de kolom of staan er
  // meer standaard-rijen, dan beslist de volgende poging.
  const standaard = await haalRij('standaard')
  if (!standaard.fout && standaard.rij) return standaard.rij
  const enige = await haalRij('enige')
  return enige.fout ? null : enige.rij
}

/**
 * Alle postvakken van deze gebruiker, met de nieuwste kolommen waar die
 * bestaan. Drie tiers, want 245 (is_standaard) en 244 (auth_type en de
 * oauth-kolommen) kunnen los van elkaar ontbreken en een select faalt in zijn
 * geheel op één onbekende kolom.
 */
async function leesPostvakken(userId: string, kolommen: string, kolommenVoor244: string): Promise<Record<string, unknown>[]> {
  const bouw = (kols: string) => supabaseAdmin
    .from('user_email_settings')
    .select(kols)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  // soort hoort bij de 245-laag: zonder die migratie bestaat de kolom niet en
  // valt de ladder hieronder terug op de oudere kolomlijst.
  const met245 = await bouw(`id, is_standaard, soort, ${kolommen}`)
  if (!met245.error) return (met245.data as unknown as Record<string, unknown>[]) ?? []
  if (!isKolomFout(met245.error)) return []
  const met244 = await bouw(`id, ${kolommen}`)
  if (!met244.error) return (met244.data as unknown as Record<string, unknown>[]) ?? []
  if (!isKolomFout(met244.error)) return []
  const oud = await bouw(`id, ${kolommenVoor244}`)
  if (oud.error) return []
  return ((oud.data as unknown as Record<string, unknown>[]) ?? []).map((r) => ({ ...r, auth_type: 'wachtwoord', oauth_refresh_token_enc: null }))
}
// ── GEDEELD-MET-API EINDE: credentials per postvak ────────────────────────

// ── GEDEELD-MET-API: upsert-ladder ────────────────────────────────────────
// user_email_settings had UNIQUE (user_id) uit migratie 037; migratie 246 haalt
// die weg en zet er een partiële unieke index op is_standaard voor terug. Een
// upsert op user_id geeft daarna 42P10 (geen unieke index bij die kolommen) in
// plaats van 42703, en juist die code ving de bestaande terugval niet: opslaan
// zou dan falen, precies de knop die je nodig hebt om een uitgezette mailbox
// te herstellen. Kennen we het rij-id, dan is een gerichte update altijd beter.
// Dezelfde ladder staat in api/mail-oauth-callback.ts.
function isOnbekendeSleutel(fout: { code?: string; message?: string } | null): boolean {
  if (!fout) return false
  return fout.code === '42703' || fout.code === '42P10' || fout.code === 'PGRST204'
    || /column .* does not exist|could not find the .* column|no unique or exclusion constraint/i.test(fout.message || '')
}

async function schrijfPostvak(velden: Record<string, unknown>, userId: string, postvakId?: string | null, aantalBestaand = 1): Promise<{ error: { message?: string; code?: string } | null }> {
  if (postvakId) {
    return await supabaseAdmin.from('user_email_settings').update(velden).eq('id', postvakId)
  }
  // Zonder id mag er hooguit één postvak zijn. De terugvallen hieronder raken
  // álle rijen van deze gebruiker: de upsert op user_id werkt na 246 niet meer
  // (de sleutel is dan weg) en de update op user_id zou dan beide postvakken
  // hetzelfde adres geven. Weigeren is het enige veilige antwoord.
  if (aantalBestaand > 1) {
    return { error: { message: 'Kies welk postvak je bijwerkt.', code: 'POSTVAK_ONBEKEND' } }
  }
  const upsert = await supabaseAdmin.from('user_email_settings').upsert({ ...velden, user_id: userId }, { onConflict: 'user_id' })
  if (!upsert.error || !isOnbekendeSleutel(upsert.error)) return upsert
  return await supabaseAdmin.from('user_email_settings').update(velden).eq('user_id', userId)
}
/**
 * Een tweede postvak mag niet ook standaard zijn: migratie 246 legt daar een
 * unieke index op. Ontbreekt `is_standaard` nog, dan invoegen zonder.
 */
async function nieuwPostvak(velden: Record<string, unknown>, userId: string): Promise<{ id: string | null; error: { message?: string; code?: string } | null }> {
  for (const rij of [{ ...velden, user_id: userId, is_standaard: false }, { ...velden, user_id: userId }]) {
    const { data, error } = await supabaseAdmin.from('user_email_settings').insert(rij).select('id').maybeSingle()
    if (!error) return { id: (data?.id as string) ?? null, error: null }
    if (!isOnbekendeSleutel(error)) return { id: null, error }
  }
  return { id: null, error: { message: 'Nieuw postvak aanmaken mislukt' } }
}
// ── GEDEELD-MET-API EINDE: upsert-ladder ──────────────────────────────────

/** Eén postvak zoals de client hem krijgt. Wachtwoord en tokens blijven op de server. */
function naarAntwoord(rij: Record<string, unknown>) {
  const data = rij as unknown as InstellingenRij & { is_standaard?: boolean | null }
  return {
    account_id: (data.id as string) ?? null,
    gmail_address: data.gmail_address,
    has_password: !!data.encrypted_app_password,
    // De tokens zelf verlaten de server nooit, net zomin als het
    // wachtwoord; de UI hoeft alleen te weten dát er een koppeling is.
    auth_type: data.auth_type || 'wachtwoord',
    has_oauth: !!data.oauth_refresh_token_enc,
    is_standaard: data.is_standaard ?? true,
    // Zodat de UI kan tonen dat dit een team-inbox is.
    soort: (data as { soort?: string | null }).soort === 'gedeeld' ? 'gedeeld' : 'persoonlijk',
    smtp_host: data.smtp_host || 'smtp.gmail.com',
    smtp_port: data.smtp_port || 587,
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: haal opgeslagen email instellingen op.
  // Het wachtwoord verlaat de server NOOIT (voorheen werd het ontsleuteld
  // teruggegeven); we exposen alleen has_password zodat de UI de status kan tonen.
  if (req.method === 'GET') {
    try {
      const userId = await verifyUser(req)
      // is_verified stond hier ooit bij, maar die kolom bestaat niet in de
      // database (migratie 004 is nooit gedraaid) en niets schreef hem ooit.
      // De select faalde daardoor volledig, waarna deze GET een 401 gaf en de
      // instellingenpagina terugviel op localStorage.
      const gevraagdAccount = typeof req.query.account_id === 'string' ? req.query.account_id : null
      const rijen = await leesPostvakken(userId, INSTELLINGEN_KOLOMMEN, INSTELLINGEN_KOLOMMEN_VOOR_244)

      if (rijen.length === 0) {
        return res.status(404).json({ error: 'Geen email instellingen gevonden' })
      }

      const postvakken = rijen.map(naarAntwoord)
      // Het postvak waar de losse velden over gaan: het gevraagde, anders het
      // standaardpostvak, anders het eerste. Met precies één postvak is dat
      // hetzelfde antwoord als voorheen, dus de bestaande UI merkt niets.
      const gekozen = (gevraagdAccount && postvakken.find((p) => p.account_id === gevraagdAccount))
        || postvakken.find((p) => p.is_standaard)
        || postvakken[0]

      return res.status(200).json({ ...gekozen, postvakken })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Fout bij ophalen'
      return res.status(401).json({ error: msg })
    }
  }

  // DELETE: verwijder email instellingen
  if (req.method === 'DELETE') {
    try {
      const userId = await verifyUser(req)
      // Met een account_id ontkoppel je één postvak; zonder id alleen wanneer er
      // precies één is. Een kale delete op user_id wiste bij een tweede postvak
      // stilzwijgend ook de eerste.
      const accountId = typeof req.query.account_id === 'string' ? req.query.account_id : (req.body?.account_id as string | undefined)
      if (accountId) {
        // .select() erbij: zonder de rij terug te vragen meldt een delete op
        // een id van iemand anders vrolijk succes.
        const { data: weg, error } = await supabaseAdmin
          .from('user_email_settings')
          .delete()
          .eq('user_id', userId)
          .eq('id', accountId)
          .select('id')
        if (error) return res.status(400).json({ error: 'Postvak ontkoppelen mislukt' })
        if (!weg || weg.length === 0) {
          return res.status(404).json({ error: 'Dit postvak bestaat niet of hoort niet bij jou.' })
        }
        return res.status(200).json({ success: true, message: 'Postvak ontkoppeld' })
      }
      const { data: rijen } = await supabaseAdmin
        .from('user_email_settings')
        .select('id')
        .eq('user_id', userId)
      if ((rijen?.length ?? 0) > 1) {
        return res.status(400).json({ error: 'Er zijn meer postvakken gekoppeld. Kies welk postvak je wilt ontkoppelen.' })
      }
      await supabaseAdmin
        .from('user_email_settings')
        .delete()
        .eq('user_id', userId)
      return res.status(200).json({ success: true, message: 'Email instellingen verwijderd' })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Fout bij verwijderen'
      return res.status(401).json({ error: msg })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { gmail_address, app_password, smtp_host, smtp_port, imap_host, imap_port, auth_type } = req.body
    const gevraagdAccountId = typeof req.body?.account_id === 'string' && req.body.account_id ? req.body.account_id : null
    // De client zegt expliciet of dit een nieuw postvak is. Zonder dat signaal
    // is "één bestaand postvak" niet te onderscheiden van "postvak toevoegen",
    // en zou toevoegen het eerste postvak overschrijven.
    const wilNieuw = req.body?.nieuw === true
    // Een gedeeld postvak (team-inbox) hoort bij de organisatie: iedereen leest
    // en beantwoordt mee. Dat is een besluit van een beheerder, niet van elke
    // gebruiker, dus de rol wordt hier gecontroleerd en niet in de UI.
    const wilGedeeld = req.body?.soort === 'gedeeld'

    if (!gmail_address) {
      return res.status(400).json({ error: 'Email adres is verplicht' })
    }

    // Welk postvak dit formulier bijwerkt. Met een account_id is dat expliciet.
    // Zonder account_id: één bestaand postvak is dát postvak (adres wijzigen is
    // dan nog steeds van mailbox wisselen, precies zoals nu). Zijn er meer, dan
    // beslist het adres, en anders is het een nieuw postvak — blind upserten op
    // user_id zou daar het verkeerde postvak overschrijven.
    let orgVanGebruiker: string | null = null
    if (wilGedeeld) {
      const { data: profiel } = await supabaseAdmin
        .from('profiles')
        .select('rol, organisatie_id')
        .eq('id', userId)
        .maybeSingle()
      const rij = profiel as { rol?: string | null; organisatie_id?: string | null } | null
      if (rij?.rol !== 'admin') {
        return res.status(403).json({ error: 'Alleen een beheerder kan een gedeeld postvak koppelen.' })
      }
      if (!rij?.organisatie_id) {
        return res.status(400).json({ error: 'Je account hoort nog bij geen organisatie; een gedeeld postvak kan dan niet.' })
      }
      orgVanGebruiker = rij.organisatie_id
      // Ook geen account_id: met nieuw=true én een account_id wint verderop de
      // tak die op dat id bijwerkt, en dan zou deze poort een bestaand
      // persoonlijk postvak alsnog omzetten naar gedeeld. Daarmee komt de hele
      // organisatie in een privémailbox.
      if (!wilNieuw || gevraagdAccountId) {
        return res.status(400).json({ error: 'Een gedeeld postvak koppel je als nieuw postvak, niet door een bestaand postvak om te zetten.' })
      }
    }

    const bestaandeRijen = await leesPostvakken(userId, INSTELLINGEN_KOLOMMEN, INSTELLINGEN_KOLOMMEN_VOOR_244)
    const opAdres = bestaandeRijen.find(
      (r) => String(r.gmail_address || '').toLowerCase() === String(gmail_address).toLowerCase(),
    )
    let doelPostvakId: string | null = null
    if (gevraagdAccountId) {
      const eigen = bestaandeRijen.find((r) => r.id === gevraagdAccountId)
      if (!eigen) {
        return res.status(404).json({ error: 'Dit postvak bestaat niet of hoort niet bij jou.' })
      }
      doelPostvakId = gevraagdAccountId
    } else if (wilNieuw) {
      if (opAdres) {
        return res.status(409).json({ error: 'Dit adres is al gekoppeld als postvak.' })
      }
      doelPostvakId = null
    } else if (bestaandeRijen.length === 1) {
      doelPostvakId = (bestaandeRijen[0].id as string) ?? null
    } else if (opAdres) {
      doelPostvakId = (opAdres.id as string) ?? null
    }
    // Meer dan één postvak en geen aanwijzing wélk: niet raden. Zonder deze
    // poort valt een adreswijziging terug op een update op user_id (die beide
    // postvakken hetzelfde adres geeft) of maakt hij ongevraagd een derde rij.
    if (!doelPostvakId && !wilNieuw && bestaandeRijen.length > 1) {
      return res.status(409).json({ error: 'Je hebt meerdere postvakken. Kies eerst welk postvak je bijwerkt.' })
    }
    const wordtNieuwPostvak = !doelPostvakId && (bestaandeRijen.length > 0 || wilNieuw)

    const gevraagdAuthType = auth_type === 'google' || auth_type === 'microsoft' || auth_type === 'wachtwoord'
      ? (auth_type as string)
      : null

    // Sentinel 'UNCHANGED' (of leeg) = gebruiker wijzigt het wachtwoord niet;
    // behoud de bestaande versleutelde waarde. Zo hoeft het wachtwoord nooit
    // opnieuw over de lijn (het wordt ook niet meer via GET teruggegeven).
    const wijzigtWachtwoord = !!app_password && app_password !== 'UNCHANGED'

    const basisVelden = {
      user_id: userId,
      gmail_address,
      smtp_host: smtp_host || 'smtp.gmail.com',
      smtp_port: smtp_port || 587,
      imap_host: imap_host || 'imap.gmail.com',
      imap_port: imap_port || 993,
      updated_at: new Date().toISOString(),
    }

    if (!wijzigtWachtwoord) {
      // Een nieuw postvak zonder wachtwoord bestaat niet: zonder deze poort
      // valt een POST met nieuw=true en app_password 'UNCHANGED' hieronder in
      // het bewerkpad en overschrijft hij het bestaande postvak.
      if (wordtNieuwPostvak) {
        return res.status(400).json({ error: 'Een nieuw postvak heeft een app-wachtwoord nodig.' })
      }
      // Geen nieuw wachtwoord: vereist dat er al één is opgeslagen, of een
      // OAuth-koppeling die het wachtwoord vervangt.
      const bestaand = await leesInstellingenRij(
        userId,
        'encrypted_app_password, auth_type, oauth_refresh_token_enc',
        'encrypted_app_password',
        doelPostvakId,
      ) as { encrypted_app_password?: string | null; auth_type?: string | null; oauth_refresh_token_enc?: string | null } | null
      const heeftOauth = (bestaand?.auth_type === 'google' || bestaand?.auth_type === 'microsoft')
        && !!bestaand?.oauth_refresh_token_enc
      if (!bestaand?.encrypted_app_password && !heeftOauth) {
        return res.status(400).json({ error: 'App wachtwoord is verplicht' })
      }
      // auth_type is geen keuze in een formulier maar een gevolg van wat er
      // opgeslagen staat. Google of Microsoft vragen zonder koppeling zou een
      // rij opleveren die bij het eerste ophalen "Toegang ingetrokken" geeft.
      if (gevraagdAuthType && gevraagdAuthType !== 'wachtwoord' && !heeftOauth) {
        return res.status(400).json({ error: 'Koppel eerst met Google of Microsoft.' })
      }
      if (gevraagdAuthType === 'wachtwoord' && !bestaand?.encrypted_app_password) {
        return res.status(400).json({ error: 'App wachtwoord is verplicht' })
      }
      // Bij een OAuth-koppeling bepaalt de provider het adres en de hosts; de
      // velden uit het formulier mogen die niet overschrijven. Opslaan is dan
      // alleen het herstelpad ("Opnieuw verbinden").
      const velden = heeftOauth
        ? { updated_at: basisVelden.updated_at, ...(gevraagdAuthType ? { auth_type: gevraagdAuthType } : {}) }
        : { ...basisVelden, ...(gevraagdAuthType ? { auth_type: gevraagdAuthType } : {}) }
      // auth_type komt uit migratie 244. Zolang die niet gedraaid is zou het
      // opslaan van een gewoon app-wachtwoord hier hard falen; dan schrijven we
      // de rest en laten we auth_type weg (wachtwoord is toch de standaard).
      let { error } = await schrijfPostvak(velden as Record<string, unknown>, userId, doelPostvakId, bestaandeRijen.length)
      if (error && isKolomFout(error)) {
        const { auth_type: _weg, ...zonderAuthType } = velden as Record<string, unknown>
        const tweede = await schrijfPostvak(zonderAuthType, userId, doelPostvakId, bestaandeRijen.length)
        error = tweede.error
      }
      if (error) {
        console.error('Supabase update fout:', JSON.stringify(error))
        if (error.code === 'POSTVAK_ONBEKEND') {
          return res.status(409).json({ error: error.message || 'Kies eerst welk postvak je bijwerkt.' })
        }
        return res.status(500).json({ error: `Kon email instellingen niet opslaan: ${error.message || error.code || JSON.stringify(error)}` })
      }
      await herstelSyncStatus(userId, doelPostvakId)
      return res.status(200).json({ success: true, account_id: doelPostvakId, message: 'Email instellingen opgeslagen' })
    }

    // Wachtwoord alléén AES-versleuteld opslaan. De oude b64-fallback schreef
    // een omkeerbaar (effectief plaintext) wachtwoord weg — liever hard falen
    // dan dat stilletjes doen. Bestaande b64-rijen blijven leesbaar in de
    // decrypt-paden totdat de gebruiker opnieuw opslaat.
    let encryptedPassword: string
    try {
      encryptedPassword = encrypt(app_password)
    } catch (encErr) {
      console.error('[email-settings] POST: versleutelen mislukt (EMAIL_ENCRYPTION_KEY geconfigureerd?):', encErr)
      return res.status(500).json({
        error: 'Wachtwoord kon niet veilig worden opgeslagen. Neem contact op met support.',
      })
    }

    const velden = {
      ...basisVelden,
      encrypted_app_password: encryptedPassword,
      // Een app-wachtwoord opslaan is het einde van een OAuth-koppeling,
      // welk auth_type het formulier ook meestuurt: laat je de tokens staan,
      // dan kan een leespad stilletjes op de oude koppeling terugvallen.
      auth_type: 'wachtwoord',
      oauth_refresh_token_enc: null,
      oauth_access_token_enc: null,
      oauth_token_verloopt_op: null,
      // Gedeeld: de organisatie leest en beantwoordt mee. `soort` en
      // `organisatie_id` komen uit migratie 245; ontbreken ze, dan valt
      // nieuwPostvak terug op een rij zonder die velden en is het gewoon een
      // persoonlijk postvak. Dat is de juiste terugval: liever te weinig
      // gedeeld dan per ongeluk te veel.
      ...(wilGedeeld ? { soort: 'gedeeld', organisatie_id: orgVanGebruiker } : {}),
    }
    const uitkomst = wordtNieuwPostvak
      ? await nieuwPostvak(velden, userId)
      : await schrijfPostvak(velden, userId, doelPostvakId, bestaandeRijen.length)
    const error = uitkomst.error

    if (error) {
      console.error('Supabase upsert fout:', JSON.stringify(error))
      // Vóór migratie 246 staat er nog een unieke sleutel op user_id: een
      // tweede postvak geeft dan 23505. Dat is geen storing maar een stand van
      // zaken, dus geen rauwe Postgres-melding op het scherm.
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Een tweede postvak kan pas nadat migratie 246 gedraaid is.' })
      }
      // Liever een duidelijke weigering dan stilletjes een persoonlijk postvak
      // maken waar om een gedeeld postvak gevraagd is.
      if (wilGedeeld && isKolomFout(error)) {
        return res.status(400).json({ error: 'Gedeelde postvakken werken pas nadat migratie 245 gedraaid is.' })
      }
      if (error.code === 'POSTVAK_ONBEKEND') {
        return res.status(409).json({ error: error.message || 'Kies eerst welk postvak je bijwerkt.' })
      }
      return res.status(500).json({ error: `Kon email instellingen niet opslaan: ${error.message || error.code || JSON.stringify(error)}` })
    }

    const nieuweId = ('id' in uitkomst ? (uitkomst.id as string | null) : doelPostvakId) ?? null
    await herstelSyncStatus(userId, nieuweId)
    return res.status(200).json({ success: true, account_id: nieuweId, message: 'Email instellingen opgeslagen' })
  } catch (error: unknown) {
    console.error('Email settings fout:', error)
    const msg = error instanceof Error ? error.message : 'Fout bij opslaan'
    // Specifieke foutmeldingen voor bekende problemen
    if (msg.includes('EMAIL_ENCRYPTION_KEY')) {
      return res.status(500).json({ error: 'Server configuratiefout: EMAIL_ENCRYPTION_KEY is niet ingesteld. Neem contact op met de beheerder.' })
    }
    return res.status(500).json({ error: msg })
  }
}
