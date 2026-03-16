import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const GELDIGE_ROLLEN = ['admin', 'medewerker', 'monteur'] as const

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

    const { email, rol, organisatie_id, uitgenodigd_door } = req.body as {
      email: string
      rol: string
      organisatie_id: string
      uitgenodigd_door: string
    }

    // Validatie
    if (!email || !rol || !organisatie_id || !uitgenodigd_door) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' })
    }

    if (!GELDIGE_ROLLEN.includes(rol as typeof GELDIGE_ROLLEN[number])) {
      return res.status(400).json({ error: 'Ongeldige rol' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ongeldig e-mailadres' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    // Check of email al in de organisatie zit (bestaand profiel)
    const { data: bestaandProfiel } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .eq('organisatie_id', organisatie_id)
      .maybeSingle()

    if (bestaandProfiel) {
      return res.status(409).json({ error: 'Dit e-mailadres is al lid van de organisatie' })
    }

    // Check of er al een openstaande uitnodiging is
    const { data: bestaandeUitnodiging } = await supabaseAdmin
      .from('uitnodigingen')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .eq('organisatie_id', organisatie_id)
      .eq('status', 'verstuurd')
      .maybeSingle()

    if (bestaandeUitnodiging) {
      return res.status(409).json({ error: 'Er staat al een uitnodiging open voor dit e-mailadres' })
    }

    // Check max 10 leden per organisatie (profielen + openstaande uitnodigingen)
    const { count: profielCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organisatie_id', organisatie_id)

    const { count: uitnodigingCount } = await supabaseAdmin
      .from('uitnodigingen')
      .select('id', { count: 'exact', head: true })
      .eq('organisatie_id', organisatie_id)
      .eq('status', 'verstuurd')

    const totaalLeden = (profielCount || 0) + (uitnodigingCount || 0)
    if (totaalLeden >= 10) {
      return res.status(403).json({ error: 'Maximum aantal teamleden (10) bereikt voor deze organisatie' })
    }

    // Stuur uitnodiging via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        organisatie_id,
        rol,
        uitgenodigd_door
      },
      redirectTo: `${process.env.VITE_APP_URL || 'https://forgedesk-ten.vercel.app'}/auth/welcome`
    })

    if (inviteError) {
      console.error('invite-team-member invite error:', inviteError)
      return res.status(500).json({ error: 'Kon uitnodiging niet versturen: ' + inviteError.message })
    }

    // Sla uitnodiging op in de database
    const { data: uitnodiging, error: uitnodigingError } = await supabaseAdmin
      .from('uitnodigingen')
      .insert({
        organisatie_id,
        email: email.toLowerCase(),
        rol,
        uitgenodigd_door,
        status: 'verstuurd'
      })
      .select()
      .single()

    if (uitnodigingError) {
      console.error('invite-team-member db error:', uitnodigingError)
      return res.status(500).json({ error: 'Uitnodiging verstuurd maar kon niet opgeslagen worden' })
    }

    return res.status(201).json({ uitnodiging, user: inviteData.user })
  } catch (error) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('invite-team-member error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het versturen van de uitnodiging' })
  }
}
