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

/** Opnieuw versturen met dezelfde inhoud; de oude rij gaat op geannuleerd zodat hij niet dubbel telt. */
export async function verstuurOutboxOpnieuw(b: IngeplandBericht): Promise<void> {
  const bijlagen = (b.bijlagen || []).filter((x) => !!x.content)
  await sendEmail(b.ontvanger, b.onderwerp, b.body || b.onderwerp, {
    cc: b.cc,
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
