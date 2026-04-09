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
    const token = req.query.token as string
    const factuurId = req.query.factuur_id as string
    if (!token || !factuurId) {
      return res.status(400).json({ error: 'token en factuur_id zijn verplicht' })
    }

    // Verifieer portaal token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, user_id, project_id, actief')
      .eq('token', token)
      .eq('actief', true)
      .maybeSingle()

    if (!portaal) {
      return res.status(404).json({ error: 'Portaal niet gevonden of verlopen' })
    }

    // Controleer dat de factuur bestaat en bij dit project hoort
    const { data: factuur } = await supabaseAdmin
      .from('facturen')
      .select('*')
      .eq('id', factuurId)
      .maybeSingle()

    if (!factuur) {
      return res.status(404).json({ error: 'Factuur niet gevonden' })
    }

    // Factuur items
    const { data: factuurItems } = await supabaseAdmin
      .from('factuur_items')
      .select('*')
      .eq('factuur_id', factuurId)
      .order('volgorde', { ascending: true })

    // Bedrijfsprofiel
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, bedrijfs_adres, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website, kvk_nummer, btw_nummer, iban, logo_url')
      .eq('id', portaal.user_id)
      .maybeSingle()

    // Klant
    const { data: klant } = factuur.klant_id
      ? await supabaseAdmin
          .from('klanten')
          .select('bedrijfsnaam, contactpersoon, email, adres, postcode, stad')
          .eq('id', factuur.klant_id)
          .maybeSingle()
      : { data: null }

    // Document style
    const { data: docStyle } = await supabaseAdmin
      .from('document_styles')
      .select('*')
      .eq('user_id', portaal.user_id)
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
