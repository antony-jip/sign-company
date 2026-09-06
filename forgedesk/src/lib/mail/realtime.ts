import { supabase } from '@/services/supabaseClient'
import { mailStore } from './mailStore'
import type { EmailLijstItem, MailMap } from './types'

/** Dezelfde kolommen als emails_list_view; de rest van de rij (concept, fts, tracking) blijft buiten de store. */
const LIJST_KOLOMMEN: Array<keyof EmailLijstItem> = [
  'id', 'gmail_id', 'uid', 'message_id', 'van', 'aan', 'to_addresses', 'cc_addresses', 'onderwerp', 'datum',
  'gelezen', 'starred', 'labels', 'bijlagen', 'map', 'from_name', 'from_address', 'imap_folder', 'pinned',
  'snoozed_until', 'thread_id', 'attachment_meta', 'has_attachments', 'body_text', 'created_at',
  'is_aanvraag', 'aanvraag_zekerheid', 'aanvraag_samenvatting', 'aanvraag_verborgen',
  'wacht_op_reactie', 'beantwoord', 'toegewezen_aan', 'toegewezen_op',
]

export function rijNaarLijstItem(rij: Record<string, unknown>): EmailLijstItem {
  const item: Record<string, unknown> = {}
  for (const kolom of LIJST_KOLOMMEN) if (kolom in rij) item[kolom] = rij[kolom]
  if (typeof item.body_text === 'string' && item.body_text.length > 200) item.body_text = item.body_text.slice(0, 200)
  if (!Array.isArray(item.labels)) item.labels = []
  if (typeof item.bijlagen !== 'number') item.bijlagen = 0
  if (typeof item.gelezen !== 'boolean') item.gelezen = false
  return item as unknown as EmailLijstItem
}

export interface RealtimeWijziging {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Record<string, unknown> | null
  old?: Record<string, unknown> | null
}

/** Eén wijziging van de server in de store zetten. Los van het kanaal, zodat het testbaar is. */
export function verwerkWijziging(wijziging: RealtimeWijziging): void {
  if (wijziging.eventType === 'DELETE') {
    const id = wijziging.old?.id
    if (typeof id === 'string') mailStore.verwijderLokaal(id)
    return
  }
  const rij = wijziging.new
  if (!rij || typeof rij.id !== 'string') return
  const item = rijNaarLijstItem(rij)
  if (wijziging.eventType === 'INSERT') {
    mailStore.voegToe(item)
    return
  }
  // UPDATE op een rij die we nog niet kennen: dan is het een verplaatsing
  // naar een map die we wel geladen hebben (bijvoorbeeld snooze die afloopt).
  if (mailStore.item(item.id)) mailStore.patchVanServer(item.id, item)
  else mailStore.voegToe(item)
}

/**
 * Start het kanaal op `emails` voor deze gebruiker. Geeft een stopfunctie.
 * Na een onderbreking (tweede SUBSCRIBED) laadt de actieve map één keer stil
 * opnieuw: wat tijdens de stilte gebeurde is anders nooit binnengekomen.
 */
export function startRealtime(userId: string, actieveMap: () => MailMap | null): () => void {
  if (!supabase || !userId) return () => {}
  const client = supabase
  const filter = `user_id=eq.${userId}`
  let eerderVerbonden = false
  const kanaal = client
    .channel(`mail-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emails', filter }, (p) => verwerkWijziging(p as RealtimeWijziging))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emails', filter }, (p) => verwerkWijziging(p as RealtimeWijziging))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'emails' }, (p) => verwerkWijziging(p as RealtimeWijziging))
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      if (eerderVerbonden) {
        const map = actieveMap()
        if (map) void mailStore.ververs(map)
      }
      eerderVerbonden = true
    })
  return () => { void client.removeChannel(kanaal) }
}
