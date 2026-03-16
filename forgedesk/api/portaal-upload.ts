import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabaseAdmin, isRateLimited } from './_shared'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

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
  if (await isRateLimited(clientIp, 'portaal-upload', 10, 3600)) {
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

    // Valideer grootte (base64 is ~33% groter dan het origineel)
    const buffer = Buffer.from(fileData, 'base64')
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'Bestand is te groot (max 10MB)' })
    }

    // Valideer token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, actief, verloopt_op')
      .eq('token', token)
      .single()

    if (!portaal || !portaal.actief || new Date(portaal.verloopt_op) < new Date()) {
      return res.status(403).json({ error: 'Portaal niet beschikbaar' })
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

    // Sanitize bestandsnaam tegen directory traversal (behoud Nederlandse tekens)
    const safeName = bestandsnaam
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^\./g, '_')
      .slice(0, 255)

    // Upload naar Supabase Storage
    const filePath = `portaal-bestanden/${portaal.id}/${Date.now()}_${safeName}`
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
        bestandsnaam,
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
