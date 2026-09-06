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
async function herstelSyncStatus(userId: string): Promise<void> {
  const nu = new Date().toISOString()
  try {
    const { error: stateErr } = await supabaseAdmin
      .from('email_sync_state')
      .update({ status: 'ok', laatste_fout: null, laatste_fout_op: null })
      .eq('user_id', userId)
    if (stateErr) console.warn('[email-settings] sync-status herstellen mislukt:', stateErr.message)

    // Eén 'mislukt'-taak terugzetten: de partiele unieke index laat maar één
    // open taak per mailbox toe, dus niet blind alle rijen tegelijk.
    const { data: mislukt } = await supabaseAdmin
      .from('mailsync_taken')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'mislukt')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET: haal opgeslagen email instellingen op.
  // Het wachtwoord verlaat de server NOOIT (voorheen werd het ontsleuteld
  // teruggegeven); we exposen alleen has_password zodat de UI de status kan tonen.
  if (req.method === 'GET') {
    try {
      const userId = await verifyUser(req)
      const { data, error } = await supabaseAdmin
        .from('user_email_settings')
        // is_verified stond hier ooit bij, maar die kolom bestaat niet in de
        // database (migratie 004 is nooit gedraaid) en niets schreef hem ooit.
        // De select faalde daardoor volledig, waarna deze GET een 401 gaf en de
        // instellingenpagina terugviel op localStorage.
        .select('gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port, auth_type, oauth_refresh_token_enc')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return res.status(404).json({ error: 'Geen email instellingen gevonden' })
      }

      return res.status(200).json({
        gmail_address: data.gmail_address,
        has_password: !!data.encrypted_app_password,
        // De tokens zelf verlaten de server nooit, net zomin als het
        // wachtwoord; de UI hoeft alleen te weten dát er een koppeling is.
        auth_type: data.auth_type || 'wachtwoord',
        has_oauth: !!data.oauth_refresh_token_enc,
        smtp_host: data.smtp_host || 'smtp.gmail.com',
        smtp_port: data.smtp_port || 587,
        imap_host: data.imap_host || 'imap.gmail.com',
        imap_port: data.imap_port || 993,
      })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Fout bij ophalen'
      return res.status(401).json({ error: msg })
    }
  }

  // DELETE: verwijder email instellingen
  if (req.method === 'DELETE') {
    try {
      const userId = await verifyUser(req)
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

    if (!gmail_address) {
      return res.status(400).json({ error: 'Email adres is verplicht' })
    }

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
      // Geen nieuw wachtwoord: vereist dat er al één is opgeslagen, of een
      // OAuth-koppeling die het wachtwoord vervangt.
      const { data: bestaand } = await supabaseAdmin
        .from('user_email_settings')
        .select('encrypted_app_password, auth_type, oauth_refresh_token_enc')
        .eq('user_id', userId)
        .maybeSingle()
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
      const { error } = await supabaseAdmin
        .from('user_email_settings')
        .update(heeftOauth
          ? { updated_at: basisVelden.updated_at, ...(gevraagdAuthType ? { auth_type: gevraagdAuthType } : {}) }
          : { ...basisVelden, ...(gevraagdAuthType ? { auth_type: gevraagdAuthType } : {}) })
        .eq('user_id', userId)
      if (error) {
        console.error('Supabase update fout:', JSON.stringify(error))
        return res.status(500).json({ error: `Kon email instellingen niet opslaan: ${error.message || error.code || JSON.stringify(error)}` })
      }
      await herstelSyncStatus(userId)
      return res.status(200).json({ success: true, message: 'Email instellingen opgeslagen' })
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

    const { error } = await supabaseAdmin
      .from('user_email_settings')
      .upsert({
        ...basisVelden,
        encrypted_app_password: encryptedPassword,
        // Een app-wachtwoord opslaan is het einde van een OAuth-koppeling,
        // welk auth_type het formulier ook meestuurt: laat je de tokens staan,
        // dan kan een leespad stilletjes op de oude koppeling terugvallen.
        auth_type: 'wachtwoord',
        oauth_refresh_token_enc: null,
        oauth_access_token_enc: null,
        oauth_token_verloopt_op: null,
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('Supabase upsert fout:', JSON.stringify(error))
      return res.status(500).json({ error: `Kon email instellingen niet opslaan: ${error.message || error.code || JSON.stringify(error)}` })
    }

    await herstelSyncStatus(userId)
    return res.status(200).json({ success: true, message: 'Email instellingen opgeslagen' })
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
