import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limiting: 20 per uur per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
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
    return res.status(429).json({ error: 'Te veel verzoeken' })
  }

  try {
    const { token, item_ids } = req.body as {
      token: string
      item_ids?: string[]
    }

    if (!token) {
      return res.status(400).json({ error: 'Token is verplicht' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Valideer token — haal ook user_id en project_id op voor notificaties
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, user_id, project_id, actief, verloopt_op')
      .eq('token', token)
      .single()

    if (!portaal || !portaal.actief || new Date(portaal.verloopt_op) < new Date()) {
      return res.status(403).json({ error: 'Portaal niet beschikbaar' })
    }

    const now = new Date().toISOString()

    // Update laatst_bekeken_op op het portaal
    await supabaseAdmin
      .from('project_portalen')
      .update({ updated_at: now })
      .eq('id', portaal.id)

    // Update bekeken_op voor items (alleen waar bekeken_op IS NULL)
    if (item_ids && item_ids.length > 0) {
      // Haal items op die nog NIET bekeken zijn (voor notificatie)
      const { data: onbekekenItems } = await supabaseAdmin
        .from('portaal_items')
        .select('id, titel')
        .eq('portaal_id', portaal.id)
        .in('id', item_ids)
        .is('bekeken_op', null)

      // Batch update: zet bekeken_op
      await supabaseAdmin
        .from('portaal_items')
        .update({ bekeken_op: now })
        .eq('portaal_id', portaal.id)
        .in('id', item_ids)
        .is('bekeken_op', null)

      // Maak notificatie aan voor nieuw-bekeken items
      if (onbekekenItems && onbekekenItems.length > 0) {
        try {
          const { data: project } = await supabaseAdmin
            .from('projecten')
            .select('naam, klant_id')
            .eq('id', portaal.project_id)
            .single()

          const itemTitels = onbekekenItems.map((i: { titel: string }) => i.titel).join(', ')

          await supabaseAdmin.from('notificaties').insert({
            user_id: portaal.user_id,
            type: 'portaal_bekeken',
            titel: `Klant heeft ${onbekekenItems.length === 1 ? 'een item' : `${onbekekenItems.length} items`} bekeken`,
            bericht: `${itemTitels} — ${project?.naam || 'Project'}`,
            link: `/projecten/${portaal.project_id}`,
            project_id: portaal.project_id,
            klant_id: project?.klant_id || null,
            gelezen: false,
          })
        } catch (notifError) {
          console.error('portaal-bekeken notificatie error:', notifError)
        }
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('portaal-bekeken error:', error)
    return res.status(500).json({ error: 'Er ging iets mis' })
  }
}
