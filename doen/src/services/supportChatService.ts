import supabase from './supabaseClient'

// Support wordt door één persoon beheerd: deze auth-user (niet de hele org).
export const ADMIN_USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
// Org van de support-beheerder — alleen gebruikt om de eigen org uit de klant-lijst te filteren.
export const ADMIN_ORG_ID = '226bf02a-ebb2-4b4c-ae51-cdc9919e4229'

export interface SupportBericht {
  id: string
  gesprek_id: string
  afzender: 'klant' | 'admin'
  bericht: string
  aangemaakt_op: string
  medewerker_id: string | null
}

export interface SupportGesprek {
  id: string
  organisatie_id: string
  org_naam: string
  status: 'open' | 'afgerond'
  aangemaakt_op: string
  laatste_bericht_op: string
  klant_email?: string | null
  // Optioneel: deze kolommen bestaan pas na migratie 201. Vóór die tijd komen ze
  // niet mee in de response en blijft de rest van de inbox gewoon werken.
  toegewezen_aan?: string | null
  toegewezen_op?: string | null
}

export interface SupportMedewerker {
  id: string
  naam: string
}

export interface InboxGesprek extends SupportGesprek {
  laatste_bericht: { bericht: string; afzender: 'klant' | 'admin'; aangemaakt_op: string } | null
}

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Niet ingelogd. Log opnieuw in.')
  return session.access_token
}

// ── Klant ──

// Optie (a): direct via supabase-client, RLS scopet op de eigen organisatie.
export async function getEigenOpenGesprek(): Promise<{ gesprek: SupportGesprek; berichten: SupportBericht[] } | null> {
  if (!supabase) return null
  const { data: gesprek } = await supabase
    .from('support_gesprekken')
    .select('*')
    .eq('status', 'open')
    .order('laatste_bericht_op', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!gesprek) return null

  const { data: berichten } = await supabase
    .from('support_berichten')
    .select('*')
    .eq('gesprek_id', gesprek.id)
    .order('aangemaakt_op', { ascending: true })

  return { gesprek: gesprek as SupportGesprek, berichten: (berichten || []) as SupportBericht[] }
}

export async function verstuurSupportBericht(bericht: string): Promise<{ gesprek_id: string; bericht: SupportBericht; offline?: boolean }> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-bericht', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ bericht }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e?.error || 'Versturen mislukt')
  }
  return res.json()
}

// Klant laat e-mail achter wanneer support offline is.
export async function verstuurKlantEmail(gesprekId: string, email: string): Promise<void> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-bericht', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gesprek_id: gesprekId, email }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e?.error || 'Versturen mislukt')
  }
}

// ── Admin ──

export interface InboxPagina {
  gesprekken: InboxGesprek[]
  totaal: number
  attentie: number
  toewijzingBeschikbaar: boolean
}

export async function getSupportInbox(limiet: number, offset = 0): Promise<InboxPagina> {
  const token = await getAuthToken()
  const params = new URLSearchParams({ limit: String(limiet), offset: String(offset) })
  const res = await fetch(`/api/support-inbox?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Inbox laden mislukt')
  const data = await res.json() as { gesprekken?: InboxGesprek[]; totaal?: number; attentie?: number; toewijzing_beschikbaar?: boolean }
  const gesprekken = data.gesprekken || []
  return {
    gesprekken,
    totaal: data.totaal ?? gesprekken.length,
    attentie: data.attentie ?? 0,
    // Ontbreekt het veld, dan is dit een oudere server: geen toewijzing tonen.
    toewijzingBeschikbaar: data.toewijzing_beschikbaar === true,
  }
}

export async function getSupportMedewerkers(): Promise<SupportMedewerker[]> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox?medewerkers=1', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Medewerkers laden mislukt')
  const data = await res.json() as { medewerkers?: SupportMedewerker[] }
  return data.medewerkers || []
}

/**
 * Wijst een gesprek toe, of geeft het vrij met null.
 *
 * Gooit een MigratieOntbreektError zolang migratie 201 niet gedraaid is, zodat de
 * UI daar een eigen melding aan kan hangen in plaats van 'Interne fout'.
 */
export class MigratieOntbreektError extends Error {}

export async function zetSupportToewijzing(
  gesprekId: string,
  medewerkerId: string | null
): Promise<{ gesprek: SupportGesprek }> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gesprek_id: gesprekId, toegewezen_aan: medewerkerId }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string; migratie_ontbreekt?: boolean }
    if (e?.migratie_ontbreekt) throw new MigratieOntbreektError(e.error || 'Toewijzen kan nog niet')
    throw new Error(e?.error || 'Toewijzen mislukt')
  }
  return res.json()
}

// Alleen de badge-teller: de sidebar hoeft de gesprekslijst niet te laden.
export async function getSupportAttentie(): Promise<number> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox?attentie=1', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Attentie laden mislukt')
  const data = await res.json() as { attentie?: number }
  return data.attentie ?? 0
}

export interface SupportAccount {
  id: string
  naam: string
}

export async function getSupportAccounts(): Promise<SupportAccount[]> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox?accounts=1', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Accounts laden mislukt')
  const data = await res.json() as { accounts: SupportAccount[] }
  return data.accounts || []
}

export async function verstuurUpdateNaarAccount(organisatieId: string, bericht: string): Promise<{ gesprek_id: string; bericht: SupportBericht }> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ organisatie_id: organisatieId, bericht }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e?.error || 'Versturen mislukt')
  }
  return res.json()
}

export async function verstuurBroadcast(bericht: string): Promise<{ verstuurd: number }> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ broadcast: true, bericht }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e?.error || 'Broadcast mislukt')
  }
  return res.json()
}

export async function getSupportThread(gesprekId: string): Promise<{ gesprek: SupportGesprek; berichten: SupportBericht[] }> {
  const token = await getAuthToken()
  const res = await fetch(`/api/support-inbox?gesprek_id=${encodeURIComponent(gesprekId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Gesprek laden mislukt')
  return res.json()
}

export async function zetSupportStatus(gesprekId: string, status: 'open' | 'afgerond'): Promise<{ gesprek: SupportGesprek }> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gesprek_id: gesprekId, status }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e?.error || 'Status bijwerken mislukt')
  }
  return res.json()
}

export async function verstuurSupportAntwoord(gesprekId: string, bericht: string): Promise<{ bericht: SupportBericht }> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gesprek_id: gesprekId, bericht }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(e?.error || 'Versturen mislukt')
  }
  return res.json()
}
