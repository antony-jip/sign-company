import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { encrypt } from './send-email'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

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
    const { gmail_address, app_password, smtp_host, smtp_port, imap_host, imap_port } = req.body

    if (!gmail_address || !app_password) {
      return res.status(400).json({ error: 'Email adres en app wachtwoord zijn verplicht' })
    }

    const encryptedPassword = encrypt(app_password)

    const { error } = await supabase
      .from('user_email_settings')
      .upsert({
        user_id: userId,
        gmail_address,
        encrypted_app_password: encryptedPassword,
        smtp_host: smtp_host || 'smtp.gmail.com',
        smtp_port: smtp_port || 587,
        imap_host: imap_host || 'imap.gmail.com',
        imap_port: imap_port || 993,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) {
      return res.status(500).json({ error: 'Kon email instellingen niet opslaan' })
    }

    return res.status(200).json({ success: true, message: 'Email instellingen opgeslagen' })
  } catch (error: unknown) {
    console.error('Email settings fout:', error)
    const msg = error instanceof Error ? error.message : 'Fout bij opslaan'
    return res.status(500).json({ error: msg })
  }
}
