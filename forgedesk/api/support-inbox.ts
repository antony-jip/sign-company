import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Service-role client — RLS-bypass, admin-toegang server-side afgedwongen.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Support wordt door één persoon beheerd: deze auth-user (niet de hele org).
const ADMIN_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
// Org van de support-beheerder — alleen om de eigen org uit de klant-lijst te filteren.
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

// Admin-gate: alleen de support-beheerder (één specifieke user) mag verder.
async function assertAdmin(userId: string): Promise<void> {
  if (userId !== ADMIN_USER_ID) {
    throw new Error('Geen toegang')
  }
}

// Notificeer alleen de eigenaar van de klant-org — één melding per bericht, geen org-spam.
async function notifyOrg(orgId: string, tekst: string): Promise<void> {
  const { data: org } = await supabaseAdmin
    .from('organisaties')
    .select('eigenaar_id')
    .eq('id', orgId)
    .maybeSingle()
  const ownerId = (org?.eigenaar_id as string | null) ?? null
  if (!ownerId) return
  const preview = tekst.length > 140 ? tekst.slice(0, 137) + '…' : tekst
  await supabaseAdmin.from('notificaties').insert({
    user_id: ownerId,
    organisatie_id: orgId,
    type: 'algemeen',
    titel: 'Nieuw bericht van doen. support',
    bericht: preview,
    link: '/',
    gelezen: false,
  })
}

async function getOrgNaam(orgId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('organisaties').select('naam').eq('id', orgId).maybeSingle()
  return (data?.naam as string | null) || 'Onbekend'
}

// Pak het open gesprek van een org, of maak er één aan.
async function findOrCreateGesprek(orgId: string): Promise<string> {
  const { data: bestaand } = await supabaseAdmin
    .from('support_gesprekken')
    .select('id')
    .eq('organisatie_id', orgId)
    .eq('status', 'open')
    .order('laatste_bericht_op', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (bestaand?.id) return bestaand.id as string

  const orgNaam = await getOrgNaam(orgId)
  const { data: nieuw, error } = await supabaseAdmin
    .from('support_gesprekken')
    .insert({ organisatie_id: orgId, org_naam: orgNaam })
    .select('id')
    .single()
  if (error || !nieuw) throw new Error('Gesprek aanmaken mislukt')
  return nieuw.id as string
}

// Plaats een admin-bericht, bump het gesprek en notificeer de org.
async function plaatsAdminBericht(gesprekId: string, orgId: string, userId: string, tekst: string) {
  const nu = new Date().toISOString()
  const { data: nieuwBericht, error } = await supabaseAdmin
    .from('support_berichten')
    .insert({ gesprek_id: gesprekId, afzender: 'admin', bericht: tekst, medewerker_id: userId })
    .select('*')
    .single()
  if (error || !nieuwBericht) throw new Error('Bericht opslaan mislukt')

  await supabaseAdmin
    .from('support_gesprekken')
    .update({ laatste_bericht_op: nu, status: 'open' })
    .eq('id', gesprekId)

  await notifyOrg(orgId, tekst)
  return nieuwBericht
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const userId = await verifyUser(req)
    await assertAdmin(userId)

    // ── GET: accounts-overzicht, thread van één gesprek, of de inbox-lijst ──
    if (req.method === 'GET') {
      // Alle klant-organisaties (voor het account-overzicht).
      if (req.query.accounts) {
        const { data: orgs, error } = await supabaseAdmin
          .from('organisaties')
          .select('id, naam')
          .neq('id', ADMIN_ORG_ID)
          .order('naam', { ascending: true })
        if (error) throw new Error('Accounts ophalen mislukt')
        return res.status(200).json({ accounts: orgs || [] })
      }

      const gesprekId = (req.query.gesprek_id as string | undefined)?.trim()

      // Eén gesprek → volledige thread.
      if (gesprekId) {
        const { data: gesprek, error: gesprekError } = await supabaseAdmin
          .from('support_gesprekken')
          .select('*')
          .eq('id', gesprekId)
          .maybeSingle()
        if (gesprekError) throw new Error('Gesprek ophalen mislukt')
        if (!gesprek) return res.status(404).json({ error: 'Gesprek niet gevonden' })

        const { data: berichten, error: berichtenError } = await supabaseAdmin
          .from('support_berichten')
          .select('*')
          .eq('gesprek_id', gesprekId)
          .order('aangemaakt_op', { ascending: true })
        if (berichtenError) throw new Error('Berichten ophalen mislukt')

        return res.status(200).json({ gesprek, berichten: berichten || [] })
      }

      // Lijst → alle gesprekken, nieuwste activiteit eerst, met laatste-bericht-preview.
      const { data: gesprekken, error: lijstError } = await supabaseAdmin
        .from('support_gesprekken')
        .select('*')
        .order('laatste_bericht_op', { ascending: false })
      if (lijstError) throw new Error('Inbox ophalen mislukt')

      const ids = (gesprekken || []).map(g => g.id)
      let laatstePerGesprek: Record<string, { bericht: string; afzender: string; aangemaakt_op: string }> = {}

      if (ids.length > 0) {
        const { data: berichten } = await supabaseAdmin
          .from('support_berichten')
          .select('gesprek_id, bericht, afzender, aangemaakt_op')
          .in('gesprek_id', ids)
          .order('aangemaakt_op', { ascending: false })

        // Eerste hit per gesprek = laatste bericht (gesorteerd desc).
        for (const b of berichten || []) {
          if (!laatstePerGesprek[b.gesprek_id]) {
            laatstePerGesprek[b.gesprek_id] = {
              bericht: b.bericht,
              afzender: b.afzender,
              aangemaakt_op: b.aangemaakt_op,
            }
          }
        }
      }

      const resultaat = (gesprekken || []).map(g => ({
        ...g,
        laatste_bericht: laatstePerGesprek[g.id] || null,
      }))

      return res.status(200).json({ gesprekken: resultaat })
    }

    // ── POST: antwoord, update naar één account, broadcast, of status ──
    if (req.method === 'POST') {
      const { gesprek_id, organisatie_id, bericht, status, broadcast } = req.body as {
        gesprek_id?: string; organisatie_id?: string; bericht?: string; status?: string; broadcast?: boolean
      }

      // Status-update (afronden / heropenen) — geen bericht vereist.
      if (status !== undefined) {
        if (!gesprek_id) return res.status(400).json({ error: 'gesprek_id ontbreekt' })
        if (status !== 'open' && status !== 'afgerond') {
          return res.status(400).json({ error: 'Ongeldige status' })
        }
        const { data: bijgewerkt, error: statusError } = await supabaseAdmin
          .from('support_gesprekken')
          .update({ status })
          .eq('id', gesprek_id)
          .select('*')
          .single()
        if (statusError || !bijgewerkt) throw new Error('Status bijwerken mislukt')
        return res.status(200).json({ gesprek: bijgewerkt })
      }

      const tekst = (bericht || '').trim()
      if (!tekst) return res.status(400).json({ error: 'Bericht is leeg' })
      if (tekst.length > 5000) return res.status(400).json({ error: 'Bericht is te lang' })

      // Broadcast naar alle klant-organisaties.
      if (broadcast) {
        const { data: orgs } = await supabaseAdmin
          .from('organisaties')
          .select('id')
          .neq('id', ADMIN_ORG_ID)
        let verstuurd = 0
        for (const o of orgs || []) {
          try {
            const gid = await findOrCreateGesprek(o.id as string)
            await plaatsAdminBericht(gid, o.id as string, userId, tekst)
            verstuurd++
          } catch (e) {
            console.error('[support-inbox] broadcast org', o.id, (e as Error).message)
          }
        }
        return res.status(200).json({ verstuurd })
      }

      // Update naar één account (nieuw of bestaand gesprek).
      if (organisatie_id) {
        const gid = await findOrCreateGesprek(organisatie_id)
        const nieuwBericht = await plaatsAdminBericht(gid, organisatie_id, userId, tekst)
        return res.status(200).json({ gesprek_id: gid, bericht: nieuwBericht })
      }

      // Antwoord op bestaand gesprek.
      if (gesprek_id) {
        const { data: gesprek } = await supabaseAdmin
          .from('support_gesprekken')
          .select('id, organisatie_id')
          .eq('id', gesprek_id)
          .maybeSingle()
        if (!gesprek) return res.status(404).json({ error: 'Gesprek niet gevonden' })
        const nieuwBericht = await plaatsAdminBericht(gesprek_id, gesprek.organisatie_id as string, userId, tekst)
        return res.status(200).json({ bericht: nieuwBericht })
      }

      return res.status(400).json({ error: 'gesprek_id, organisatie_id of broadcast vereist' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    const message = (err as Error).message
    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }
    if (message === 'Geen toegang') {
      return res.status(403).json({ error: message })
    }
    console.error('[support-inbox]', message)
    return res.status(500).json({ error: message || 'Interne fout' })
  }
}
