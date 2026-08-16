/**
 * Handelt een openstaande offerte-check af.
 *
 * Twee acties:
 *  - 'akkoord': de collega keurt de offerte goed zonder te versturen.
 *  - 'verstuurd': de offerte is verstuurd terwijl de check open stond; de
 *    verzendflow roept dit aan zodat de check meteen is afgerond.
 *
 * De aanvrager van de check krijgt een in-app notificatie, push en mail,
 * behalve als hij de actie zelf uitvoerde.
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
    console.warn('[offerte-check-reactie] push mislukt:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const userId = await bepaalUser(req)

    if (await isRateLimited(`offerte-check-reactie:${userId}`, 60, 3600)) {
      return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    }

    const { offerte_id, actie } = req.body as { offerte_id?: string; actie?: string }
    if (!offerte_id || (actie !== 'akkoord' && actie !== 'verstuurd')) {
      return res.status(400).json({ error: 'offerte_id en een geldige actie zijn verplicht' })
    }

    const [{ data: offerte }, { data: actor }] = await Promise.all([
      supabaseAdmin
        .from('offertes')
        .select('id, nummer, titel, organisatie_id, klant_id, project_id, activiteiten, check_status, check_gevraagd_aan, check_gevraagd_door')
        .eq('id', offerte_id)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id, voornaam, achternaam, email, organisatie_id')
        .eq('id', userId)
        .maybeSingle(),
    ])

    if (!offerte) return res.status(404).json({ error: 'Offerte niet gevonden' })
    if (!actor?.organisatie_id || actor.organisatie_id !== offerte.organisatie_id) {
      return res.status(403).json({ error: 'Geen toegang tot deze offerte' })
    }
    // Idempotent: een al afgehandelde (of nooit gevraagde) check is geen fout,
    // de verzendflow roept dit blind aan.
    if (offerte.check_status !== 'open') {
      return res.status(200).json({ already: true })
    }

    const actorNaam = profielNaam(actor)
    const nu = new Date().toISOString()

    const activiteiten = Array.isArray(offerte.activiteiten) ? offerte.activiteiten : []
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('offertes')
      .update({
        check_status: actie,
        check_afgehandeld_op: nu,
        activiteiten: [...activiteiten, {
          datum: nu,
          type: 'check_afgehandeld',
          beschrijving: actie === 'akkoord'
            ? `Check akkoord door ${actorNaam}`
            : `Check afgerond · verstuurd door ${actorNaam}`,
          medewerker: actorNaam,
        }],
        updated_at: nu,
      })
      .eq('id', offerte_id)
      .select('id, updated_at, check_status, check_afgehandeld_op')
      .single()

    if (updateError || !updated) {
      console.error('[offerte-check-reactie] update mislukt:', updateError)
      return res.status(500).json({ error: 'Kon de check niet afronden' })
    }

    // --- Aanvrager op de hoogte brengen (niet als hij het zelf was) ---
    const aanvragerId = offerte.check_gevraagd_door as string | null
    if (aanvragerId && aanvragerId !== userId) {
      try {
        const offerteLabel = `${offerte.nummer} · ${offerte.titel}`
        const link = `/offertes/${offerte.id}/bewerken`
        const titel = actie === 'akkoord'
          ? `${actorNaam} heeft je offerte gecheckt en akkoord gegeven`
          : `${actorNaam} heeft je offerte gecheckt en verstuurd`

        await supabaseAdmin.from('notificaties').insert({
          user_id: aanvragerId,
          type: 'offerte_check_afgehandeld',
          titel,
          bericht: offerteLabel,
          link,
          offerte_id: offerte.id,
          klant_id: offerte.klant_id || null,
          project_id: offerte.project_id || null,
          actie_genomen: false,
          gelezen: false,
        })

        await stuurPush(
          aanvragerId,
          actie === 'akkoord' ? 'Offerte gecheckt: akkoord' : 'Offerte gecheckt en verstuurd',
          `${actorNaam} · ${offerte.nummer}`,
          link
        )

        const { data: aanvrager } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', aanvragerId)
          .maybeSingle()
        let mailAdres = aanvrager?.email as string | null
        if (!mailAdres) {
          const { data: mailSettings } = await supabaseAdmin
            .from('user_email_settings')
            .select('gmail_address')
            .eq('user_id', aanvragerId)
            .maybeSingle()
          mailAdres = mailSettings?.gmail_address || null
        }
        if (mailAdres) {
          const { sendDoenNotification } = await import('./resend-notify')
          sendDoenNotification({
            to: mailAdres,
            subject: titel,
            heading: titel,
            itemTitel: offerteLabel,
            ctaUrl: `${appUrl()}${link}`,
            ctaLabel: 'Bekijk de offerte →',
          }).catch(err => console.warn('[offerte-check-reactie] Resend mislukt:', err))
        }
      } catch (notifErr) {
        console.warn('[offerte-check-reactie] notificatie mislukt:', notifErr)
      }
    }

    return res.status(200).json({ offerte: updated })
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'Niet geautoriseerd' || msg === 'Ongeldige sessie') {
      return res.status(401).json({ error: msg })
    }
    console.error('[offerte-check-reactie] error:', error)
    return res.status(500).json({ error: 'Er ging iets mis bij het afronden van de check' })
  }
}
