import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { tasks } from '@trigger.dev/sdk'
import type { logPortaalActiviteit } from '../src/trigger/portaal-activiteit-log'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
async function isRateLimited(ip: string, endpoint: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const { data } = await supabaseAdmin.rpc('check_rate_limit', { p_key: `${endpoint}:${ip}`, p_max_count: maxCount, p_window_seconds: windowSeconds })
  return data === true
}

const APP_URL = process.env.APP_URL || 'https://app.doen.team'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface EersteViewOfferte {
  id: string
  user_id: string
  nummer: string | null
  titel: string | null
  klant_naam: string | null
}

// Eerste keer dat de klant een verzonden offerte in het portaal opent:
// in-app notificatie per offerte + één mail naar de maker. Zelfde mechaniek
// en template als api/offerte-publiek.ts (api-files zijn standalone).
async function meldEersteOfferteViews(offertes: EersteViewOfferte[]): Promise<void> {
  const nu = new Date().toISOString()
  const klantNaam = offertes[0].klant_naam || 'Je klant'

  try {
    await supabaseAdmin.from('notificaties').insert(offertes.map((o) => ({
      id: crypto.randomUUID(),
      user_id: o.user_id,
      type: 'offerte_bekeken',
      titel: 'Je offerte wordt bekeken',
      bericht: `${o.klant_naam || 'Je klant'} opende zojuist offerte ${o.nummer || ''} in het klantportaal`,
      link: `/offertes/${o.id}/detail`,
      gelezen: false,
      created_at: nu,
    })))
  } catch (err) {
    console.error('[portaal-bekeken] notificatie mislukt:', err)
  }

  try {
    const { data: emailSettings } = await supabaseAdmin
      .from('user_email_settings')
      .select('gmail_address')
      .eq('user_id', offertes[0].user_id)
      .single()
    if (!emailSettings?.gmail_address) return

    const onderwerp = offertes.length === 1
      ? `${klantNaam} bekijkt je offerte`
      : `${klantNaam} bekijkt je offertes`
    const itemBlocks = offertes.map((o) => {
      const itemTitel = o.titel ? `${o.nummer || ''} — ${o.titel}` : (o.nummer || '')
      return `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #EBEBEB; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: #1A1A1A;">${escapeHtml(itemTitel)}</td></tr><tr><td style="padding: 0 20px 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #6B6B66;">Zojuist voor het eerst geopend in het klantportaal door ${escapeHtml(klantNaam)}. Dit is een goed moment om even te bellen.</td></tr></table></td></tr>`
    }).join('')
    const ctaUrl = `${APP_URL}/offertes/${offertes[0].id}/detail`
    const ctaBlock = `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">Bekijk in doen. &rarr;</a></td></tr>`
    const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #F5F4F1;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;"><tr><td style="padding: 0 0 24px 0; text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #F15025;">.</span></td></tr><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 36px 36px 32px 36px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">${escapeHtml(onderwerp)}</td></tr>${itemBlocks}${ctaBlock}</table></td></tr></table></td></tr><tr><td style="padding: 20px 0 0 0; text-align: center;"><div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div><span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #9B9B95;"><span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> slim gedaan.</span></td></tr></table></td></tr></table></body></html>`

    const { Resend } = await import('resend')
    const resendClient = new Resend(process.env.RESEND_API_KEY)
    await resendClient.emails.send({
      from: 'doen. <noreply@doen.team>',
      to: emailSettings.gmail_address,
      subject: onderwerp,
      html,
    })
    console.log('[portaal-bekeken] eerste-view mail verzonden naar:', emailSettings.gmail_address)
  } catch (err) {
    console.error('[portaal-bekeken] eerste-view mail mislukt:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown'
  if (await isRateLimited(clientIp, 'portaal-bekeken', 20, 60)) {
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

    // Valideer token
    const { data: portaal } = await supabaseAdmin
      .from('project_portalen')
      .select('id, actief, verloopt_op')
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

    // Update bekeken_op voor items (alleen waar bekeken_op IS NULL). Het
    // .is(null)-filter is tegelijk de atomische first-view-claim per item.
    let bekekenOfferteIds: string[] = []
    if (item_ids && item_ids.length > 0) {
      const { data: geclaimd } = await supabaseAdmin
        .from('portaal_items')
        .update({ bekeken_op: now })
        .eq('portaal_id', portaal.id)
        .in('id', item_ids)
        .is('bekeken_op', null)
        .select('id, offerte_id')
      bekekenOfferteIds = [...new Set(
        (geclaimd || []).map((i) => i.offerte_id).filter((v): v is string => !!v)
      )]
    }

    // Verzonden offertes die de klant nu voor het eerst opent: status →
    // bekeken (het .eq('status','verzonden')-filter arbitreert atomisch,
    // ook tegenover het publiek_token-pad) en meld de maker.
    if (bekekenOfferteIds.length > 0) {
      const { data: eersteViews, error: claimError } = await supabaseAdmin
        .from('offertes')
        .update({ status: 'bekeken', bekeken_door_klant: true, eerste_bekeken_op: now, laatst_bekeken_op: now })
        .in('id', bekekenOfferteIds)
        .eq('status', 'verzonden')
        .select('id, user_id, nummer, titel, klant_naam')
      if (claimError) console.error('[portaal-bekeken] offerte-claim mislukt:', claimError)
      if (eersteViews && eersteViews.length > 0) {
        // Voor de response afhandelen: na res.json() kapt Vercel async werk af.
        await meldEersteOfferteViews(eersteViews as EersteViewOfferte[])
      }
    }

    // Log bekeken activiteit via Trigger.dev (fire-and-forget, fallback naar directe insert)
    const logPayload = { portaal_id: portaal.id, actie: 'bekeken', metadata: { ip: clientIp, item_count: item_ids?.length || 0 } }
    try {
      await tasks.trigger<typeof logPortaalActiviteit>("log-portaal-activiteit", {
        portaalId: portaal.id,
        actie: 'bekeken',
        metadata: logPayload.metadata,
      });
    } catch {
      // Fallback: directe insert (lokale dev zonder Trigger.dev)
      await supabaseAdmin.from('portaal_activiteiten').insert(logPayload).then(() => {}, () => {})
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('portaal-bekeken error:', error)
    return res.status(500).json({ error: 'Er ging iets mis' })
  }
}
