import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limiting: 10 reacties per uur per IP
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, portaal_item_id, type, bericht, klant_naam, bestanden } = req.body as {
      token: string
      portaal_item_id: string
      type: 'goedkeuring' | 'revisie' | 'bericht'
      bericht?: string
      klant_naam?: string
      bestanden?: string[] // URLs van geüploade bestanden
    }

    if (!token || !portaal_item_id || !type) {
      return res.status(400).json({ error: 'Token, portaal_item_id en type zijn verplicht' })
    }

    if (!['goedkeuring', 'revisie', 'bericht'].includes(type)) {
      return res.status(400).json({ error: 'Ongeldig reactie type' })
    }

    if (type === 'revisie' && (!bericht || !bericht.trim())) {
      return res.status(400).json({ error: 'Bij een revisie is een bericht verplicht' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Valideer token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, actief, verloopt_op, user_id, project_id')
      .eq('token', token)
      .single()

    if (!portaal) {
      return res.status(404).json({ error: 'Portaal niet gevonden' })
    }

    if (!portaal.actief) {
      return res.status(403).json({ error: 'Dit portaal is niet meer actief' })
    }

    if (new Date(portaal.verloopt_op) < new Date()) {
      return res.status(403).json({ error: 'Dit portaal is verlopen' })
    }

    // Valideer dat item bestaat en zichtbaar is
    const { data: item } = await supabaseAdmin
      .from('portaal_items')
      .select('id, type, status, portaal_id, zichtbaar_voor_klant')
      .eq('id', portaal_item_id)
      .eq('portaal_id', portaal.id)
      .single()

    if (!item || !item.zichtbaar_voor_klant) {
      return res.status(404).json({ error: 'Item niet gevonden' })
    }

    // Sla reactie op
    const { data: reactie, error: reactieError } = await supabaseAdmin
      .from('portaal_reacties')
      .insert({
        portaal_item_id,
        type,
        bericht: bericht?.trim() || null,
        klant_naam: klant_naam?.trim() || null,
      })
      .select()
      .single()

    if (reactieError || !reactie) {
      console.error('portaal-reactie insert error:', reactieError)
      return res.status(500).json({ error: 'Kon reactie niet opslaan' })
    }

    // Update item status
    const newStatus = type === 'goedkeuring' ? 'goedgekeurd' : type === 'revisie' ? 'revisie' : item.status
    if (newStatus !== item.status) {
      await supabaseAdmin
        .from('portaal_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', portaal_item_id)
    }

    // Koppel eventuele bestanden aan de reactie
    if (bestanden && bestanden.length > 0) {
      // Update de portaal_bestanden records die matchen op URL
      for (const url of bestanden) {
        await supabaseAdmin
          .from('portaal_bestanden')
          .update({ portaal_reactie_id: reactie.id })
          .eq('portaal_item_id', portaal_item_id)
          .eq('url', url)
          .eq('uploaded_by', 'klant')
      }
    }

    return res.status(201).json({ reactie })
  } catch (error) {
    console.error('portaal-reactie error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het opslaan van de reactie' })
  }
}
