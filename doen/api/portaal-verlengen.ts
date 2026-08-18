import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { portaal_id } = req.body as { portaal_id: string }

    if (!portaal_id) {
      return res.status(400).json({ error: 'portaal_id is verplicht' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    // Haal huidig portaal op en controleer eigenaarschap
    const { data: portaal, error: fetchError } = await supabaseAdmin
      .from('project_portalen')
      .select('id, verloopt_op, user_id')
      .eq('id', portaal_id)
      .single()

    if (fetchError || !portaal) {
      return res.status(404).json({ error: 'Portaal niet gevonden' })
    }

    if (portaal.user_id !== userId) {
      return res.status(403).json({ error: 'Geen toegang tot dit portaal' })
    }

    // Verleng met 30 dagen vanaf nu (of vanaf verloopt_op als dat in de toekomst is)
    const huidigeVervaldatum = new Date(portaal.verloopt_op)
    const nu = new Date()
    const startDatum = huidigeVervaldatum > nu ? huidigeVervaldatum : nu
    startDatum.setDate(startDatum.getDate() + 30)

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('project_portalen')
      .update({
        verloopt_op: startDatum.toISOString(),
        actief: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portaal_id)
      .select()
      .single()

    if (updateError) {
      console.error('portaal-verlengen error:', updateError)
      return res.status(500).json({ error: 'Kon portaal niet verlengen' })
    }

    return res.status(200).json({ portaal: updated })
  } catch (error) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('portaal-verlengen error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het verlengen van het portaal' })
  }
}
