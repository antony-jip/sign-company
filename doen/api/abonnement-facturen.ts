import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// De facturen van het eigen abonnement, met een tijdelijke downloadlink per
// PDF. De bucket is privé, dus de link wordt hier per aanvraag ondertekend.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Niet ingelogd' })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Niet ingelogd' })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id')
      .eq('id', user.id)
      .maybeSingle()

    const organisatieId = profile?.organisatie_id
    if (!organisatieId) return res.status(200).json({ facturen: [] })

    const { data: facturen, error } = await supabaseAdmin
      .from('abonnement_facturen')
      .select('id, nummer, datum, bedrag_excl, btw_bedrag, bedrag_incl, periode_start, periode_eind, pdf_pad')
      .eq('organisatie_id', organisatieId)
      .order('datum', { ascending: false })
      .limit(36)

    if (error) {
      console.error('[abonnement-facturen] ophalen mislukt:', error)
      return res.status(500).json({ error: 'Kon facturen niet ophalen' })
    }

    const metLinks = await Promise.all((facturen || []).map(async (f) => {
      let url: string | null = null
      if (f.pdf_pad) {
        const { data } = await supabaseAdmin.storage
          .from('abonnement-facturen')
          .createSignedUrl(f.pdf_pad, 60 * 10)
        url = data?.signedUrl ?? null
      }
      return {
        id: f.id,
        nummer: f.nummer,
        datum: f.datum,
        bedrag_excl: f.bedrag_excl,
        btw_bedrag: f.btw_bedrag,
        bedrag_incl: f.bedrag_incl,
        periode_start: f.periode_start,
        periode_eind: f.periode_eind,
        pdf_url: url,
      }
    }))

    return res.status(200).json({ facturen: metLinks })
  } catch (error: unknown) {
    console.error('[abonnement-facturen] fout:', error instanceof Error ? error.message : error)
    return res.status(500).json({ error: 'Kon facturen niet ophalen' })
  }
}
