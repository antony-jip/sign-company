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

    // Haal portaal op
    const { data: portaal, error: portaalError } = await supabaseAdmin
      .from('project_portalen')
      .select('*')
      .eq('token', token)
      .single()

    if (portaalError || !portaal) {
      return res.status(404).json({ error: 'Portaal niet gevonden' })
    }

    // Check gedeactiveerd
    if (!portaal.actief) {
      // Haal bedrijfsnaam op voor de gesloten pagina
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('bedrijfsnaam, bedrijfs_telefoon, bedrijfs_email')
        .eq('id', portaal.user_id)
        .single()
      return res.status(200).json({
        status: 'gesloten',
        bedrijfsnaam: profile?.bedrijfsnaam || '',
        bedrijfs_telefoon: profile?.bedrijfs_telefoon || '',
        bedrijfs_email: profile?.bedrijfs_email || '',
      })
    }

    // Check verlopen
    if (new Date(portaal.verloopt_op) < new Date()) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('bedrijfsnaam, bedrijfs_telefoon, bedrijfs_email')
        .eq('id', portaal.user_id)
        .single()
      return res.status(200).json({
        status: 'verlopen',
        token: portaal.token,
        bedrijfsnaam: profile?.bedrijfsnaam || '',
        bedrijfs_telefoon: profile?.bedrijfs_telefoon || '',
        bedrijfs_email: profile?.bedrijfs_email || '',
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

    // Haal portaal instellingen
    const { data: appSettings } = await supabaseAdmin
      .from('app_settings')
      .select('portaal_instellingen')
      .eq('user_id', portaal.user_id)
      .maybeSingle()

    // Haal items met bestanden en reacties (alleen zichtbaar voor klant)
    const { data: items } = await supabaseAdmin
      .from('portaal_items')
      .select('id, type, titel, omschrijving, label, status, bekeken_op, mollie_payment_url, bedrag, volgorde, created_at, portaal_bestanden(*), portaal_reacties(*)')
      .eq('portaal_id', portaal.id)
      .eq('zichtbaar_voor_klant', true)
      .order('created_at', { ascending: false })

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
      instellingen: appSettings?.portaal_instellingen || {},
      items: safeItems,
    })
  } catch (error) {
    console.error('portaal-get error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het ophalen van het portaal' })
  }
}
