import supabase from './supabaseClient'

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

export async function verstuurSupportBericht(bericht: string): Promise<{ gesprek_id: string; bericht: SupportBericht }> {
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

// ── Admin ──

export async function getSupportInbox(): Promise<InboxGesprek[]> {
  const token = await getAuthToken()
  const res = await fetch('/api/support-inbox', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Inbox laden mislukt')
  const data = await res.json() as { gesprekken: InboxGesprek[] }
  return data.gesprekken || []
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
