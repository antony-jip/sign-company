import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Service-role client — RLS-bypass, schrijven gebeurt server-side gecontroleerd.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Klantberichten notificeren alleen deze ene support-beheerder (niet de hele org).
const ADMIN_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const ADMIN_ORG_ID = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'

// ── Auth helper (inline; Vercel bundelt geen api/_helpers/ imports) ──
async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// ── Org + naam ophalen voor de ingelogde user (inline) ──
async function resolveOrg(userId: string): Promise<{ organisatieId: string; orgNaam: string }> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('organisatie_id')
    .eq('id', userId)
    .maybeSingle()

  const organisatieId = (profile?.organisatie_id as string | null) ?? null
  if (!organisatieId) throw new Error('Geen organisatie gekoppeld')

  const { data: org } = await supabaseAdmin
    .from('organisaties')
    .select('naam')
    .eq('id', organisatieId)
    .maybeSingle()

  return { organisatieId, orgNaam: (org?.naam as string | null) || 'Onbekend' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await verifyUser(req)

    const { bericht } = req.body as { bericht?: string }
    const tekst = (bericht || '').trim()
    if (!tekst) return res.status(400).json({ error: 'Bericht is leeg' })
    if (tekst.length > 5000) return res.status(400).json({ error: 'Bericht is te lang' })

    const { organisatieId, orgNaam } = await resolveOrg(userId)

    // Bestaand open gesprek hergebruiken, anders aanmaken.
    const { data: bestaand } = await supabaseAdmin
      .from('support_gesprekken')
      .select('id')
      .eq('organisatie_id', organisatieId)
      .eq('status', 'open')
      .order('laatste_bericht_op', { ascending: false })
      .limit(1)
      .maybeSingle()

    let gesprekId = bestaand?.id as string | undefined

    if (!gesprekId) {
      const { data: nieuw, error: gesprekError } = await supabaseAdmin
        .from('support_gesprekken')
        .insert({ organisatie_id: organisatieId, org_naam: orgNaam })
        .select('id')
        .single()
      if (gesprekError || !nieuw) throw new Error('Gesprek aanmaken mislukt')
      gesprekId = nieuw.id as string
    }

    const nu = new Date().toISOString()

    const { data: nieuwBericht, error: berichtError } = await supabaseAdmin
      .from('support_berichten')
      .insert({ gesprek_id: gesprekId, afzender: 'klant', bericht: tekst })
      .select('*')
      .single()
    if (berichtError || !nieuwBericht) throw new Error('Bericht opslaan mislukt')

    // Gesprek terug op 'open' zetten + laatste_bericht_op bijwerken.
    await supabaseAdmin
      .from('support_gesprekken')
      .update({ laatste_bericht_op: nu, status: 'open' })
      .eq('id', gesprekId)

    // Melding alleen naar de support-beheerder (belletje + bulletje), niet de hele org.
    try {
      await supabaseAdmin.from('notificaties').insert({
        user_id: ADMIN_USER_ID,
        organisatie_id: ADMIN_ORG_ID,
        type: 'algemeen',
        titel: `Support — ${orgNaam}`,
        bericht: tekst.length > 140 ? tekst.slice(0, 137) + '…' : tekst,
        link: '/support',
        gelezen: false,
      })
    } catch (notifyErr) {
      console.error('[support-bericht] notify', (notifyErr as Error).message)
    }

    return res.status(200).json({ gesprek_id: gesprekId, bericht: nieuwBericht })
  } catch (err) {
    const message = (err as Error).message
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    console.error('[support-bericht]', message)
    return res.status(500).json({ error: message || 'Interne fout' })
  }
}
