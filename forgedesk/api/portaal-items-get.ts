import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

/**
 * Authenticated endpoint: haalt portaal items + reacties + bestanden op.
 * Gebruikt supabaseAdmin (service role) om RLS-problemen te omzeilen.
 * Auth: Bearer token (Supabase JWT) verplicht.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Verifieer JWT token
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' })
    }
    const jwt = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)
    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' })
    }

    const portaalId = req.query.portaal_id as string
    if (!portaalId) {
      return res.status(400).json({ error: 'portaal_id is verplicht' })
    }

    // Verifieer dat de user toegang heeft (eigenaar of org-lid)
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, user_id, organisatie_id')
      .eq('id', portaalId)
      .single()

    if (!portaal) {
      return res.status(404).json({ error: 'Portaal niet gevonden' })
    }

    // Check directe eigenaar OF zelfde organisatie
    let hasAccess = portaal.user_id === user.id
    if (!hasAccess && portaal.organisatie_id) {
      const { data: membership } = await supabaseAdmin
        .from('profiles')
        .select('organisatie_id')
        .eq('id', user.id)
        .single()
      hasAccess = membership?.organisatie_id === portaal.organisatie_id
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'Geen toegang tot dit portaal' })
    }

    // Haal items + bestanden + reacties op via admin (geen RLS)
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('portaal_items')
      .select('*, portaal_bestanden(*), portaal_reacties(*)')
      .eq('portaal_id', portaalId)
      .order('created_at', { ascending: false })

    if (itemsError) {
      console.error('portaal-items-get error:', itemsError)
      return res.status(500).json({ error: 'Kon items niet ophalen' })
    }

    return res.status(200).json({ items: items || [] })
  } catch (error) {
    console.error('portaal-items-get error:', error)
    return res.status(500).json({ error: 'Er ging iets mis' })
  }
}
