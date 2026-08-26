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
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
}

async function registreerAfmelding(email: string, reden: string, nieuwsbriefId: string | null): Promise<void> {
  const genormaliseerd = email.trim().toLowerCase()
  if (!isEmail(genormaliseerd)) return
  // Bestaat de afmelding al, dan blijft de oorspronkelijke reden en nieuwsbrief
  // staan: de eerste afmelding is de interessante, niet een latere herhaling.
  await supabase
    .from('nieuwsbrief_afmeldingen')
    .upsert(
      { user_id: OWNER_USER_ID, email: genormaliseerd, reden, nieuwsbrief_id: nieuwsbriefId },
      { onConflict: 'user_id,email', ignoreDuplicates: true },
    )
}

function eersteOntvanger(data: Record<string, unknown>): string {
  const to = data.to
  if (Array.isArray(to)) return typeof to[0] === 'string' ? to[0] : ''
  return typeof to === 'string' ? to : (typeof data.email === 'string' ? data.email : '')
}

// Resend meldt een bounce met een type/subtype. Alleen 'Permanent' betekent:
// dit adres bestaat niet meer, haal het uit de lijst. Een volle mailbox of een
// tijdelijke weigering mag nooit iemand permanent uitsluiten.
function isHardeBounce(data: Record<string, unknown>): boolean {
  const bounce = (data.bounce ?? {}) as Record<string, unknown>
  const soort = String(bounce.type ?? data.type ?? '').toLowerCase()
  return soort.includes('permanent') || soort.includes('hard')
}

function bounceReden(data: Record<string, unknown>): string {
  const bounce = (data.bounce ?? {}) as Record<string, unknown>
  const delen = [bounce.type, bounce.subType, bounce.message].filter(v => typeof v === 'string' && v)
  return delen.join(' · ').slice(0, 300) || 'onbekend'
}

// Welke nieuwsbrief hoort bij dit event? Gerichte verzendingen dragen de tag
// nieuwsbrief_id, broadcasts alleen een broadcast_id.
async function vindNieuwsbriefId(data: Record<string, unknown>): Promise<string | null> {
  const tags = data.tags as Record<string, string> | Array<{ name: string; value: string }> | undefined
  const tagId = Array.isArray(tags)
    ? tags.find(t => t?.name === 'nieuwsbrief_id')?.value
    : (tags && typeof tags === 'object' ? tags.nieuwsbrief_id : undefined)
  if (tagId && /^[0-9a-f-]{36}$/i.test(tagId)) return tagId

  const broadcastId = typeof data.broadcast_id === 'string' ? data.broadcast_id : ''
  if (!broadcastId) return null
  const { data: nb } = await supabase
    .from('nieuwsbrieven').select('id').eq('resend_broadcast_id', broadcastId).maybeSingle()
  return (nb?.id as string | undefined) ?? null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const verwacht = process.env.NIEUWSBRIEF_WEBHOOK_TOKEN
  if (!verwacht || req.query.token !== verwacht) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const event = (req.body ?? {}) as { type?: string; data?: Record<string, unknown> }
    const type = event.type ?? ''
    const data = event.data ?? {}

    // Afmeldingen via de Resend-lijst zelf (audience-breed, geen nieuwsbrief).
    if (type === 'contact.updated' || type === 'contact.created') {
      if (data.unsubscribed === true && typeof data.email === 'string') {
        await registreerAfmelding(data.email, 'uitgeschreven', null)
      }
      return res.status(200).json({ ok: true })
    }

    const eventType = EVENT_TYPE[type]
    if (!eventType) return res.status(200).json({ ok: true })

    const email = eersteOntvanger(data).trim().toLowerCase()
    if (!isEmail(email)) return res.status(200).json({ ok: true })

    const nieuwsbriefId = await vindNieuwsbriefId(data)

    if (nieuwsbriefId) {
      // Telt herhaling mee en houdt created_at op "voor het eerst gezien"
      // (functie uit migratie 225; een gewone upsert kan dat niet).
      const link = eventType === 'clicked' && typeof (data.click as Record<string, unknown>)?.link === 'string'
        ? (data.click as Record<string, string>).link
        : null
      const { error } = await supabase.rpc('nieuwsbrief_event_registreren', {
        p_nieuwsbrief_id: nieuwsbriefId,
        p_email: email,
        p_type: eventType,
        p_link: link,
      })
      if (error) console.error('[nieuwsbrief-webhook] event registreren mislukt:', error)

      // Elke klik apart, zodat je per link kunt tellen welke knop werkte.
      if (eventType === 'clicked' && link) {
        await supabase.from('nieuwsbrief_kliks').insert({ nieuwsbrief_id: nieuwsbriefId, email, link })
      }
    }

    if (eventType === 'bounced') {
      const hard = isHardeBounce(data)
      const { error } = await supabase.rpc('nieuwsbrief_adresprobleem_registreren', {
        p_user_id: OWNER_USER_ID,
        p_email: email,
        p_soort: 'bounce',
        p_hard: hard,
        p_reden: bounceReden(data),
        p_nieuwsbrief_id: nieuwsbriefId,
      })
      if (error) console.error('[nieuwsbrief-webhook] bounce registreren mislukt:', error)
    }

    if (eventType === 'complained') {
      const { error } = await supabase.rpc('nieuwsbrief_adresprobleem_registreren', {
        p_user_id: OWNER_USER_ID,
        p_email: email,
        p_soort: 'klacht',
        p_hard: true,
        p_reden: 'gemarkeerd als spam',
        p_nieuwsbrief_id: nieuwsbriefId,
      })
      if (error) console.error('[nieuwsbrief-webhook] klacht registreren mislukt:', error)
      await registreerAfmelding(email, 'klacht', nieuwsbriefId)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[nieuwsbrief-webhook] fout:', err)
    return res.status(200).json({ ok: true })
  }
}
