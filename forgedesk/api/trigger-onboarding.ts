import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { tasks } from '@trigger.dev/sdk'
import { Resend } from 'resend'
import type { onboardingSequence } from '../src/trigger/onboarding-sequence'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Waar het bericht "er heeft zich iemand aangemeld" naartoe gaat.
const AANMELD_MELDING_AAN = process.env.DOEN_AANMELD_MELDING || 'antony@signcompany.nl'
const AANMELD_MELDING_VAN = 'doen. <noreply@doen.team>'

/**
 * Melden dat er een nieuwe organisatie is.
 *
 * Zonder dit weet niemand dat er iemand binnen is. De nieuwe gebruiker krijgt
 * zijn welkomstmails wel, maar de kant die moet opvolgen hoort niets, en een
 * proefperiode die niemand opvolgt loopt na dertig dagen gewoon af. Dit is de
 * enige plek in de trechter die precies één keer per nieuwe organisatie vuurt
 * (de dedup-guard hierboven bewaakt dat), dus hier hoort hij.
 *
 * Mag het aanmelden zelf nooit laten falen: alles in een try, fouten alleen
 * loggen.
 */
async function meldNieuweAanmelding(gegevens: {
  bedrijf: string
  naam: string
  email: string
  orgId: string
}): Promise<void> {
  const sleutel = process.env.RESEND_API_KEY
  if (!sleutel) {
    console.warn('[onboarding-trigger] geen RESEND_API_KEY, aanmeldmelding overgeslagen')
    return
  }
  try {
    const resend = new Resend(sleutel)
    // Op dit moment heeft de gebruiker stap 1 nog niet ingevuld, dus de naam is
    // vaak nog de standaard die de database-trigger zet. Dan liever eerlijk
    // "nog niet ingevuld" dan een bedrijf dat "Mijn Bedrijf" heet.
    const bedrijf = !gegevens.bedrijf || gegevens.bedrijf === 'Mijn Bedrijf'
      ? ''
      : gegevens.bedrijf
    const regels = [
      ['Bedrijf', bedrijf || 'nog niet ingevuld'],
      ['Naam', gegevens.naam || 'niet ingevuld'],
      ['E-mail', gegevens.email],
      ['Aangemeld', new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })],
    ]
    await resend.emails.send({
      from: AANMELD_MELDING_VAN,
      to: AANMELD_MELDING_AAN,
      replyTo: gegevens.email || undefined,
      subject: `Nieuwe aanmelding: ${bedrijf || gegevens.email || 'onbekend'}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#1A1A1A">
          <p style="margin:0 0 16px">Er heeft zich iemand aangemeld voor doen.</p>
          <table style="border-collapse:collapse">
            ${regels.map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:#6B6B66">${k}</td><td style="padding:2px 0"><strong>${v}</strong></td></tr>`).join('')}
          </table>
          <p style="margin:16px 0 0;color:#6B6B66">De proefperiode duurt 30 dagen. Antwoorden op deze mail gaat rechtstreeks naar de aanmelder.</p>
        </div>`,
      text: `Nieuwe aanmelding voor doen.\n\n${regels.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nDe proefperiode duurt 30 dagen.`,
    })
  } catch (err) {
    console.warn('[onboarding-trigger] aanmeldmelding versturen mislukt:', err instanceof Error ? err.message : err)
  }
}

async function verifyUser(req: VercelRequest): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return { id: user.id, email: user.email || '' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await verifyUser(req)

    // Haal profile → organisatie_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organisatie_id, voornaam, achternaam')
      .eq('id', user.id)
      .single()

    if (!profile?.organisatie_id) {
      return res.status(200).json({ skipped: true, reason: 'no_org' })
    }

    // Haal organisatie → eigenaar check + dedup guard
    const { data: org } = await supabaseAdmin
      .from('organisaties')
      .select('id, naam, eigenaar_id, onboarding_compleet, onboarding_getriggerd_op')
      .eq('id', profile.organisatie_id)
      .single()

    if (!org) {
      return res.status(200).json({ skipped: true, reason: 'org_not_found' })
    }

    if (org.eigenaar_id !== user.id) {
      return res.status(200).json({ skipped: true, reason: 'not_owner' })
    }

    if (org.onboarding_compleet) {
      return res.status(200).json({ skipped: true, reason: 'already_done' })
    }

    // Dedup: skip als onboarding recent is getriggerd (< 5 minuten)
    if (org.onboarding_getriggerd_op) {
      const elapsed = Date.now() - new Date(org.onboarding_getriggerd_op).getTime()
      if (elapsed < 5 * 60 * 1000) {
        return res.status(200).json({ skipped: true, reason: 'recently_triggered' })
      }
    }

    // Markeer als getriggerd (altijd, ongeacht wat hierna gebeurt)
    await supabaseAdmin
      .from('organisaties')
      .update({ onboarding_getriggerd_op: new Date().toISOString() })
      .eq('id', org.id)

    // Eerst melden dat er iemand binnen is, dan pas de reeks starten: die
    // laatste hangt aan Trigger.dev en kan falen, en dan wil je nog steeds
    // weten dat er een aanmelding was.
    await meldNieuweAanmelding({
      bedrijf: org.naam || 'onbekend',
      naam: [profile.voornaam, (profile as { achternaam?: string }).achternaam].filter(Boolean).join(' '),
      email: user.email,
      orgId: org.id,
    })

    // Trigger onboarding email sequence
    const handle = await tasks.trigger<typeof onboardingSequence>("onboarding.email-sequence", {
      userId: user.id,
      userEmail: user.email,
      userName: profile.voornaam || undefined,
    })

    return res.status(200).json({ success: true, task_id: handle.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'

    if (message === 'Niet geautoriseerd' || message === 'Ongeldige sessie') {
      return res.status(401).json({ error: message })
    }

    console.warn('[onboarding-trigger] failed:', message)
    return res.status(500).json({ error: 'trigger_failed' })
  }
}
