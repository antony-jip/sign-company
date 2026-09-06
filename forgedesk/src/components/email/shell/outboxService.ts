import { supabase, isSupabaseConfigured } from '@/services/supabaseClient'
import { sendEmail } from '@/services/gmailService'
import type { IngeplandBericht } from '@/types'

/**
 * De outbox is de rij in `ingeplande_berichten` die send-email vóór SMTP
 * schrijft (bron `outbox`). `verwerken`/`verzenden` = onderweg, `mislukt` =
 * blijven hangen. Bovenin Verzonden tonen we die twee toestanden; opnieuw
 * verzenden gaat via send-email met dezelfde inhoud, precies zoals
 * cron-verzend het bericht opbouwt (ontvanger, cc, bcc, onderwerp, body,
 * html). Bijlagen bewaart de outbox alleen als metadata, dus die gaan niet
 * mee; de rij zegt dat erbij.
 */
export const OUTBOX_ONDERWEG = new Set<IngeplandBericht['status']>(['verwerken', 'verzenden' as IngeplandBericht['status']])

export async function getOutboxRijen(): Promise<IngeplandBericht[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ingeplande_berichten')
    .select('*')
    .eq('bron', 'outbox')
    .in('status', ['verwerken', 'verzenden', 'mislukt'])
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data || []) as IngeplandBericht[]
}

export async function getIngeplandRijen(): Promise<IngeplandBericht[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ingeplande_berichten')
    .select('*')
    .or('bron.is.null,bron.eq.ingepland')
    .order('scheduled_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []) as IngeplandBericht[]
}

export function heeftBijlagenZonderInhoud(b: IngeplandBericht): boolean {
  return (b.bijlagen || []).some((x) => !x.content)
}

/** Venster waarbinnen de client-rij bij dezelfde verzendpoging kan horen. */
const TWEELINGRIJ_VENSTER_MS = 15 * 60 * 1000

/**
 * Bij een 502 staan er twee outbox-rijen voor dezelfde mail: deze rij, die
 * send-email zelf op `mislukt` zette, en een rij op `wachtend` die de client
 * er daarna bij zette (`enqueueOutbox` in gmailService keek in zijn dedup
 * alleen naar wachtend/verwerken). Versturen we hier zonder meer, dan levert
 * de verzend-cron een minuut later de tweede kopie bij de klant af.
 *
 * Daarom annuleren we de wachtende tweelingrij vóór het versturen, met
 * dezelfde compare-and-swap als de cron gebruikt (`status = 'wachtend'` in de
 * WHERE). Lukt die claim niet, dan heeft de cron hem al te pakken en is de
 * mail al onderweg; dan versturen we hier niets. Annuleren-vóór-versturen is
 * de veilige volgorde: andersom kan de cron tussen versturen en annuleren
 * alsnog een tweede kopie afleveren.
 *
 * De andere route (mislukt meenemen in de dedup van `enqueueOutbox`) is
 * onveiliger: de cron pakt alleen `wachtend` op, dus dan blijft een mail na
 * een tijdelijke SMTP-storing stil liggen tot iemand hem hier opmerkt.
 */
async function annuleerWachtendeTweelingrij(b: IngeplandBericht): Promise<void> {
  if (!supabase) return
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return

  const basis = new Date(b.created_at).getTime()
  const { data: kandidaten, error } = await supabase
    .from('ingeplande_berichten')
    .select('id, status')
    .eq('user_id', session.user.id)
    .eq('ontvanger', b.ontvanger)
    .eq('onderwerp', b.onderwerp)
    .eq('bron', 'outbox')
    .in('status', ['wachtend', 'verwerken'])
    .gte('created_at', new Date(basis - 60_000).toISOString())
    .lte('created_at', new Date(basis + TWEELINGRIJ_VENSTER_MS).toISOString())
  if (error) throw error
  if (!kandidaten || kandidaten.length === 0) return

  const alOnderweg = new Error('Deze mail wordt nu al door de wachtrij verzonden. Wacht even en ververs.')
  if (kandidaten.some((k) => k.status !== 'wachtend')) throw alOnderweg

  const ids = kandidaten.map((k) => k.id)
  const { data: geannuleerd, error: annuleerFout } = await supabase
    .from('ingeplande_berichten')
    .update({ status: 'geannuleerd' })
    .in('id', ids)
    .eq('status', 'wachtend')
    .select('id')
  if (annuleerFout) throw annuleerFout
  if ((geannuleerd?.length ?? 0) < ids.length) throw alOnderweg
}

/** Opnieuw versturen met dezelfde inhoud; de oude rij gaat op geannuleerd zodat hij niet dubbel telt. */
export async function verstuurOutboxOpnieuw(b: IngeplandBericht): Promise<void> {
  await annuleerWachtendeTweelingrij(b)
  const bijlagen = (b.bijlagen || []).filter((x) => !!x.content)
  await sendEmail(b.ontvanger, b.onderwerp, b.body || b.onderwerp, {
    cc: b.cc,
    bcc: b.bcc,
    html: b.html,
    attachments: bijlagen.length ? bijlagen.map((x) => ({ filename: x.filename, content: x.content, encoding: 'base64' as const })) : undefined,
  })
  if (!supabase) return
  await supabase.from('ingeplande_berichten').update({ status: 'geannuleerd' }).eq('id', b.id).eq('status', 'mislukt')
}

export async function markeerOutboxWeg(id: string): Promise<void> {
  if (!supabase) return
  await supabase.from('ingeplande_berichten').update({ status: 'geannuleerd' }).eq('id', id).eq('status', 'mislukt')
}
