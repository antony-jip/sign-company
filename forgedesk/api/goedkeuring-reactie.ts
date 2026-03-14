import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limiting: 10 per uur per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return false
  }
  entry.count++
  return entry.count > 10
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
  }

  try {
    const { token, status, goedgekeurd_door, revisie_opmerkingen } = req.body as {
      token: string
      status: 'goedgekeurd' | 'revisie'
      goedgekeurd_door?: string
      revisie_opmerkingen?: string
    }

    if (!token || !status) {
      return res.status(400).json({ error: 'Token en status zijn verplicht' })
    }

    if (!['goedgekeurd', 'revisie'].includes(status)) {
      return res.status(400).json({ error: 'Ongeldige status' })
    }

    if (status === 'goedgekeurd' && (!goedgekeurd_door || !goedgekeurd_door.trim())) {
      return res.status(400).json({ error: 'Naam is verplicht bij goedkeuring' })
    }

    if (status === 'revisie' && (!revisie_opmerkingen || !revisie_opmerkingen.trim())) {
      return res.status(400).json({ error: 'Opmerkingen zijn verplicht bij revisie' })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuratie onvolledig' })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Haal goedkeuring op
    const { data: gk, error: gkError } = await supabaseAdmin
      .from('tekening_goedkeuringen')
      .select('*')
      .eq('token', token)
      .single()

    if (gkError || !gk) {
      return res.status(404).json({ error: 'Goedkeuring niet gevonden' })
    }

    // Update goedkeuring
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === 'goedgekeurd') {
      updates.goedgekeurd_door = goedgekeurd_door!.trim()
      updates.goedgekeurd_op = new Date().toISOString()
    } else {
      updates.revisie_opmerkingen = revisie_opmerkingen!.trim()
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('tekening_goedkeuringen')
      .update(updates)
      .eq('token', token)
      .select()
      .single()

    if (updateError) {
      console.error('goedkeuring update error:', updateError)
      return res.status(500).json({ error: 'Kon goedkeuring niet bijwerken' })
    }

    // --- Notificatie + Email (niet-blokkerend) ---
    try {
      const displayNaam = goedgekeurd_door?.trim() || 'Klant'

      // Haal project en klant info
      const { data: project } = await supabaseAdmin
        .from('projecten')
        .select('naam, klant_id')
        .eq('id', gk.project_id)
        .single()

      const { data: klant } = project?.klant_id
        ? await supabaseAdmin
            .from('klanten')
            .select('bedrijfsnaam, contactpersoon')
            .eq('id', project.klant_id)
            .single()
        : { data: null }

      const klantNaam = klant?.bedrijfsnaam || klant?.contactpersoon || displayNaam

      // Maak in-app notificatie
      const notifType = status === 'goedgekeurd' ? 'portaal_goedkeuring' : 'portaal_revisie'
      const actieLabel = status === 'goedgekeurd' ? 'goedgekeurd' : 'revisie gevraagd'

      await supabaseAdmin.from('notificaties').insert({
        user_id: gk.user_id,
        type: notifType,
        titel: `Tekening ${actieLabel} door ${klantNaam}`,
        bericht: status === 'revisie'
          ? `"${revisie_opmerkingen!.trim()}" — ${project?.naam || 'Project'}`
          : `${displayNaam} heeft de tekeningen goedgekeurd — ${project?.naam || 'Project'}`,
        link: `/projecten/${gk.project_id}`,
        project_id: gk.project_id,
        klant_id: project?.klant_id || null,
        actie_genomen: false,
        gelezen: false,
      })

      // Stuur email naar gebruiker
      const { data: emailSettings } = await supabaseAdmin
        .from('app_settings')
        .select('email_instellingen')
        .eq('user_id', gk.user_id)
        .maybeSingle()

      const emailConfig = emailSettings?.email_instellingen as {
        gmail_address?: string
        app_password?: string
        smtp_host?: string
        smtp_port?: number
      } | null

      if (emailConfig?.gmail_address && emailConfig?.app_password) {
        const onderwerp = status === 'goedgekeurd'
          ? `Tekening goedgekeurd door ${klantNaam}`
          : `Revisie gevraagd door ${klantNaam}`

        const appUrl = process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.forgedesk.io')

        const emailBody = [
          `${klantNaam} heeft de tekening ${actieLabel}:`,
          status === 'revisie' ? `\nOpmerkingen: "${revisie_opmerkingen!.trim()}"` : '',
          `\nProject: ${project?.naam || 'Project'}`,
          gk.revisie_nummer > 1 ? `Revisie nummer: ${gk.revisie_nummer}` : '',
          `\nBekijk in FORGEdesk: ${appUrl}/projecten/${gk.project_id}`,
        ].filter(Boolean).join('\n')

        fetch(`${appUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gmail_address: emailConfig.gmail_address,
            app_password: emailConfig.app_password,
            smtp_host: emailConfig.smtp_host,
            smtp_port: emailConfig.smtp_port,
            to: emailConfig.gmail_address,
            subject: onderwerp,
            body: emailBody,
          }),
        }).catch(err => console.warn('Email naar gebruiker mislukt:', err))
      }
    } catch (notifErr) {
      console.warn('Notificatie/email bij goedkeuring mislukt:', notifErr)
    }

    return res.status(200).json({ goedkeuring: updated })
  } catch (error) {
    console.error('goedkeuring-reactie error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het bijwerken van de goedkeuring' })
  }
}
