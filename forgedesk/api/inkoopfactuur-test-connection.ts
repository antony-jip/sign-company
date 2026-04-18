import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createDecipheriv, createHash } from 'crypto'
import { ImapFlow } from 'imapflow'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ENCRYPTION_KEY = process.env.INKOOPFACTUUR_ENCRYPTION_KEY || ''

function decrypt(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const key = createHash('sha256').update(ENCRYPTION_KEY).digest()
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const { imap_host, imap_port, imap_user, imap_password, gmail_label, use_stored } = req.body as {
      imap_host: string
      imap_port: number
      imap_user: string
      imap_password?: string
      gmail_label: string
      use_stored?: boolean
    }

    let password = imap_password || ''

    if (!password && use_stored) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organisatie_id')
        .eq('id', userId)
        .maybeSingle()

      if (!profile?.organisatie_id) {
        return res.status(403).json({ success: false, error: 'Geen organisatie gevonden' })
      }

      const { data: config } = await supabase
        .from('inkoopfactuur_inbox_config')
        .select('imap_password_encrypted')
        .eq('organisatie_id', profile.organisatie_id)
        .maybeSingle()

      if (!config?.imap_password_encrypted || !ENCRYPTION_KEY) {
        return res.status(200).json({ success: false, error: 'Geen opgeslagen wachtwoord gevonden' })
      }

      password = decrypt(config.imap_password_encrypted)
    }

    if (!imap_user || !password) {
      return res.status(200).json({ success: false, error: 'Email en wachtwoord zijn verplicht' })
    }

    const client = new ImapFlow({
      host: imap_host || 'imap.gmail.com',
      port: imap_port || 993,
      secure: (imap_port || 993) === 993,
      auth: { user: imap_user, pass: password },
      logger: false,
      emitLogs: false,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    })

    try {
      await client.connect()

      let labelGevonden = false
      if (gmail_label) {
        try {
          const mailbox = await client.mailboxOpen(gmail_label, { readOnly: true })
          labelGevonden = !!mailbox
          await client.mailboxClose()
        } catch {
          labelGevonden = false
        }
      }

      return res.status(200).json({
        success: true,
        label_gevonden: labelGevonden,
      })
    } finally {
      try { await client.logout() } catch { /* cleanup best-effort */ }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    return res.status(200).json({
      success: false,
      error: message.includes('AUTHENTICATIONFAILED')
        ? 'Inloggen mislukt. Controleer email en app-wachtwoord.'
        : message,
    })
  }
}
