import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

// Rate limiting: 10 uploads per uur per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 3_600_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Te veel uploads. Probeer het later opnieuw.' })
  }

  try {
    const { token, portaal_item_id, bestandsnaam, mime_type, data: fileData } = req.body as {
      token: string
      portaal_item_id: string
      bestandsnaam: string
      mime_type: string
      data: string // base64
    }

    if (!token || !portaal_item_id || !bestandsnaam || !mime_type || !fileData) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' })
    }

    // Valideer bestandstype
    if (!ALLOWED_TYPES.includes(mime_type)) {
      return res.status(400).json({ error: 'Alleen JPG, PNG en PDF bestanden zijn toegestaan' })
    }

    // Sanitize bestandsnaam: verwijder pad-componenten en speciale tekens
    const sanitizedBestandsnaam = bestandsnaam
      .replace(/[/\\]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/[^\w.\- ]/g, '_')
      .substring(0, 200)

    // Valideer grootte (base64 is ~33% groter dan het origineel)
    const buffer = Buffer.from(fileData, 'base64')
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Bestand is te groot (max 10MB)' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Valideer token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, actief, verloopt_op, user_id')
      .eq('token', token)
      .single()

    if (!portaal || !portaal.actief || new Date(portaal.verloopt_op) < new Date()) {
      return res.status(403).json({ error: 'Portaal niet beschikbaar' })
    }

    // Check max bestandsgrootte uit portaal instellingen
    const { data: appSettings } = await supabaseAdmin
      .from('app_settings')
      .select('portaal_instellingen')
      .eq('user_id', portaal.user_id)
      .maybeSingle()

    const maxMb = (appSettings?.portaal_instellingen as { max_bestandsgrootte_mb?: number } | null)?.max_bestandsgrootte_mb || 10
    if (buffer.length > maxMb * 1024 * 1024) {
      return res.status(400).json({ error: `Bestand is te groot (max ${maxMb}MB)` })
    }

    // Valideer item
    const { data: item } = await supabaseAdmin
      .from('portaal_items')
      .select('id, portaal_id')
      .eq('id', portaal_item_id)
      .eq('portaal_id', portaal.id)
      .single()

    if (!item) {
      return res.status(404).json({ error: 'Item niet gevonden' })
    }

    // Upload naar Supabase Storage
    const filePath = `portaal-bestanden/${portaal.id}/${Date.now()}_${sanitizedBestandsnaam}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('portaal-bestanden')
      .upload(filePath, buffer, {
        contentType: mime_type,
        upsert: false,
      })

    let url: string
    if (uploadError) {
      // Fallback: sla base64 URL op als storage niet werkt
      console.warn('Storage upload failed, using base64 fallback:', uploadError.message)
      url = `data:${mime_type};base64,${fileData.substring(0, 100)}...` // Placeholder
      // Eigenlijk slaan we gewoon de volledige data URL op voor de fallback
      url = `data:${mime_type};base64,${fileData}`
    } else {
      const { data: publicUrl } = supabaseAdmin.storage
        .from('portaal-bestanden')
        .getPublicUrl(filePath)
      url = publicUrl.publicUrl
    }

    const thumbnail_url = mime_type.startsWith('image/') ? url : null

    // Sla bestand record op
    const { data: bestand, error: dbError } = await supabaseAdmin
      .from('portaal_bestanden')
      .insert({
        portaal_item_id,
        bestandsnaam: sanitizedBestandsnaam,
        mime_type,
        grootte: buffer.length,
        url,
        thumbnail_url,
        uploaded_by: 'klant',
      })
      .select()
      .single()

    if (dbError) {
      console.error('portaal-upload db error:', dbError)
      return res.status(500).json({ error: 'Kon bestand niet opslaan' })
    }

    return res.status(201).json({
      url: bestand.url,
      thumbnail_url: bestand.thumbnail_url,
      bestandsnaam: bestand.bestandsnaam,
      id: bestand.id,
    })
  } catch (error) {
    console.error('portaal-upload error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het uploaden' })
  }
}
