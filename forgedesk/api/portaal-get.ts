import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limiting: 30 per minuut per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  entry.count++
  return entry.count > 30
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const token = req.query.token as string
    if (!token) return res.status(400).json({ error: 'Token is verplicht' })

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Haal portaal op (probeer eerst project_portalen, dan tekening_goedkeuringen)
    const { data: portaal, error: portaalError } = await supabaseAdmin
      .from('project_portalen')
      .select('*')
      .eq('token', token)
      .single()

    // Fallback: check tekening_goedkeuringen voor backward-compatibiliteit
    if (portaalError || !portaal) {
      const goedkeuringResult = await handleGoedkeuringToken(supabaseAdmin, token, res)
      if (goedkeuringResult) return goedkeuringResult
      return res.status(404).json({ error: 'Portaal niet gevonden' })
    }

    // Haal portaal instellingen op (nodig voor gesloten/verlopen pagina's ook)
    const { data: appSettingsEarly } = await supabaseAdmin
      .from('app_settings')
      .select('portaal_instellingen')
      .eq('user_id', portaal.user_id)
      .maybeSingle()

    const instellingenData = appSettingsEarly?.portaal_instellingen || {}

    // Check gedeactiveerd
    if (!portaal.actief) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('bedrijfsnaam, bedrijfs_telefoon, bedrijfs_email, logo_url')
        .eq('id', portaal.user_id)
        .single()
      return res.status(200).json({
        status: 'gesloten',
        bedrijfsnaam: profile?.bedrijfsnaam || '',
        bedrijfs_telefoon: profile?.bedrijfs_telefoon || '',
        bedrijfs_email: profile?.bedrijfs_email || '',
        logo_url: profile?.logo_url || '',
        instellingen: instellingenData,
      })
    }

    // Check verlopen
    if (new Date(portaal.verloopt_op) < new Date()) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('bedrijfsnaam, bedrijfs_telefoon, bedrijfs_email, logo_url')
        .eq('id', portaal.user_id)
        .single()
      return res.status(200).json({
        status: 'verlopen',
        token: portaal.token,
        bedrijfsnaam: profile?.bedrijfsnaam || '',
        bedrijfs_telefoon: profile?.bedrijfs_telefoon || '',
        bedrijfs_email: profile?.bedrijfs_email || '',
        logo_url: profile?.logo_url || '',
        instellingen: instellingenData,
      })
    }

    // Haal project info
    const { data: project } = await supabaseAdmin
      .from('projecten')
      .select('id, naam, klant_id, status, adres, postcode, plaats')
      .eq('id', portaal.project_id)
      .single()

    // Haal bedrijfsprofiel
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, logo_url, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website')
      .eq('id', portaal.user_id)
      .single()

    // Haal document style voor primaire kleur
    const { data: docStyle } = await supabaseAdmin
      .from('document_styles')
      .select('primaire_kleur')
      .eq('user_id', portaal.user_id)
      .maybeSingle()

    // Haal items met bestanden en reacties (alleen zichtbaar voor klant)
    const { data: items } = await supabaseAdmin
      .from('portaal_items')
      .select('id, type, titel, omschrijving, label, status, bekeken_op, mollie_payment_url, bedrag, volgorde, created_at, bericht_type, bericht_tekst, foto_url, afzender, portaal_bestanden(*), portaal_reacties(*)')
      .eq('portaal_id', portaal.id)
      .eq('zichtbaar_voor_klant', true)
      .neq('bericht_type', 'notitie_intern')
      .order('created_at', { ascending: true })

    // Genereer publieke URLs voor bestanden die als storage-pad zijn opgeslagen
    const DOCUMENTEN_BUCKET = 'documenten'
    const PORTAAL_BUCKET = 'portaal-bestanden'

    function resolveFileUrl(bestand: Record<string, unknown>): Record<string, unknown> {
      const url = bestand.url as string | null
      if (!url) return bestand

      // Al een volledige URL (http/https of data:) → niet aanpassen
      if (url.startsWith('http') || url.startsWith('data:')) return bestand

      // Storage pad → genereer publieke URL
      // Admin-uploads gaan naar 'documenten' bucket (pad begint met 'portaal/')
      // Klant-uploads gaan naar 'portaal-bestanden' bucket (pad begint met 'portaal-bestanden/')
      const bucket = url.startsWith('portaal-bestanden/') ? PORTAAL_BUCKET : DOCUMENTEN_BUCKET
      const storagePath = url.startsWith('portaal-bestanden/') ? url.replace('portaal-bestanden/', '') : url

      const { data: publicUrl } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(storagePath)

      return {
        ...bestand,
        url: publicUrl.publicUrl,
        thumbnail_url: bestand.thumbnail_url === url ? publicUrl.publicUrl : bestand.thumbnail_url,
      }
    }

    function resolveStorageUrl(url: string | null | undefined): string | null {
      if (!url) return null
      if (url.startsWith('http') || url.startsWith('data:')) return url
      // Storage path → generate public URL
      const bucket = url.startsWith('portaal-bestanden/') ? PORTAAL_BUCKET : DOCUMENTEN_BUCKET
      const storagePath = url.startsWith('portaal-bestanden/') ? url.replace('portaal-bestanden/', '') : url
      const { data: publicUrl } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath)
      return publicUrl.publicUrl
    }

    const safeItems = (items || []).map((item: Record<string, unknown>) => {
      const bestanden = ((item.portaal_bestanden || []) as Record<string, unknown>[]).map(resolveFileUrl)
      return {
        id: item.id,
        type: item.type,
        titel: item.titel,
        omschrijving: item.omschrijving,
        label: item.label,
        status: item.status,
        bekeken_op: item.bekeken_op,
        mollie_payment_url: item.mollie_payment_url,
        bedrag: item.bedrag,
        volgorde: item.volgorde,
        created_at: item.created_at,
        bericht_type: item.bericht_type || 'item',
        bericht_tekst: item.bericht_tekst,
        foto_url: resolveStorageUrl(item.foto_url as string | null),
        afzender: item.afzender || 'bedrijf',
        bestanden,
        reacties: item.portaal_reacties || [],
      }
    })

    return res.status(200).json({
      status: 'actief',
      portaal: {
        id: portaal.id,
        instructie_tekst: portaal.instructie_tekst,
        verloopt_op: portaal.verloopt_op,
      },
      project: project ? {
        naam: project.naam,
        adres: project.adres,
        postcode: project.postcode,
        plaats: project.plaats,
      } : null,
      bedrijf: {
        naam: profile?.bedrijfsnaam || '',
        logo_url: profile?.logo_url || '',
        telefoon: profile?.bedrijfs_telefoon || '',
        email: profile?.bedrijfs_email || '',
        website: profile?.bedrijfs_website || '',
        primaire_kleur: docStyle?.primaire_kleur || '#1a1a1a',
      },
      instellingen: instellingenData,
      items: safeItems,
    })
  } catch (error) {
    console.error('portaal-get error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het ophalen van het portaal' })
  }
}

/**
 * Backward-compatibiliteit: synthetiseer portaal response vanuit tekening_goedkeuringen
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleGoedkeuringToken(supabase: any, token: string, res: VercelResponse) {
  const { data: gk } = await supabase
    .from('tekening_goedkeuringen')
    .select('*')
    .eq('token', token)
    .single()

  if (!gk) return null

  // Update bekeken tracking
  const trackingUpdates: Record<string, unknown> = {
    eerste_bekeken_op: gk.eerste_bekeken_op || new Date().toISOString(),
    laatst_bekeken_op: new Date().toISOString(),
    aantal_keer_bekeken: (gk.aantal_keer_bekeken || 0) + 1,
  }
  if (gk.status === 'verzonden') {
    trackingUpdates.status = 'bekeken'
  }
  await supabase
    .from('tekening_goedkeuringen')
    .update(trackingUpdates)
    .eq('id', gk.id)

  // Haal bedrijfsprofiel op
  const { data: profile } = await supabase
    .from('profiles')
    .select('bedrijfsnaam, logo_url, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website')
    .eq('id', gk.user_id)
    .single()

  const { data: docStyle } = await supabase
    .from('document_styles')
    .select('primaire_kleur')
    .eq('user_id', gk.user_id)
    .maybeSingle()

  // Haal project info
  const { data: project } = await supabase
    .from('projecten')
    .select('id, naam, klant_id, adres, postcode, plaats')
    .eq('id', gk.project_id)
    .single()

  // Bouw bestanden uit document_ids
  const bestanden = []
  if (gk.document_ids?.length) {
    const { data: docs } = await supabase
      .from('documenten')
      .select('id, naam, url, type, thumbnail_url')
      .in('id', gk.document_ids)

    for (const doc of docs || []) {
      bestanden.push({
        id: doc.id,
        naam: doc.naam,
        url: doc.url,
        type: doc.type || 'application/pdf',
        thumbnail_url: doc.thumbnail_url,
        bron: 'bedrijf',
      })
    }
  }

  // Offerte info als die er is
  let offerteBestanden: Record<string, unknown>[] = []
  if (gk.offerte_id) {
    const { data: offerte } = await supabase
      .from('offertes')
      .select('id, titel, nummer')
      .eq('id', gk.offerte_id)
      .single()

    if (offerte) {
      offerteBestanden = [{
        id: `offerte-${offerte.id}`,
        naam: `Offerte ${offerte.nummer} - ${offerte.titel}`,
        url: '', // Offerte wordt inline getoond
        type: 'offerte',
        bron: 'bedrijf',
      }]
    }
  }

  // Synthetiseer portal-achtige response
  const statusMap: Record<string, string> = {
    verzonden: 'verstuurd',
    bekeken: 'bekeken',
    goedgekeurd: 'goedgekeurd',
    revisie: 'revisie',
  }

  const items = [{
    id: gk.id,
    type: 'tekening',
    titel: gk.email_onderwerp || 'Tekening ter goedkeuring',
    omschrijving: gk.email_bericht || '',
    label: `Revisie ${gk.revisie_nummer || 1}`,
    status: statusMap[gk.status] || 'verstuurd',
    bekeken_op: gk.eerste_bekeken_op,
    mollie_payment_url: null,
    bedrag: null,
    volgorde: 0,
    created_at: gk.created_at,
    bestanden: [...bestanden, ...offerteBestanden],
    reacties: gk.goedgekeurd_door ? [{
      id: `reactie-${gk.id}`,
      type: gk.status === 'goedgekeurd' ? 'goedkeuring' : 'revisie',
      bericht: gk.revisie_opmerkingen || `Goedgekeurd door ${gk.goedgekeurd_door}`,
      naam: gk.goedgekeurd_door,
      created_at: gk.goedgekeurd_op || gk.updated_at,
    }] : [],
  }]

  return res.status(200).json({
    status: 'actief',
    portaal: {
      id: `gk-${gk.id}`,
      instructie_tekst: gk.email_bericht || '',
      verloopt_op: new Date(Date.now() + 90 * 86400000).toISOString(), // 90 dagen
    },
    project: project ? {
      naam: project.naam,
      adres: project.adres,
      postcode: project.postcode,
      plaats: project.plaats,
    } : null,
    bedrijf: {
      naam: profile?.bedrijfsnaam || '',
      logo_url: profile?.logo_url || '',
      telefoon: profile?.bedrijfs_telefoon || '',
      email: profile?.bedrijfs_email || '',
      website: profile?.bedrijfs_website || '',
      primaire_kleur: docStyle?.primaire_kleur || '#1a1a1a',
    },
    instellingen: {},
    items,
    // Flag voor PortaalPagina om goedkeuring-specifieke UI te tonen
    goedkeuring_mode: true,
    goedkeuring_token: token,
  })
}
