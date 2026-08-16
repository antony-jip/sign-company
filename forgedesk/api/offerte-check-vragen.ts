/**
 * Vraagt een collega om een offerte te checken.
 *
 * Loopt via service_role omdat de notificatie voor de collega niet vanuit de
 * client kan (notificaties-RLS is user_id-only). Zet de check-kolommen op de
 * offerte, maakt een in-app notificatie, stuurt een push naar de toestellen
 * van de collega en een mail via Resend (noreply@doen.team).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function isRateLimited(key: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: key, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}

async function bepaalUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

function profielNaam(p: { voornaam?: string | null; achternaam?: string | null; email?: string | null } | null): string {
  if (!p) return 'Een collega'
  return [p.voornaam, p.achternaam].filter(Boolean).join(' ') || p.email || 'Een collega'
}

function appUrl(): string {
  return process.env.VITE_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.doen.team')
}

async function stuurPush(userId: string, titel: string, tekst: string, url: string): Promise<void> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return
  try {
    await fetch(`${appUrl()}/api/push-verstuur`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ service_user_id: userId, titel, tekst, url, tag: 'doen-offerte-check' }),
      signal: AbortSignal.timeout(8_000),
    })
  } catch (err) {
    console.warn('[offerte-check-vragen] push mislukt:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await bepaalUser(req)

    if (await isRateLimited(`offerte-check-vragen:${userId}`, 30, 3600)) {
      return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    }

    const { offerte_id, aan_user_id, notitie } = req.body as {
      offerte_id?: string
      aan_user_id?: string
      notitie?: string
    }

    if (!offerte_id || !aan_user_id) {
      return res.status(400).json({ error: 'offerte_id en aan_user_id zijn verplicht' })
    }
    if (aan_user_id === userId) {
      return res.status(400).json({ error: 'Je kunt een check niet aan jezelf vragen' })
    }
    const schoneNotitie = typeof notitie === 'string' ? notitie.trim().slice(0, 500) : ''

    const [{ data: offerte }, { data: aanvrager }, { data: collega }] = await Promise.all([
      supabaseAdmin
        .from('offertes')
        .select('id, nummer, titel, organisatie_id, klant_id, project_id, activiteiten')
        .eq('id', offerte_id)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id, voornaam, achternaam, email, organisatie_id')
        .eq('id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id, voornaam, achternaam, email, organisatie_id, status')
        .eq('id', aan_user_id)
        .maybeSingle(),
    ])

    if (!offerte) return res.status(404).json({ error: 'Offerte niet gevonden' })
    if (!aanvrager?.organisatie_id || aanvrager.organisatie_id !== offerte.organisatie_id) {
      return res.status(403).json({ error: 'Geen toegang tot deze offerte' })
    }
    if (!collega || collega.organisatie_id !== offerte.organisatie_id || collega.status === 'gedeactiveerd') {
      return res.status(400).json({ error: 'Deze collega hoort niet bij jouw organisatie' })
    }

    const aanvragerNaam = profielNaam(aanvrager)
    const collegaNaam = profielNaam(collega)
    const nu = new Date().toISOString()

    const activiteiten = Array.isArray(offerte.activiteiten) ? offerte.activiteiten : []
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('offertes')
      .update({
        check_status: 'open',
        check_gevraagd_aan: aan_user_id,
        check_gevraagd_door: userId,
        check_gevraagd_op: nu,
        check_notitie: schoneNotitie || null,
        check_afgehandeld_op: null,
        activiteiten: [...activiteiten, {
          datum: nu,
          type: 'check_gevraagd',
          beschrijving: `Ter controle naar ${collegaNaam}`,
          medewerker: aanvragerNaam,
        }],
        updated_at: nu,
      })
      .eq('id', offerte_id)
      .select('id, updated_at, check_status, check_gevraagd_aan, check_gevraagd_door, check_gevraagd_op, check_notitie')
      .single()

    if (updateError || !updated) {
      console.error('[offerte-check-vragen] update mislukt:', updateError)
      return res.status(500).json({ error: 'Kon de check niet vastleggen' })
    }

    const offerteLabel = `${offerte.nummer} · ${offerte.titel}`
    const link = `/offertes/${offerte.id}/bewerken`

    // --- Notificatie + push + mail (niet-blokkerend voor het resultaat) ---
    try {
      await supabaseAdmin.from('notificaties').insert({
        user_id: aan_user_id,
        type: 'offerte_check_gevraagd',
        titel: `${aanvragerNaam} vraagt je een offerte te checken`,
        bericht: schoneNotitie ? `${offerteLabel} · "${schoneNotitie}"` : offerteLabel,
        link,
        offerte_id: offerte.id,
        klant_id: offerte.klant_id || null,
        project_id: offerte.project_id || null,
        actie_genomen: false,
        gelezen: false,
      })

      await stuurPush(
        aan_user_id,
        'Offerte checken',
        `${aanvragerNaam} vraagt je ${offerte.nummer} te checken`,
        link
      )

      let mailAdres = collega.email as string | null
      if (!mailAdres) {
        const { data: mailSettings } = await supabaseAdmin
          .from('user_email_settings')
          .select('gmail_address')
          .eq('user_id', aan_user_id)
          .maybeSingle()
        mailAdres = mailSettings?.gmail_address || null
      }
      if (mailAdres) {
        // Met .js-extensie: de Vercel-runtime draait ESM en vindt de module
        // zonder extensie niet (ERR_MODULE_NOT_FOUND op /var/task/...).
        const { sendDoenNotification } = await import('./resend-notify.js')
        // Awaiten is verplicht: zonder await bevriest Vercel de lambda direct
        // na de response en sterft de Resend-request voordat hij vertrokken is.
        await sendDoenNotification({
          to: mailAdres,
          subject: `${aanvragerNaam} vraagt je een offerte te checken`,
          heading: `${aanvragerNaam} vraagt je een offerte te checken`,
          itemTitel: offerteLabel,
          quote: schoneNotitie || undefined,
          ctaUrl: `${appUrl()}${link}`,
          ctaLabel: 'Bekijk de offerte →',
        })
      }
    } catch (notifErr) {
      console.warn('[offerte-check-vragen] notificatie mislukt:', notifErr)
    }

    return res.status(200).json({ offerte: updated })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[offerte-check-vragen] error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het aanvragen van de check' })
  }
}
