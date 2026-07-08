import supabase from './supabaseClient'

function db() {
  if (!supabase) throw new Error('Supabase is niet beschikbaar')
  return supabase
}

export type NieuwsbriefStatus = 'concept' | 'gepland' | 'verzonden'

export interface Nieuwsbrief {
  id: string
  user_id: string
  onderwerp: string
  html: string
  status: NieuwsbriefStatus
  preheader: string | null
  resend_broadcast_id: string | null
  aantal_ontvangers: number | null
  gepland_op: string | null
  verzonden_op: string | null
  created_at: string
  updated_at: string
}

export interface NieuwsbriefAfmelding {
  id: string
  user_id: string
  email: string
  reden: string | null
  afgemeld_op: string
}

export async function getNieuwsbrieven(): Promise<Nieuwsbrief[]> {
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Nieuwsbrief[]
}

export async function getNieuwsbrief(id: string): Promise<Nieuwsbrief | null> {
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Nieuwsbrief) ?? null
}

export async function maakConcept(onderwerp: string, html: string): Promise<Nieuwsbrief> {
  const { data: { user } } = await db().auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .insert({ user_id: user.id, onderwerp, html, status: 'concept' })
    .select('*')
    .single()
  if (error) throw error
  return data as Nieuwsbrief
}

export async function updateConcept(
  id: string,
  velden: Partial<Pick<Nieuwsbrief, 'onderwerp' | 'html' | 'preheader'>>,
): Promise<Nieuwsbrief> {
  const { data, error } = await db()
    .from('nieuwsbrieven')
    .update({ ...velden, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Nieuwsbrief
}

export async function verwijderNieuwsbrief(id: string): Promise<void> {
  const { error } = await db().from('nieuwsbrieven').delete().eq('id', id)
  if (error) throw error
}

export async function getAfmeldingen(): Promise<NieuwsbriefAfmelding[]> {
  const { data, error } = await db()
    .from('nieuwsbrief_afmeldingen')
    .select('*')
    .order('afgemeld_op', { ascending: false })
  if (error) throw error
  return (data ?? []) as NieuwsbriefAfmelding[]
}

// Upload een afbeelding naar de publieke documenten-bucket en geef een blijvende
// publieke URL terug (bruikbaar in de nieuwsbrief-HTML). Pad begint met de user-id
// zodat het binnen de bestaande storage-RLS (migratie 027) valt.
export async function uploadAfbeelding(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Alleen afbeeldingen toegestaan')
  if (file.size > 10 * 1024 * 1024) throw new Error('Afbeelding is groter dan 10MB')
  const client = db()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Niet ingelogd')
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${user.id}/nieuwsbrief-media/${crypto.randomUUID()}-${safeName}`
  const { error } = await client.storage.from('documenten').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = client.storage.from('documenten').getPublicUrl(path)
  return data.publicUrl
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await db().auth.getSession()
  if (!session) throw new Error('Niet ingelogd')
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export interface SyncResultaat {
  audienceId: string
  aantalContacten: number
  nieuwToegevoegd: number
  resterend: number
  totaalGeschikt: number
  afgemeld: number
}

export async function syncContacten(): Promise<SyncResultaat> {
  const res = await fetch('/api/nieuwsbrief-contacten-sync', { method: 'POST', headers: await authHeader() })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Synchronisatie mislukt')
  return body as SyncResultaat
}

export interface VerzendResultaat {
  ok: boolean
  status: NieuwsbriefStatus
  aantalOntvangers: number
  broadcastId: string
  nieuwsbrief: Nieuwsbrief | null
}

export async function genereerMetDaan(brief: string, afbeeldingen: string[]): Promise<string> {
  const res = await fetch('/api/nieuwsbrief-ai', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ brief, afbeeldingen }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'AI-generatie mislukt')
  return (body as { html: string }).html
}

export async function verstuurNieuwsbrief(
  nieuwsbriefId: string,
  onderwerp: string,
  html: string,
  preheader?: string,
  scheduledAt?: string,
): Promise<VerzendResultaat> {
  const res = await fetch('/api/nieuwsbrief-verzend', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ nieuwsbriefId, onderwerp, html, preheader, scheduledAt }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Verzenden mislukt')
  return body as VerzendResultaat
}

export async function verstuurTest(
  onderwerp: string,
  html: string,
  preheader?: string,
  naar?: string,
): Promise<string> {
  const res = await fetch('/api/nieuwsbrief-test', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ onderwerp, html, preheader, naar }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Test versturen mislukt')
  return (body as { naar: string }).naar
}

export interface NieuwsbriefStats {
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
}

export async function getStats(nieuwsbriefId: string): Promise<NieuwsbriefStats> {
  const { data, error } = await db()
    .from('nieuwsbrief_events')
    .select('type')
    .eq('nieuwsbrief_id', nieuwsbriefId)
  if (error) throw error
  const stats: NieuwsbriefStats = { delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 }
  for (const rij of data ?? []) {
    const t = (rij as { type: string }).type as keyof NieuwsbriefStats
    if (t in stats) stats[t]++
  }
  return stats
}
