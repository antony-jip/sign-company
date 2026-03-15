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

function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)
    const { project_id } = req.body as { project_id: string }

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is verplicht' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    // Verify user owns this project
    const { data: project } = await supabaseAdmin
      .from('projecten')
      .select('id')
      .eq('id', project_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!project) {
      return res.status(403).json({ error: 'Geen toegang tot dit project' })
    }

    // Check of er al een actief portaal bestaat voor dit project
    const { data: bestaand } = await supabaseAdmin
      .from('project_portalen')
      .select('id, token, actief, verloopt_op')
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .eq('actief', true)
      .maybeSingle()

    if (bestaand && new Date(bestaand.verloopt_op) > new Date()) {
      return res.status(200).json({ portaal: bestaand, hergebruikt: true })
    }

    // Maak nieuw portaal aan
    const token = generateToken()
    const verlooptOp = new Date()
    verlooptOp.setDate(verlooptOp.getDate() + 30)

    // Haal portaal instellingen op voor instructietekst
    const { data: appSettings } = await supabaseAdmin
      .from('app_settings')
      .select('portaal_instellingen')
      .eq('user_id', userId)
      .maybeSingle()

    const instellingen = appSettings?.portaal_instellingen || {}

    const { data: portaal, error } = await supabaseAdmin
      .from('project_portalen')
      .insert({
        user_id: userId,
        project_id,
        token,
        actief: true,
        verloopt_op: verlooptOp.toISOString(),
        instructie_tekst: instellingen.standaard_instructie_tekst || '',
      })
      .select()
      .single()

    if (error) {
      console.error('portaal-create error:', error)
      return res.status(500).json({ error: 'Kon portaal niet aanmaken' })
    }

    return res.status(201).json({ portaal, hergebruikt: false })
  } catch (error) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('portaal-create error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het aanmaken van het portaal' })
  }
}
