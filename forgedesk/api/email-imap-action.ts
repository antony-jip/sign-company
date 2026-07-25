import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function isRateLimited(key: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: key, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
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

// ── Archief-doelmap ───────────────────────────────────────────────────────
// Gmail kent geen \Archive: daar ís archiveren "uit INBOX halen", en het
// bericht blijft in \All staan. De rest van de wereld heeft een echte map.
const ARCHIEF_SPECIAL_USE = '\\Archive'
const ARCHIEF_NAAM_PATROON = /^archiv|archief|arkiv|gearchiveerd/i

/**
 * Zoekt een doelmap in één keer op uit een eerder opgehaalde folderlijst.
 * Bewust géén status()-probe per map zoals resolveImapFolder hierboven: die
 * kost een round-trip per lookup, en hier zijn er meerdere per request nodig.
 * Vindt hij niets, dan geeft hij null — een MOVE naar een gegokte mapnaam is
 * gevaarlijk, want sommige servers maken die dan stilzwijgend aan.
 */
function zoekDoelmap(mailboxes: ImapMailbox[], specialUse: string, naamPatroon: RegExp): string | null {
  const opSpecialUse = mailboxes.find((m) => m.specialUse === specialUse)
  if (opSpecialUse) return opSpecialUse.path
  const kandidaten = mailboxes.filter((m) => naamPatroon.test(m.path) || naamPatroon.test(m.name || ''))
  if (kandidaten.length === 0) return null
  const gmailVariant = kandidaten.find((m) => m.path.startsWith('[Gmail]/'))
  return (gmailVariant || kandidaten[0]).path
}

interface MailRij {
  id: string
  uid: number | null
  imap_folder: string | null
  map: string | null
  message_id: string | null
}

type Actie = 'trash' | 'purge' | 'archive'
const TOEGESTANE_ACTIES: Actie[] = ['trash', 'purge', 'archive']
const MAX_PER_REQUEST = 200

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let client: ImapFlow | null = null

  try {
    const user_id = await verifyUser(req)

    // Vlag staat standaard uit. Dit schrijft in de échte mailbox van een
    // klant; pas aanzetten nadat het tegen minstens één niet-Gmail-account
    // is nagelopen. Zolang hij uit staat blijft doen. zich gedragen als nu.
    if (process.env.EMAIL_IMAP_WRITEBACK !== 'aan') {
      return res.status(200).json({ overgeslagen: true, reden: 'writeback_uit' })
    }

    if (await isRateLimited(`email-imap-action:${user_id}`, 60, 60)) {
      return res.status(429).json({ error: 'Te veel verzoeken. Probeer het zo opnieuw.' })
    }

    const { action, emailIds } = req.body as { action?: string; emailIds?: unknown }
    if (!action || !TOEGESTANE_ACTIES.includes(action as Actie)) {
      return res.status(400).json({ error: 'Onbekende actie' })
    }
    if (!Array.isArray(emailIds) || emailIds.length === 0 || emailIds.length > MAX_PER_REQUEST) {
      return res.status(400).json({ error: `Geef 1 tot ${MAX_PER_REQUEST} email-ids mee` })
    }
    const actie = action as Actie
    const ids = emailIds.filter((i): i is string => typeof i === 'string' && i.length > 0)
    if (ids.length === 0) return res.status(400).json({ error: 'Geen geldige email-ids' })

    // De client stuurt alleen onze eigen rij-ids; uid en map leiden we hier
    // af. Zou de client uid+folder mogen meesturen, dan kon een ingelogde
    // gebruiker willekeurige UIDs uit willekeurige mappen laten wissen.
    // user_id-filter is verplicht: service_role omzeilt RLS.
    const alle: MailRij[] = []
    for (let i = 0; i < ids.length; i += 50) {
      const { data: rijen, error: leesFout } = await supabaseAdmin
        .from('emails')
        .select('id, uid, imap_folder, map, message_id')
        .eq('user_id', user_id)
        .in('id', ids.slice(i, i + 50))
      if (leesFout) throw new Error(leesFout.message)
      alle.push(...((rijen || []) as MailRij[]))
    }
    const metUid = alle.filter((r) => Number.isFinite(Number(r.uid)) && Number(r.uid) > 0 && r.imap_folder)
    const zonderUid = alle.filter((r) => !metUid.includes(r))

    const resultaten: Array<{ id: string; ok: boolean; imap: string; error?: string }> = []

    // Definitief verwijderen kan alleen met IMAP-controle erachter. Een rij
    // zonder uid kan niet tegen de server gecheckt worden, dus daar weigeren
    // we in plaats van hem stilletjes hard te deleten.
    if (actie === 'purge' && zonderUid.length > 0) {
      for (const r of zonderUid) {
        resultaten.push({ id: r.id, ok: false, imap: 'geweigerd', error: 'geen_imap_identiteit' })
      }
    }

    // Alleen DB-rijen (eigen concepten, mail zonder IMAP-identiteit): geen
    // verbinding opzetten.
    if (metUid.length === 0) {
      if (actie !== 'purge') {
        await schrijfDbMutatie(actie, alle.map((r) => r.id), user_id, null)
        for (const r of alle) resultaten.push({ id: r.id, ok: true, imap: 'overgeslagen' })
      }
      return res.status(200).json({
        resultaten,
        geslaagd: resultaten.filter((r) => r.ok).length,
        mislukt: resultaten.filter((r) => !r.ok).length,
      })
    }

    const creds = await getEmailCredentials(user_id)
    client = new ImapFlow({
      host: creds.imap_host,
      port: creds.imap_port,
      secure: creds.imap_port === 993,
      auth: { user: creds.gmail_address, pass: creds.app_password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    })
    await client.connect()

    const isGmail = client.capabilities?.has?.('X-GM-EXT-1') ?? false
    const mailboxen = (await client.list()) as ImapMailbox[]

    const trashPad = zoekDoelmap(mailboxen, '\\Trash', NAME_PATTERNS.prullenbak)
    const archiefPad = isGmail
      ? zoekDoelmap(mailboxen, '\\All', NAME_PATTERNS.alle)
      : zoekDoelmap(mailboxen, ARCHIEF_SPECIAL_USE, ARCHIEF_NAAM_PATROON)

    const doelPad = actie === 'archive' ? archiefPad : trashPad
    if (actie !== 'purge' && !doelPad) {
      await client.logout(); client = null
      return res.status(409).json({
        error: actie === 'archive'
          ? 'Deze mailbox heeft geen archiefmap'
          : 'Deze mailbox heeft geen prullenbak',
      })
    }

    // Groeperen per bronmap: een bulkselectie kan mappen overspannen.
    const perMap = new Map<string, MailRij[]>()
    for (const r of metUid) {
      const pad = r.imap_folder as string
      if (!perMap.has(pad)) perMap.set(pad, [])
      perMap.get(pad)!.push(r)
    }

    for (const [bronPad, groep] of perMap) {
      try {
        const mailbox = await client.mailboxOpen(bronPad)

        // UIDVALIDITY-controle. Is die gewisseld, dan wijst een opgeslagen uid
        // naar een ánder bericht en zouden we de verkeerde mail verplaatsen of
        // wissen. fetch-emails weet al dat dit gebeurt (zie de re-bootstrap).
        // Op imap_folder kunnen meerdere rijen staan (verzonden/sent wijzen
        // naar hetzelfde pad), dus geen maybeSingle: die had een fout gegeven
        // die we weggooiden, waarna de controle stil oversloeg.
        const { data: syncRijen } = await supabaseAdmin
          .from('email_sync_state')
          .select('uidvalidity')
          .eq('user_id', user_id)
          .eq('imap_folder', bronPad)
        const bekend = (syncRijen || [])
          .map((r) => Number(r.uidvalidity))
          .filter((n) => Number.isFinite(n) && n > 0)
        const huidig = Number(mailbox.uidValidity ?? 0)

        if (bekend.length > 0 && !bekend.includes(huidig)) {
          for (const r of groep) {
            resultaten.push({ id: r.id, ok: false, imap: 'geweigerd', error: 'mailbox_gewijzigd' })
          }
          continue
        }
        // Geen bekende UIDVALIDITY = we kunnen de uids niet verifiëren. Voor
        // verplaatsen is dat te overzien, voor definitief verwijderen niet.
        if (bekend.length === 0 && actie === 'purge') {
          for (const r of groep) {
            resultaten.push({ id: r.id, ok: false, imap: 'geweigerd', error: 'geen_syncstatus' })
          }
          continue
        }

        const uids = groep.map((r) => Number(r.uid))

        if (actie === 'purge') {
          // Onherstelbaar. Twee sloten: élke rij moet in de prullenbak zitten
          // én de bronmap moet de opgeloste prullenbak zijn. Expungen uit
          // INBOX is bij Gmail onschuldig, uit Trash definitief — dat verschil
          // mag niet van toeval afhangen.
          if (!trashPad || bronPad !== trashPad || groep.some((r) => r.map !== 'prullenbak')) {
            for (const r of groep) resultaten.push({ id: r.id, ok: false, imap: 'geweigerd', error: 'niet_in_prullenbak' })
            continue
          }
          // Message-id hercontrole: laatste vangnet tegen een hergebruikte uid.
          const geldig: number[] = []
          for await (const bericht of client.fetch({ uid: uids.join(',') }, { uid: true, envelope: true })) {
            const rij = groep.find((r) => Number(r.uid) === bericht.uid)
            if (!rij) continue
            // Geen message_id = niets om tegen te vergelijken. Juist dan is
            // de uid de enige identiteit, dus weigeren in plaats van gokken.
            if (rij.message_id && rij.message_id === bericht.envelope?.messageId) geldig.push(bericht.uid)
          }
          if (geldig.length > 0) await client.messageDelete({ uid: geldig.join(',') })
          const gelukt: string[] = []
          for (const r of groep) {
            const ok = geldig.includes(Number(r.uid))
            resultaten.push({ id: r.id, ok, imap: ok ? 'verwijderd' : 'overgeslagen' })
            if (ok) gelukt.push(r.id)
          }
          // Meteen wegschrijven: het bericht is nu écht weg op de server.
          await schrijfDbMutatie('purge', gelukt, user_id, null)
        } else {
          await client.messageMove({ uid: uids.join(',') }, doelPad as string)
          for (const r of groep) resultaten.push({ id: r.id, ok: true, imap: 'verplaatst' })
          // Direct na de move wegschrijven, niet aan het eind. Faalt de
          // logout daarna, dan klopt de administratie nog steeds en wijst
          // geen bewaarde uid meer naar een verplaatst bericht.
          await schrijfDbMutatie(actie, groep.map((r) => r.id), user_id, doelPad)
        }
      } catch (groepFout) {
        const melding = groepFout instanceof Error ? groepFout.message : 'onbekend'
        console.error('[email-imap-action] groep mislukt:', bronPad, melding)
        for (const r of groep) resultaten.push({ id: r.id, ok: false, imap: 'mislukt', error: melding })
      }
    }

    // Logout mag de al geslaagde mutaties niet meer omver kunnen halen:
    // die staan hierboven al in de database.
    try { await client.logout() } catch { /* verbinding al dicht */ }
    client = null

    if (actie !== 'purge' && zonderUid.length > 0) {
      await schrijfDbMutatie(actie, zonderUid.map((r) => r.id), user_id, null)
      for (const r of zonderUid) resultaten.push({ id: r.id, ok: true, imap: 'overgeslagen' })
    }

    return res.status(200).json({
      resultaten,
      geslaagd: resultaten.filter((r) => r.ok).length,
      mislukt: resultaten.filter((r) => !r.ok).length,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Actie mislukt'
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[email-imap-action] Fatal error:', error)
    return res.status(500).json({ error: msg })
  } finally {
    if (client) {
      try { await client.logout() } catch { /* ignore */ }
    }
  }
}

/**
 * Na een MOVE is de oude uid dood. imap_folder en uid moeten mee, anders wijst
 * een volgende actie op dezelfde rij naar een uid die inmiddels hergebruikt is
 * — en dat kan een compleet ander bericht zijn. Zonder uidMap zetten we uid op
 * null, zodat de volgende actie netjes degradeert naar alleen-DB.
 */
async function schrijfDbMutatie(
  action: Actie,
  ids: string[],
  user_id: string,
  nieuwPad: string | null,
): Promise<void> {
  if (ids.length === 0) return
  for (let i = 0; i < ids.length; i += 100) {
    const blok = ids.slice(i, i + 100)
    if (action === 'purge') {
      await supabaseAdmin.from('emails').delete().eq('user_id', user_id).in('id', blok)
      continue
    }
    const patch: Record<string, unknown> = action === 'archive'
      ? { map: 'archief' }
      : { map: 'prullenbak', labels: ['prullenbak'] }
    if (nieuwPad) {
      patch.imap_folder = nieuwPad
      patch.uid = null
    }
    await supabaseAdmin.from('emails').update(patch).eq('user_id', user_id).in('id', blok)
  }
}
