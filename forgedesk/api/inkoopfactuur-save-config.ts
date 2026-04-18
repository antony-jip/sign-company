import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createCipheriv, randomBytes, createHash } from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const ENCRYPTION_KEY = process.env.INKOOPFACTUUR_ENCRYPTION_KEY || ''

function encrypt(plaintext: string): string {
  const key = createHash('sha256').update(ENCRYPTION_KEY).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
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

    if (!ENCRYPTION_KEY) {
      return res.status(500).json({
        error: 'INKOOPFACTUUR_ENCRYPTION_KEY niet geconfigureerd.',
      })
    }

    const { imap_host, imap_port, imap_user, password_plaintext, gmail_label, actief } = req.body as {
      imap_host: string
      imap_port: number
      imap_user: string
      password_plaintext: string
      gmail_label: string
      actief: boolean
    }

    if (!imap_user) {
      return res.status(400).json({ error: 'imap_user is verplicht' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organisatie_id')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.organisatie_id) {
      return res.status(403).json({ error: 'Geen organisatie gevonden' })
    }

    const isNewPassword = password_plaintext && password_plaintext !== 'UNCHANGED'

    if (isNewPassword) {
      const { data: existing } = await supabase
        .from('inkoopfactuur_inbox_config')
        .select('id')
        .eq('organisatie_id', profile.organisatie_id)
        .maybeSingle()

      if (!existing && !password_plaintext) {
        return res.status(400).json({ error: 'Wachtwoord is verplicht voor nieuwe configuratie' })
      }
    }

    const upsertData: Record<string, unknown> = {
      organisatie_id: profile.organisatie_id,
      imap_host: imap_host || 'imap.gmail.com',
      imap_port: imap_port || 993,
      imap_user,
      gmail_label: gmail_label || 'INBOX',
      actief: actief ?? true,
      updated_at: new Date().toISOString(),
    }

    if (isNewPassword) {
      upsertData.imap_password_encrypted = encrypt(password_plaintext)
    }

    const { data: config, error: upsertError } = await supabase
      .from('inkoopfactuur_inbox_config')
      .upsert(upsertData, { onConflict: 'organisatie_id' })
      .select('id, organisatie_id, imap_host, imap_port, imap_user, gmail_label, actief, laatst_gecheckt_op, laatste_uid, laatste_error, created_at, updated_at')
      .single()

    if (upsertError) throw upsertError

    const overlapRes = await supabase
      .from('user_email_settings')
      .select('id')
      .eq('gmail_address', imap_user)
      .limit(1)

    return res.status(200).json({
      config,
      overlap_warning: (overlapRes.data?.length ?? 0) > 0,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    return res.status(500).json({ error: message })
  }
}
