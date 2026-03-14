import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function isRateLimited(ip: string, endpoint: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data } = await supabase.rpc('check_rate_limit', {
    p_key: `${endpoint}:${ip}`,
    p_max_count: maxCount,
    p_window_seconds: windowSeconds,
  })
  return data === true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 'portaal-link-aanvragen', 3, 3600)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, email } = req.body as { token: string; email: string }

    if (!token || !email) {
      return res.status(400).json({ error: 'Token en email zijn verplicht' })
    }

    // Basis email validatie
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ongeldig email adres' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Zoek portaal op basis van token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, project_id, user_id')
      .eq('token', token)
      .single()

    if (!portaal) {
      // Geef altijd succes terug om geen info te lekken
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Haal klant email op via project
    const { data: project } = await supabaseAdmin
      .from('projecten')
      .select('klant_id')
      .eq('id', portaal.project_id)
      .single()

    if (!project?.klant_id) {
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Controleer of email overeenkomt met klant
    const { data: klant } = await supabaseAdmin
      .from('klanten')
      .select('email')
      .eq('id', project.klant_id)
      .single()

    if (!klant || klant.email?.toLowerCase() !== email.toLowerCase()) {
      // Geef altijd succes terug om geen info te lekken
      return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
    }

    // Email matcht — maak notificatie aan voor de eigenaar
    await supabaseAdmin
      .from('app_notificaties')
      .insert({
        user_id: portaal.user_id,
        type: 'herinnering',
        titel: 'Nieuwe portaallink aangevraagd',
        bericht: `Een klant (${email}) heeft een nieuwe portaallink aangevraagd.`,
        link: `/projecten/${portaal.project_id}`,
        project_id: portaal.project_id,
      })

    return res.status(200).json({ success: true, message: 'Als het e-mailadres bekend is, ontvangt u een nieuwe link.' })
  } catch (error) {
    console.error('portaal-link-aanvragen error:', error)
    return res.status(500).json({ error: 'Er ging iets mis. Probeer het later opnieuw.' })
  }
}
