import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export const config = { maxDuration: 15 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const portaalToken = req.query.token as string
    const factuurId = req.query.factuur_id as string
    const betaalToken = req.query.betaal_token as string

    // Twee paden: ofwel portaal token + factuur_id, ofwel betaal_token
    let factuur: Record<string, unknown> | null = null
    let userId: string | null = null

    if (betaalToken) {
      // Via betaal-token: zoek factuur direct
      const { data } = await supabaseAdmin
        .from('facturen')
        .select('*')
        .eq('betaal_token', betaalToken)
        .maybeSingle()
      factuur = data
      userId = factuur?.user_id as string || null
    } else if (portaalToken && factuurId) {
      // Via portaal token + factuur_id
      const { data: portaal } = await supabaseAdmin
        .from('project_portalen')
        .select('id, user_id, project_id, actief')
        .eq('token', portaalToken)
        .eq('actief', true)
        .maybeSingle()

      if (!portaal) {
        return res.status(404).json({ error: 'Portaal niet gevonden of verlopen' })
      }
      userId = portaal.user_id

      const { data } = await supabaseAdmin
        .from('facturen')
        .select('*')
        .eq('id', factuurId)
        .maybeSingle()
      factuur = data
    } else {
      return res.status(400).json({ error: 'token+factuur_id of betaal_token is verplicht' })
    }

    if (!factuur) {
      return res.status(404).json({ error: 'Factuur niet gevonden' })
    }
    if (!userId) userId = factuur.user_id as string

    const factuurDbId = factuur.id as string

    // Factuur items
    const { data: factuurItems } = await supabaseAdmin
      .from('factuur_items')
      .select('*')
      .eq('factuur_id', factuurDbId)
      .order('volgorde', { ascending: true })

    // Bedrijfsprofiel
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, bedrijfs_adres, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website, kvk_nummer, btw_nummer, iban, logo_url')
      .eq('id', userId)
      .maybeSingle()

    // Klant
    const klantId = factuur.klant_id as string | null
    const { data: klant } = klantId
      ? await supabaseAdmin
          .from('klanten')
          .select('bedrijfsnaam, contactpersoon, email, adres, postcode, stad')
          .eq('id', klantId)
          .maybeSingle()
      : { data: null }

    // Document style
    const { data: docStyle } = await supabaseAdmin
      .from('document_styles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    return res.status(200).json({
      factuur,
      items: factuurItems || [],
      bedrijf: profile || null,
      klant: klant || null,
      docStyle: docStyle || null,
    })
  } catch (error: unknown) {
    console.error('factuur-portaal error:', error)
    return res.status(500).json({ error: 'Interne fout' })
  }
}
