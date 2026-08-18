import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface Actie {
  user_id?: string
  email_handtekening?: string
  handtekening_afbeelding?: string
}

/**
 * Zet de e-mailhandtekening van collega's. Handtekeningen staan op `profiles`,
 * en de RLS daar staat alleen toe dat je je eigen rij wijzigt. Een admin die
 * dit voor het team doet moet dus via de server, met een expliciete controle
 * dat hij admin is en dat het doelprofiel in dezelfde organisatie zit.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Niet ingelogd' })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Niet ingelogd' })

    const { data: aanvrager } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, rol')
      .eq('id', user.id)
      .maybeSingle()

    if (!aanvrager?.organisatie_id) return res.status(403).json({ error: 'Geen organisatie' })
    if (aanvrager.rol !== 'admin') {
      return res.status(403).json({ error: 'Alleen een beheerder kan handtekeningen van het team instellen' })
    }

    const acties = (req.body as { acties?: Actie[] })?.acties
    if (!Array.isArray(acties) || acties.length === 0) {
      return res.status(400).json({ error: 'Geen handtekeningen ontvangen' })
    }
    if (acties.length > 200) {
      return res.status(400).json({ error: 'Te veel teamleden in één keer' })
    }

    const doelIds = acties.map((a) => a.user_id).filter((id): id is string => !!id)
    if (doelIds.length === 0) {
      return res.status(400).json({ error: 'Teamleden zonder gekoppeld account kunnen geen handtekening krijgen' })
    }

    // Alleen profielen binnen de eigen organisatie mogen geraakt worden.
    const { data: toegestaan, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('organisatie_id', aanvrager.organisatie_id)
      .in('id', doelIds)

    if (lookupError) {
      console.error('[team-handtekening] profielen ophalen mislukt:', lookupError)
      return res.status(500).json({ error: 'Kon teamleden niet controleren' })
    }

    const toegestaneIds = new Set((toegestaan || []).map((p) => p.id))
    const geweigerd = doelIds.filter((id) => !toegestaneIds.has(id))
    if (geweigerd.length > 0) {
      console.warn(`[team-handtekening] ${geweigerd.length} profiel(en) buiten org ${aanvrager.organisatie_id} geweigerd`)
    }

    let bijgewerkt = 0
    for (const actie of acties) {
      if (!actie.user_id || !toegestaneIds.has(actie.user_id)) continue
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          email_handtekening: actie.email_handtekening ?? '',
          handtekening_afbeelding: actie.handtekening_afbeelding ?? '',
        })
        .eq('id', actie.user_id)
      if (error) {
        console.error(`[team-handtekening] opslaan mislukt voor ${actie.user_id}:`, error)
        return res.status(500).json({ error: 'Kon handtekening niet opslaan', bijgewerkt })
      }
      bijgewerkt += 1
    }

    return res.status(200).json({ bijgewerkt, overgeslagen: acties.length - bijgewerkt })
  } catch (error: unknown) {
    console.error('[team-handtekening] fout:', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Kon handtekeningen niet opslaan' })
  }
}
