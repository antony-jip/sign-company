import type { VercelRequest, VercelResponse } from '@vercel/node'
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

export const config = { maxDuration: 10 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { opvolging_id } = req.body as { opvolging_id: string }

    if (!opvolging_id) {
      return res.status(400).json({ error: 'opvolging_id is verplicht' })
    }

    // Verifieer dat de opvolging van deze user is en status 'wachtend'
    const { data: opvolging, error: fetchError } = await supabaseAdmin
      .from('email_opvolgingen')
      .select('id, status, user_id')
      .eq('id', opvolging_id)
      .single()

    if (fetchError || !opvolging) {
      return res.status(404).json({ error: 'Opvolging niet gevonden' })
    }

    if (opvolging.user_id !== userId) {
      return res.status(403).json({ error: 'Geen toegang tot deze opvolging' })
    }

    if (opvolging.status !== 'wachtend') {
      return res.status(400).json({ error: `Opvolging kan niet geannuleerd worden (status: ${opvolging.status})` })
    }

    // Update status naar 'geannuleerd'
    // De Trigger.dev task checkt na het wachten of status nog 'wachtend' is.
    // Als status = 'geannuleerd', stopt de task zonder iets te doen.
    const { error: updateError } = await supabaseAdmin
      .from('email_opvolgingen')
      .update({ status: 'geannuleerd' })
      .eq('id', opvolging_id)

    if (updateError) {
      return res.status(500).json({ error: 'Annuleren mislukt' })
    }

    return res.status(200).json({ success: true, message: 'Opvolging geannuleerd' })
  } catch (error: unknown) {
    const msg = (error as Error).message
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[annuleer-opvolging] Error:', error)
    return res.status(500).json({ error: 'Annuleren mislukt' })
  }
}
