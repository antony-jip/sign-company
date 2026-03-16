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
    const { token, portaal_item_id, type, bericht, klant_naam, bestanden, portaal_bestand_id } = req.body as {
      token: string
      portaal_item_id: string
      type: 'goedkeuring' | 'revisie' | 'bericht'
      bericht?: string
      klant_naam?: string
      bestanden?: string[] // URLs van geüploade bestanden
      portaal_bestand_id?: string // Voor per-afbeelding goedkeuring
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

    // Valideer portaal_bestand_id als meegegeven (per-afbeelding goedkeuring)
    if (portaal_bestand_id) {
      const { data: bestand } = await supabaseAdmin
        .from('portaal_bestanden')
        .select('id')
        .eq('id', portaal_bestand_id)
        .eq('portaal_item_id', portaal_item_id)
        .single()
      if (!bestand) {
        return res.status(400).json({ error: 'Bestand hoort niet bij dit item' })
      }
    }

    // Sanitize klant_naam: strip HTML tags en control characters
    const sanitizedNaam = klant_naam
      ? klant_naam.trim().replace(/<[^>]*>/g, '').replace(/[\r\n\t]/g, ' ').substring(0, 100)
      : null

    // Valideer bestanden URLs (alleen bekende URL-patronen)
    if (bestanden && bestanden.length > 0) {
      const invalidUrl = bestanden.find(u => !u.startsWith('http') && !u.startsWith('portaal-bestanden/') && !u.startsWith('data:'))
      if (invalidUrl) {
        return res.status(400).json({ error: 'Ongeldig bestand URL formaat' })
      }
    }

    // Sla reactie op
    const { data: reactie, error: reactieError } = await supabaseAdmin
      .from('portaal_reacties')
      .insert({
        portaal_item_id,
        portaal_bestand_id: portaal_bestand_id || null,
        type,
        bericht: bericht?.trim()?.substring(0, 5000) || null,
        klant_naam: sanitizedNaam,
      })
      .select()
      .single()

    if (reactieError || !reactie) {
      console.error('portaal-reactie insert error:', reactieError)
      return res.status(500).json({ error: 'Kon reactie niet opslaan' })
    }

    // Update item status
    let newStatus = type === 'goedkeuring' ? 'goedgekeurd' : type === 'revisie' ? 'revisie' : item.status

    // Per-afbeelding status aggregatie: check alle afbeeldingen van het item
    if (portaal_bestand_id && (type === 'goedkeuring' || type === 'revisie')) {
      const { data: allBestanden } = await supabaseAdmin
        .from('portaal_bestanden')
        .select('id')
        .eq('portaal_item_id', portaal_item_id)
        .in('mime_type', ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])

      const { data: allReacties } = await supabaseAdmin
        .from('portaal_reacties')
        .select('portaal_bestand_id, type, created_at')
        .eq('portaal_item_id', portaal_item_id)
        .not('portaal_bestand_id', 'is', null)
        .order('created_at', { ascending: false })

      if (allBestanden && allReacties) {
        const imageIds = allBestanden.map(b => b.id)
        let alleGoedgekeurd = true
        let heeftRevisie = false

        for (const imageId of imageIds) {
          const latestReactie = allReacties.find(r => r.portaal_bestand_id === imageId)
          if (!latestReactie || latestReactie.type !== 'goedkeuring') {
            alleGoedgekeurd = false
          }
          if (latestReactie?.type === 'revisie') {
            heeftRevisie = true
          }
        }

        if (alleGoedgekeurd && imageIds.length > 0) {
          newStatus = 'goedgekeurd'
        } else if (heeftRevisie) {
          newStatus = 'revisie'
        } else {
          newStatus = 'bekeken' // Nog niet alle afbeeldingen beoordeeld
        }
      }
    }

    if (newStatus !== item.status) {
      await supabaseAdmin
        .from('portaal_items')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', portaal_item_id)
    }

    // Koppel eventuele bestanden aan de reactie
    if (bestanden && bestanden.length > 0) {
      for (const url of bestanden) {
        await supabaseAdmin
          .from('portaal_bestanden')
          .update({ portaal_reactie_id: reactie.id })
          .eq('portaal_item_id', portaal_item_id)
          .eq('url', url)
          .eq('uploaded_by', 'klant')
      }
    }

    // --- Notificatie + Email naar gebruiker (niet-blokkerend) ---
    try {
      const displayNaam = sanitizedNaam || 'Klant'
      const notifType = type === 'goedkeuring' ? 'portaal_goedkeuring' : type === 'revisie' ? 'portaal_revisie' : 'portaal_bericht'
      const actieLabel = type === 'goedkeuring' ? 'goedgekeurd' : type === 'revisie' ? 'revisie gevraagd' : 'een bericht gestuurd'

      // Haal project info voor context
      const { data: project } = await supabaseAdmin
        .from('projecten')
        .select('naam, klant_id')
        .eq('id', portaal.project_id)
        .single()

      // Haal item titel
      const { data: fullItem } = await supabaseAdmin
        .from('portaal_items')
        .select('titel')
        .eq('id', portaal_item_id)
        .single()

      // Maak in-app notificatie aan
      await supabaseAdmin.from('notificaties').insert({
        user_id: portaal.user_id,
        type: notifType,
        titel: `${displayNaam} heeft ${actieLabel}`,
        bericht: bericht?.trim()
          ? `"${bericht.trim()}" — ${fullItem?.titel || 'Item'} (${project?.naam || 'Project'})`
          : `${fullItem?.titel || 'Item'} — ${project?.naam || 'Project'}`,
        link: `/projecten/${portaal.project_id}?tab=portaal`,
        project_id: portaal.project_id,
        klant_id: project?.klant_id || null,
        actie_genomen: false,
        gelezen: false,
      })

      // Stuur email naar gebruiker (alleen als email_bij_reactie aan staat)
      const { data: appSettings } = await supabaseAdmin
        .from('app_settings')
        .select('email_instellingen, portaal_instellingen')
        .eq('user_id', portaal.user_id)
        .maybeSingle()

      const emailConfig = appSettings?.email_instellingen as { gmail_address?: string; app_password?: string; smtp_host?: string; smtp_port?: number } | null
      const portaalInstellingen = appSettings?.portaal_instellingen as { email_naar_mij_bij_reactie?: boolean } | null
      const emailBijReactie = portaalInstellingen?.email_naar_mij_bij_reactie !== false // default true

      if (emailBijReactie && emailConfig?.gmail_address && emailConfig?.app_password) {
        const onderwerp = type === 'goedkeuring'
          ? `Goedgekeurd: ${fullItem?.titel || 'Item'} — ${displayNaam}`
          : type === 'revisie'
          ? `Revisie gevraagd: ${fullItem?.titel || 'Item'} — ${displayNaam}`
          : `Nieuw bericht: ${fullItem?.titel || 'Item'} — ${displayNaam}`

        const appUrl = process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://forgedesk.nl')

        const emailBody = [
          `${displayNaam} heeft ${actieLabel}:`,
          bericht?.trim() ? `\n"${bericht.trim()}"` : '',
          `\nItem: ${fullItem?.titel || 'Item'}`,
          `Project: ${project?.naam || 'Project'}`,
          `\nBekijk in FORGEdesk: ${appUrl}/projecten/${portaal.project_id}`,
        ].filter(Boolean).join('\n')

        // Fire-and-forget email
        fetch(`${appUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gmail_address: emailConfig.gmail_address,
            app_password: emailConfig.app_password,
            smtp_host: emailConfig.smtp_host,
            smtp_port: emailConfig.smtp_port,
            to: emailConfig.gmail_address, // Naar de gebruiker zelf
            subject: onderwerp,
            body: emailBody,
          }),
        }).catch(err => console.warn('Email naar gebruiker mislukt:', err))
      }
    } catch (notifErr) {
      console.warn('Notificatie/email bij reactie mislukt:', notifErr)
    }

    return res.status(201).json({ reactie })
  } catch (error) {
    console.error('portaal-reactie error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het opslaan van de reactie' })
  }
}
