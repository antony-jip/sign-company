import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
    .replace(/\{\{\{contact\.first_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || 'daar')
    .replace(/\{\{\{contact\.last_name(?:\|([^}]*))?\}\}\}/g, (_m, fb) => fb || '')
    .replace(/\{\{\{contact\.email\}\}\}/g, naar)
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, '#')
}

function buildNieuwsbriefHtml(bodyHtml: string, onderwerp: string, preheader?: string): string {
  const preheaderBlok = preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader.trim())}</div>`
    : ''
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(onderwerp)}</title></head>
<body style="margin:0;padding:0;background-color:#F5F4F1;-webkit-font-smoothing:antialiased;">
  ${preheaderBlok}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F4F1;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="background-color:#ffffff;border-radius:12px;padding:36px 36px 28px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#1A1A1A;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 36px 0 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9B9B95;text-align:center;line-height:1.6;">
          Je ontvangt deze mail omdat je contact bent van Sign Company.<br>
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9B9B95;text-decoration:underline;">Uitschrijven</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!resend) return res.status(500).json({ error: 'Resend is niet geconfigureerd' })

  try {
    const { ok, email } = await verifyOwner(req)
    if (!ok) return res.status(403).json({ error: 'Geen toegang' })

    const { onderwerp, html, preheader, naar } = (req.body ?? {}) as {
      onderwerp?: string; html?: string; preheader?: string; naar?: string
    }
    if (!html?.trim()) return res.status(400).json({ error: 'De nieuwsbrief is nog leeg' })

    const ontvanger = (naar?.trim() || email).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ontvanger)) return res.status(400).json({ error: 'Geen geldig testadres' })

    const volledig = resolveMergeTags(buildNieuwsbriefHtml(html, onderwerp?.trim() || '(geen onderwerp)', preheader), ontvanger)

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
