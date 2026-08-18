import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Resend roept dit endpoint aan bij afleveringen, opens, clicks, bounces,
// klachten en afmeldingen. Beveiliging via een gedeeld token in de URL
// (?token=...), meegegeven bij het instellen van de webhook in Resend.
// Fail closed als het env-token ontbreekt.
const OWNER_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

const EVENT_TYPE: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
}

async function registreerAfmelding(email: string, reden: string): Promise<void> {
  const genormaliseerd = email.trim().toLowerCase()
  if (!isEmail(genormaliseerd)) return
  await supabase
    .from('nieuwsbrief_afmeldingen')
    .upsert({ user_id: OWNER_USER_ID, email: genormaliseerd, reden }, { onConflict: 'user_id,email', ignoreDuplicates: true })
}

function eersteOntvanger(data: Record<string, unknown>): string {
  const to = data.to
  if (Array.isArray(to)) return typeof to[0] === 'string' ? to[0] : ''
  return typeof to === 'string' ? to : (typeof data.email === 'string' ? data.email : '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const verwacht = process.env.NIEUWSBRIEF_WEBHOOK_TOKEN
  if (!verwacht || req.query.token !== verwacht) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const event = (req.body ?? {}) as { type?: string; data?: Record<string, unknown> }
    const type = event.type ?? ''
    const data = event.data ?? {}

    // Afmeldingen (audience-breed, niet per nieuwsbrief).
    if (type === 'contact.updated' || type === 'contact.created') {
      if (data.unsubscribed === true && typeof data.email === 'string') {
        await registreerAfmelding(data.email, 'uitgeschreven')
      }
      return res.status(200).json({ ok: true })
    }

    // E-mail-events per nieuwsbrief (gekoppeld via broadcast_id).
    const eventType = EVENT_TYPE[type]
    if (eventType) {
      const broadcastId = typeof data.broadcast_id === 'string' ? data.broadcast_id : ''
      const email = eersteOntvanger(data).trim().toLowerCase()
      if (broadcastId && isEmail(email)) {
        const { data: nb } = await supabase
          .from('nieuwsbrieven').select('id').eq('resend_broadcast_id', broadcastId).maybeSingle()
        if (nb?.id) {
          const link = eventType === 'clicked' && typeof (data.click as Record<string, unknown>)?.link === 'string'
            ? (data.click as Record<string, string>).link
            : null
          await supabase
            .from('nieuwsbrief_events')
            .upsert({ nieuwsbrief_id: nb.id, email, type: eventType, link }, { onConflict: 'nieuwsbrief_id,email,type', ignoreDuplicates: true })
        }
      }
      if (eventType === 'complained') await registreerAfmelding(email, 'klacht')
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[nieuwsbrief-webhook] fout:', err)
    return res.status(200).json({ ok: true })
  }
}
