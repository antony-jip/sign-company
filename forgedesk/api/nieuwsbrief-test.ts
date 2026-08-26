import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const FROM = 'Sign Company <antony@signcompany.nl>'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function verifyOwner(req: VercelRequest): Promise<{ ok: boolean; email: string }> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, email: '' }
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user || user.id !== OWNER_USER_ID) return { ok: false, email: '' }
  return { ok: true, email: user.email || '' }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Vervangt Resend-merge-tags door voorbeeldwaarden (bij een test resolvet Resend
// ze niet, want dit gaat via emails.send i.p.v. een broadcast).
function resolveMergeTags(html: string, naar: string): string {
  return html
    .replace(/\{\{\{contact\.first_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || 'Jan')
    .replace(/\{\{\{contact\.last_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || 'Jansen')
    .replace(/\{\{\{contact\.email\}\}\}/g, naar)
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, '#')
}

interface MailStijl { font?: string; achtergrond?: string; kaart?: string; tekst?: string }

// Zelfde whitelist als nieuwsbrief-verzend.ts (api-bestanden delen geen code).
const WEBFONTS: Record<string, string> = {
  'Hanken Grotesk': 'Hanken+Grotesk:wght@400;600;700;800',
  'Bricolage Grotesque': 'Bricolage+Grotesque:wght@400;600;700;800',
  'Inter': 'Inter:wght@400;600;700;800',
  'Source Serif 4': 'Source+Serif+4:wght@400;600;700',
}
const STANDAARD_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const RESPONSIVE_CSS = '@media only screen and (max-width:600px){ .stack{display:block!important;width:100%!important;padding-bottom:16px!important;} .stack-gap{display:none!important;} .mobiel-verbergen{display:none!important;max-height:0!important;overflow:hidden!important;} }'
const isKleur = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
const isFont = (v: unknown): v is string => typeof v === 'string' && v.length < 200 && /^[\w\s,'"\-]+$/.test(v)
function webfontImport(font: string): string {
  const naam = Object.keys(WEBFONTS).find(n => font.includes(n))
  return naam ? `@import url('https://fonts.googleapis.com/css2?family=${WEBFONTS[naam]}&display=swap');` : ''
}

// In een testmail wil je alles zien, ook de blokken die maar naar een deel van
// de lijst gaan. De markers eromheen vallen weg, de inhoud blijft staan.
function toonAlleLabels(html: string): string {
  return html.replace(/<!--doen:label:[^>]*?-->/g, '').replace(/<!--\/doen:label-->/g, '')
}

function buildNieuwsbriefHtml(bodyHtml: string, onderwerp: string, preheader?: string, stijlIn?: MailStijl): string {
  const font = isFont(stijlIn?.font) ? stijlIn!.font! : STANDAARD_FONT
  const achtergrond = isKleur(stijlIn?.achtergrond) ? stijlIn!.achtergrond! : '#F5F4F1'
  const kaart = isKleur(stijlIn?.kaart) ? stijlIn!.kaart! : '#FFFFFF'
  const tekst = isKleur(stijlIn?.tekst) ? stijlIn!.tekst! : '#1A1A1A'
  const webfont = webfontImport(font)
  const preheaderBlok = preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${achtergrond};">${escapeHtml(preheader.trim())}${'&zwnj;&nbsp;'.repeat(40)}</div>`
    : ''
  // Spiegelt src/components/nieuwsbrief/nieuwsbriefShell.ts (preview).
  return `<!DOCTYPE html>
<html lang="nl" dir="ltr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(onderwerp)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
${webfont ? `<!--[if !mso]><!--><style>${webfont}</style><!--<![endif]-->` : ''}
<style>:root{color-scheme:light dark;supported-color-schemes:light dark;} body{margin:0;padding:0;} table{border-collapse:collapse;} img{-ms-interpolation-mode:bicubic;} ${RESPONSIVE_CSS}</style></head>
<body style="margin:0;padding:0;background-color:${achtergrond};-webkit-font-smoothing:antialiased;word-spacing:normal;">
  ${preheaderBlok}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${achtergrond};padding:32px 16px;">
    <tr><td align="center">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;">
        <tr><td style="background-color:${kaart};border-radius:12px;padding:36px 36px 28px 36px;font-family:${font};font-size:15px;line-height:1.65;color:${tekst};">
          ${toonAlleLabels(bodyHtml)}
        </td></tr>
        <tr><td style="padding:20px 36px 0 36px;font-family:${font};font-size:12px;color:#9B9B95;text-align:center;line-height:1.6;">
          Je ontvangt deze mail omdat je contact bent van Sign Company.<br>
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9B9B95;text-decoration:underline;">Uitschrijven</a>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`
}

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for nieuwsbrief-test, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '3600 s'), prefix: 'rl:nieuwsbrief-test', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] nieuwsbrief-test id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] nieuwsbrief-test id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!resend) return res.status(500).json({ error: 'Resend is niet geconfigureerd' })

  try {
    const { ok, email } = await verifyOwner(req)
    if (!ok) return res.status(403).json({ error: 'Geen toegang' })
    if (!(await enforceRateLimit(OWNER_USER_ID, res))) return

    const { onderwerp, html, preheader, naar, stijl } = (req.body ?? {}) as {
      onderwerp?: string; html?: string; preheader?: string; naar?: string; stijl?: MailStijl
    }
    if (!html?.trim()) return res.status(400).json({ error: 'De nieuwsbrief is nog leeg' })
    if (html.length > 500_000) return res.status(400).json({ error: 'De nieuwsbrief is te groot (max 500 kB HTML)' })

    const ontvanger = (naar?.trim() || email).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ontvanger)) return res.status(400).json({ error: 'Geen geldig testadres' })

    const volledig = resolveMergeTags(buildNieuwsbriefHtml(html, onderwerp?.trim() || '(geen onderwerp)', preheader, stijl), ontvanger)

    const { error } = await resend.emails.send({
      from: FROM,
      to: [ontvanger],
      subject: `[TEST] ${onderwerp?.trim() || '(geen onderwerp)'}`,
      html: volledig,
    })
    if (error) return res.status(502).json({ error: `Test versturen mislukt: ${error.message}` })

    return res.status(200).json({ ok: true, naar: ontvanger })
  } catch (err) {
    console.error('[nieuwsbrief-test] fout:', err)
    return res.status(500).json({ error: (err as Error).message || 'Test versturen mislukt' })
  }
}
