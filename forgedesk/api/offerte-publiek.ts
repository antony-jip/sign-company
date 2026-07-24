import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for offerte-publiek, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:offerte-publiek', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] offerte-publiek id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] offerte-publiek id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return 'unknown'
}

// Whitelist: velden die de klant mag zien
const OFFERTE_VELDEN = [
  'id', 'nummer', 'titel', 'status', 'subtotaal', 'btw_bedrag', 'totaal',
  'geldig_tot', 'notities', 'voorwaarden', 'intro_tekst', 'outro_tekst',
  'klant_naam', 'klant_id', 'created_at', 'updated_at',
  'geaccepteerd_door', 'geaccepteerd_op',
  'wijziging_opmerking', 'wijziging_ingediend_op',
  'publieke_link_geopend_op', 'publieke_link_views',
  'afrondingskorting_excl_btw', 'aangepast_totaal',
  'gekozen_items', 'gekozen_varianten',
] as const

const ITEM_VELDEN = [
  'id', 'offerte_id', 'beschrijving', 'aantal', 'eenheidsprijs',
  'btw_percentage', 'korting_percentage', 'totaal', 'volgorde',
  'soort', 'extra_velden', 'detail_regels', 'is_optioneel',
  'breedte_mm', 'hoogte_mm', 'oppervlakte_m2', 'afmeting_vrij',
  'foto_url', 'foto_op_offerte', 'bijlage_url', 'bijlage_type', 'bijlage_naam',
  'prijs_varianten', 'actieve_variant_id',
] as const

function pick<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): Partial<T> {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (key in obj) result[key] = obj[key]
  }
  return result as Partial<T>
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

// Eerste keer dat de klant de verzonden offerte opent: in-app notificatie +
// mail naar de maker. Dit is hét moment om te bellen; daarom direct melden.
// Alleen bij de allereerste view en alleen als de offerte al verzonden was,
// zodat een eigen preview vóór het versturen niets afvuurt.
async function meldEersteView(offerte: Record<string, unknown>): Promise<void> {
  const nu = new Date().toISOString()
  const klantNaam = (offerte.klant_naam as string) || 'Je klant'
  const nummer = (offerte.nummer as string) || ''
  const titel = (offerte.titel as string) || ''

  try {
    await supabaseAdmin.from('notificaties').insert({
      id: crypto.randomUUID(),
      user_id: offerte.user_id,
      type: 'offerte_bekeken',
      titel: 'Je offerte wordt bekeken',
      bericht: `${klantNaam} opende zojuist offerte ${nummer}`,
      link: `/offertes/${offerte.id}/detail`,
      gelezen: false,
      created_at: nu,
    })
  } catch (err) {
    console.error('[offerte-publiek] notificatie mislukt:', err)
  }

  try {
    const { data: emailSettings } = await supabaseAdmin
      .from('user_email_settings')
      .select('gmail_address')
      .eq('user_id', offerte.user_id)
      .single()
    if (!emailSettings?.gmail_address) return

    const onderwerp = `${klantNaam} bekijkt je offerte`
    const notifItemTitel = titel ? `${nummer} — ${titel}` : nummer
    const notifCtaUrl = `${APP_URL}/offertes/${offerte.id}/detail`
    const itemBlock = `<tr><td style="padding: 0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #EBEBEB; border-radius: 8px;"><tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: #1A1A1A;">${escapeHtml(notifItemTitel)}</td></tr><tr><td style="padding: 0 20px 16px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; color: #6B6B66;">Zojuist voor het eerst geopend door ${escapeHtml(klantNaam)}. Dit is een goed moment om even te bellen.</td></tr></table></td></tr>`
    const ctaBlock = `<tr><td style="padding: 8px 0 0 0;" align="center"><a href="${escapeHtml(notifCtaUrl)}" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">Bekijk in doen. &rarr;</a></td></tr>`
    const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #F5F4F1;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;"><tr><td style="padding: 0 0 24px 0; text-align: center;"><span style="font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #F15025;">.</span></td></tr><tr><td><table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding: 36px 36px 32px 36px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">${escapeHtml(onderwerp)}</td></tr>${itemBlock}${ctaBlock}</table></td></tr></table></td></tr><tr><td style="padding: 20px 0 0 0; text-align: center;"><div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div><span style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; color: #9B9B95;"><span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> slim gedaan.</span></td></tr></table></td></tr></table></body></html>`

    const { Resend } = await import('resend')
    const resendClient = new Resend(process.env.RESEND_API_KEY)
    await resendClient.emails.send({
      from: 'doen. <noreply@doen.team>',
      to: emailSettings.gmail_address,
      subject: onderwerp,
      html,
    })
    console.log('[offerte-publiek] eerste-view mail verzonden naar:', emailSettings.gmail_address)
  } catch (err) {
    console.error('[offerte-publiek] eerste-view mail mislukt:', err)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const token = req.query.token as string
    if (!token) return res.status(400).json({ error: 'Token is verplicht' })

    if (!(await enforceRateLimit(getClientIp(req), res))) return

    // Zoek offerte op publiek_token
    const { data: offerte, error: offerteError } = await supabaseAdmin
      .from('offertes')
      .select('*')
      .eq('publiek_token', token)
      .single()

    if (offerteError || !offerte) {
      return res.status(404).json({ error: 'Offerte niet gevonden' })
    }

    if (offerte.publiek_token_verloopt_op && new Date(offerte.publiek_token_verloopt_op) < new Date()) {
      return res.status(410).json({ error: 'Deze publieke link is verlopen' })
    }

    // Increment views
    const updates: Record<string, unknown> = {
      publieke_link_views: (offerte.publieke_link_views || 0) + 1,
      bekeken_door_klant: true,
      laatst_bekeken_op: new Date().toISOString(),
      aantal_keer_bekeken: (offerte.aantal_keer_bekeken || 0) + 1,
    }

    // Status → bekeken als nog verzonden
    if (offerte.status === 'verzonden') {
      updates.status = 'bekeken'
    }

    await supabaseAdmin.from('offertes').update(updates).eq('id', offerte.id)

    // Eerste-view-claim apart en atomisch: het .is(null)-filter laat de DB
    // arbitreren, zodat twee gelijktijdige eerste views (mail-scanner + klant)
    // nooit allebei een notificatie/mail afvuren.
    let claimUpdates: Record<string, unknown> = {}
    if (!offerte.publieke_link_geopend_op) {
      const nu = new Date().toISOString()
      claimUpdates = {
        publieke_link_geopend_op: nu,
        eerste_bekeken_op: offerte.eerste_bekeken_op || nu,
      }
      const { data: claim } = await supabaseAdmin
        .from('offertes')
        .update(claimUpdates)
        .eq('id', offerte.id)
        .is('publieke_link_geopend_op', null)
        .select('id')
      const eersteClaim = (claim?.length ?? 0) > 0

      // Voor de response afhandelen: na res.json() kapt Vercel async werk af.
      if (eersteClaim && offerte.status === 'verzonden') {
        await meldEersteView(offerte)
      }
    }

    // Haal items op
    const { data: rawItems } = await supabaseAdmin
      .from('offerte_items')
      .select('*')
      .eq('offerte_id', offerte.id)
      .order('volgorde', { ascending: true })

    const items = (rawItems || []).map((item: Record<string, unknown>) => pick(item, ITEM_VELDEN))

    // Bedrijfsgegevens zijn org-breed: lees het profiel van de organisatie-
    // eigenaar i.p.v. de maker, zodat elk teamlid dezelfde gegevens toont.
    let bedrijfUserId = offerte.user_id as string
    const bedrijfOrgId = (offerte.organisatie_id as string | null) ?? null
    if (bedrijfOrgId) {
      const { data: org } = await supabaseAdmin
        .from('organisaties')
        .select('eigenaar_id')
        .eq('id', bedrijfOrgId)
        .maybeSingle()
      if (org?.eigenaar_id) bedrijfUserId = org.eigenaar_id as string
    }
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, bedrijfs_adres, bedrijfs_telefoon, bedrijfs_email, bedrijfs_website, kvk_nummer, btw_nummer, iban, logo_url')
      .eq('id', bedrijfUserId)
      .single()

    // Haal klant gegevens
    const { data: klant } = await supabaseAdmin
      .from('klanten')
      .select('bedrijfsnaam, contactpersoon, email, adres, postcode, stad')
      .eq('id', offerte.klant_id)
      .single()

    // Haal document style op (voor briefpapier, kleuren, etc. in de PDF) —
    // org-first via offerte.organisatie_id, user_id-fallback voor legacy.
    const offerteOrgId = (offerte.organisatie_id as string | null) ?? null
    let docStyle: Record<string, unknown> | null = null
    if (offerteOrgId) {
      const { data } = await supabaseAdmin
        .from('document_styles')
        .select('*')
        .eq('organisatie_id', offerteOrgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      docStyle = data
    }
    if (!docStyle) {
      const { data } = await supabaseAdmin
        .from('document_styles')
        .select('*')
        .eq('user_id', offerte.user_id)
        .maybeSingle()
      docStyle = data
    }

    // Merge status update in return data
    const safeOfferte = pick({ ...offerte, ...updates, ...claimUpdates }, OFFERTE_VELDEN)

    return res.status(200).json({
      offerte: safeOfferte,
      items,
      bedrijf: profile || null,
      klant: klant || null,
      docStyle: docStyle || null,
    })
  } catch (error: unknown) {
    console.error('offerte-publiek error:', error)
    return res.status(500).json({ error: 'Er ging iets mis' })
  }
}
