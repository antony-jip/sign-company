import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId,
} from './supabaseHelpers'
import { safeSetItem } from '@/utils/localStorageUtils'
import { normaliseerNaam } from '@/utils/naamNormalisatie'
import { DEFAULT_OFFERTE_VOORWAARDEN } from '@/utils/defaults'
import { getOffertesByProject } from './offerteService'
import { getWerkbonnenByProject } from './werkbonService'
import { getFacturenByProject } from './factuurService'
import { getTakenByProject } from './projectService'
import type {
  Profile,
  AppSettings,
  Organisatie,
  Medewerker,
  Notificatie,
  AuditLogEntry,
} from '@/types'

// ============ PROFILE ============

export async function getProfile(userId: string): Promise<Profile | null> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }
  const profiles = getLocalData<Profile>('profiles')
  return profiles.find((p) => p.id === userId) || null
}

export async function uploadAvatar(userId: string, file: Blob): Promise<string> {
  assertId(userId, 'user_id')
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase niet geconfigureerd')
  }
  const path = `${userId}/avatar.jpg`
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'image/jpeg',
  })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)
  if (updateError) throw updateError
  return avatarUrl
}

async function syncMedewerkerNaam(userId: string, voornaam: string, achternaam: string): Promise<void> {
  if (!supabase) return
  const naam = normaliseerNaam(`${voornaam || ''} ${achternaam || ''}`)
  if (!naam) return
  const orgId = await getOrgId()
  if (!orgId) return
  const { error } = await supabase
    .from('medewerkers')
    .update({ naam, updated_at: now() })
    .eq('user_id', userId)
    .eq('organisatie_id', orgId)
  if (error) console.warn('[syncMedewerkerNaam] update faalde:', error.message)
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  assertId(userId, 'user_id')
  const naamGewijzigd = updates.voornaam !== undefined || updates.achternaam !== undefined
  const genormaliseerd: Partial<Profile> = { ...updates }
  if (updates.voornaam !== undefined) genormaliseerd.voornaam = normaliseerNaam(updates.voornaam)
  if (updates.achternaam !== undefined) genormaliseerd.achternaam = normaliseerNaam(updates.achternaam)

  if (isSupabaseConfigured() && supabase) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    const merged = existing
      ? { ...existing, ...genormaliseerd, updated_at: now() }
      : { id: userId, ...genormaliseerd, created_at: now(), updated_at: now() }

    const { error } = await supabase
      .from('profiles')
      .upsert(merged, { onConflict: 'id' })
    if (error) throw error

    if (naamGewijzigd) {
      await syncMedewerkerNaam(userId, merged.voornaam || '', merged.achternaam || '')
    }
    return merged as Profile
  }
  const profiles = getLocalData<Profile>('profiles')
  const index = profiles.findIndex((p) => p.id === userId)
  if (index === -1) {
    // Create profile if not found in localStorage
    const newProfile: Profile = {
      id: userId,
      voornaam: '',
      achternaam: '',
      email: '',
      telefoon: '',
      avatar_url: '',
      logo_url: '',
      bedrijfsnaam: '',
      bedrijfs_adres: '',
      kvk_nummer: '',
      btw_nummer: '',
      taal: 'nl',
      theme: 'light',
      created_at: now(),
      updated_at: now(),
      ...genormaliseerd,
    }
    profiles.push(newProfile)
    setLocalData('profiles', profiles)
    return newProfile
  }
  profiles[index] = { ...profiles[index], ...genormaliseerd, updated_at: now() }
  setLocalData('profiles', profiles)
  return profiles[index]
}

// ============ APP SETTINGS ============

const DEFAULT_PIPELINE_STAPPEN = [
  { key: 'concept', label: 'Concept', kleur: 'gray', volgorde: 0, actief: true },
  { key: 'verzonden', label: 'Verzonden', kleur: 'blue', volgorde: 1, actief: true },
  { key: 'bekeken', label: 'Bekeken', kleur: 'teal', volgorde: 2, actief: true },
  { key: 'goedgekeurd', label: 'Goedgekeurd', kleur: 'green', volgorde: 3, actief: true },
  { key: 'afgewezen', label: 'Afgewezen', kleur: 'red', volgorde: 4, actief: true },
]

export function getDefaultAppSettings(userId: string): AppSettings {
  return {
    id: userId,
    user_id: userId,
    branche: 'Reclame & Signbedrijf',
    branche_preset: 'sign_company',
    valuta: 'EUR',
    valuta_symbool: '\u20AC',
    standaard_btw: 21,
    pipeline_stappen: DEFAULT_PIPELINE_STAPPEN,
    offerte_geldigheid_dagen: 30,
    offerte_prefix: 'OFF',
    offerte_volgnummer: 1,
    auto_follow_up: true,
    follow_up_dagen: 7,
    melding_follow_up: true,
    melding_verlopen: true,
    melding_nieuwe_offerte: true,
    melding_status_wijziging: true,
    email_handtekening: '',
    handtekening_afbeelding: '',
    handtekening_afbeelding_grootte: 64,
    primaire_kleur: '#2563eb',
    secundaire_kleur: '#7c3aed',
    toon_conversie_rate: true,
    toon_dagen_open: true,
    toon_follow_up_indicatoren: true,
    dashboard_widgets: ['follow_ups', 'pipeline', 'kpi', 'kalender'],
    sidebar_items: [
      'Dashboard',
      'Projecten', 'Offertes', 'Facturen', 'Klanten', 'Werkbonnen',
      'Planning', 'Taken',
      'Email', 'Portaal',
      'Financieel',
    ],
    calculatie_categorieen: ['Materiaal', 'Arbeid', 'Transport', 'Apparatuur', 'Overig'],
    calculatie_eenheden: ['stuks', 'm\u00B2', 'm\u00B9', 'uur', 'dag', 'meter', 'kg', 'set'],
    calculatie_standaard_marge: 35,
    calculatie_toon_inkoop_in_offerte: false,
    calculatie_uren_velden: ['Montage', 'Voorbereiding', 'Ontwerp & DTP', 'Applicatie'],
    offerte_regel_velden: ['Materiaal', 'Lay-out', 'Montage', 'Opmerking'],
    factuur_prefix: 'FAC',
    factuur_volgnummer: 1,
    factuur_betaaltermijn_dagen: 30,
    factuur_voorwaarden: 'Betaling binnen 30 dagen na factuurdatum.',
    factuur_intro_tekst: '',
    factuur_outro_tekst: '',
    creditnota_prefix: 'CN',
    werkbon_prefix: 'WB',
    werkbon_volgnummer: 1,
    herinnering_1_tekst: '',
    herinnering_1_onderwerp: 'Herinnering: Factuur {factuur_nummer}',
    herinnering_2_tekst: '',
    herinnering_2_onderwerp: '2e herinnering: Factuur {factuur_nummer}',
    aanmaning_tekst: '',
    aanmaning_onderwerp: 'Aanmaning: Factuur {factuur_nummer}',
    standaard_uurtarief: 75,
    offerte_intro_tekst: '',
    offerte_outro_tekst: '',
    offerte_voorwaarden: DEFAULT_OFFERTE_VOORWAARDEN,
    afzender_naam: '',
    email_fetch_limit: 200,
    forgie_enabled: true,
    forgie_bedrijfscontext: '',
    quick_action_items: ['project', 'mail', 'offerte', 'klant'],
    ai_tone_of_voice: '',
    mollie_api_key: '',
    mollie_enabled: false,
    exact_online_client_id: '',
    exact_online_client_secret: '',
    exact_online_connected: false,
    exact_administratie_id: '',
    exact_verkoopboek: '80',
    exact_grootboek: '8090',
    exact_btw_hoog: '2',
    exact_btw_laag: '',
    exact_btw_nul: '',
    project_prefix: 'PRJ',
    werkbon_monteur_uren: true,
    werkbon_monteur_opmerkingen: true,
    werkbon_monteur_fotos: true,
    werkbon_klant_handtekening: true,
    werkbon_briefpapier: true,
    email_edge_button: true,
    quick_actions_enabled: true,
    created_at: now(),
    updated_at: now(),
  }
}

export async function getAppSettings(userId: string): Promise<AppSettings> {
  assertId(userId, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    let data: AppSettings | null = null

    // Org-based lookup. Veiligheid: bij meerdere rijen per org (door
    // historische bug) altijd de meest recent geüpdatete pakken.
    if (orgId) {
      const res = await supabase
        .from('app_settings')
        .select('*')
        .eq('organisatie_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      data = res.data
    }
    // Fallback: user_id lookup
    if (!data) {
      const res = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      data = res.data
    }

    return normalizeSidebarItems(data || getDefaultAppSettings(userId))
  }
  const settings = getLocalData<AppSettings>('app_settings')
  const found = settings.find((s) => s.user_id === userId)
  return normalizeSidebarItems(found || getDefaultAppSettings(userId))
}

// Huidige geldige sidebar items (moet overeenkomen met Sidebar.tsx + TopNav.tsx)
const VALID_SIDEBAR_LABELS = [
  'Dashboard', 'Projecten', 'Offertes', 'Facturen', 'Klanten', 'Werkbonnen',
  'Planning', 'Taken', 'Email', 'Portaal', 'Financieel',
]

// Normaliseer sidebar_items: verwijder verouderde items, voeg nieuwe toe
function normalizeSidebarItems(settings: AppSettings): AppSettings {
  if (!settings.sidebar_items || !Array.isArray(settings.sidebar_items)) return settings
  const saved = settings.sidebar_items.map((s: string) => s === 'Kalender' ? 'Planning' : s)
  // Behoud items die nog geldig zijn
  const kept = saved.filter((s: string) => VALID_SIDEBAR_LABELS.includes(s))
  // Voeg nieuwe items toe die niet in de opgeslagen lijst stonden (default aan)
  const newItems = VALID_SIDEBAR_LABELS.filter(l => !saved.includes(l))
  return { ...settings, sidebar_items: [...kept, ...newItems] }
}

// Velden die per-user op profiles staan (migratie 091). Updates worden
// automatisch doorgesluisd naar updateProfile zodat oudere call-sites
// die deze velden via updateAppSettings doorgeven blijven werken.
const PER_USER_VELDEN_IN_PROFILE = [
  'email_handtekening',
  'handtekening_afbeelding',
  'handtekening_afbeelding_grootte',
  'afzender_naam',
  'sidebar_items',
] as const

export async function updateAppSettings(userId: string, updates: Partial<AppSettings>): Promise<AppSettings> {
  assertId(userId, 'user_id')

  // Splits updates: per-user velden gaan naar profiles, rest naar app_settings.
  const orgWide: Partial<AppSettings> = { ...updates }
  const perUser: Record<string, unknown> = {}
  for (const veld of PER_USER_VELDEN_IN_PROFILE) {
    if (veld in orgWide) {
      perUser[veld] = (orgWide as Record<string, unknown>)[veld]
      delete (orgWide as Record<string, unknown>)[veld]
    }
  }
  if (Object.keys(perUser).length > 0) {
    await updateProfile(userId, perUser as Partial<Profile>)
  }
  if (Object.keys(orgWide).length === 0) {
    return await getAppSettings(userId)
  }

  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()

    // First try: select with org filter (matches RLS policy)
    let existing: AppSettings | null = null
    if (orgId) {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('organisatie_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      existing = data
    }
    // Fallback: select by user_id (for rows not yet migrated to org)
    if (!existing) {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      existing = data
    }

    const writePayload = { ...orgWide, user_id: userId, updated_at: now(), ...(orgId ? { organisatie_id: orgId } : {}) }

    if (existing?.id) {
      const { error } = await supabase
        .from('app_settings')
        .update(writePayload)
        .eq('id', existing.id)
      if (error) {
        console.error('[updateAppSettings] update failed:', error.code, error.message)
        throw error
      }
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert(writePayload)
      if (error) {
        console.error('[updateAppSettings] insert failed:', error.code, error.message)
        throw error
      }
    }

    const defaults = getDefaultAppSettings(userId)
    return { ...(existing || defaults), ...writePayload } as AppSettings
  }

  const settings = getLocalData<AppSettings>('app_settings')
  const index = settings.findIndex((s) => s.user_id === userId)
  if (index === -1) {
    const defaults = getDefaultAppSettings(userId)
    const newSettings: AppSettings = { ...defaults, ...orgWide, updated_at: now() }
    settings.push(newSettings)
    setLocalData('app_settings', settings)
    return newSettings
  }
  settings[index] = { ...settings[index], ...orgWide, updated_at: now() }
  setLocalData('app_settings', settings)
  return settings[index]
}

// ============ ORGANISATIES ============

export async function createOrganisatie(naam: string, eigenaarId: string): Promise<Organisatie> {
  assertId(eigenaarId, 'eigenaar_id')
  const record: Organisatie = {
    id: generateId(),
    naam,
    eigenaar_id: eigenaarId,
    abonnement_status: 'trial',
    onboarding_compleet: false,
    onboarding_stap: 0,
    created_at: now(),
  }
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('organisaties')
      .insert(record)
      .select()
      .single()
    if (error) throw error
    return data as Organisatie
  }
  const orgs = getLocalData<Organisatie>('organisaties')
  orgs.push(record)
  safeSetItem('doen_organisaties', JSON.stringify(orgs))
  return record
}

export async function getOrganisatie(id: string): Promise<Organisatie | null> {
  assertId(id, 'organisatie_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('organisaties')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as Organisatie | null
  }
  const orgs = getLocalData<Organisatie>('organisaties')
  return orgs.find((o) => o.id === id) || null
}

export async function updateOrganisatie(id: string, updates: Partial<Organisatie>): Promise<Organisatie> {
  assertId(id, 'organisatie_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('organisaties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Organisatie
  }
  const orgs = getLocalData<Organisatie>('organisaties')
  const idx = orgs.findIndex((o) => o.id === id)
  if (idx === -1) throw new Error('Organisatie niet gevonden')
  orgs[idx] = { ...orgs[idx], ...updates }
  safeSetItem('doen_organisaties', JSON.stringify(orgs))
  return orgs[idx]
}

// ============ MEDEWERKERS ============

export async function getMedewerkers(): Promise<Medewerker[]> {
  if (isSupabaseConfigured() && supabase) {
    const orgId = await getOrgId()
    const [mwRes, profRes] = await Promise.all([
      supabase.from('medewerkers').select('*').order('naam'),
      orgId ? supabase.from('profiles').select('id, voornaam, achternaam, email, telefoon, functie, avatar_url, organisatie_id, rol, status').eq('organisatie_id', orgId) : null,
    ])
    const medewerkers = mwRes.data || []
    const profiles = profRes?.data || []

    // Add profiles that don't have a matching medewerker record
    const mwUserIds = new Set(medewerkers.filter(m => m.user_id).map(m => m.user_id))
    const mwEmails = new Set(medewerkers.map(m => m.email?.toLowerCase()).filter(Boolean))

    for (const p of profiles) {
      if (mwUserIds.has(p.id) || (p.email && mwEmails.has(p.email.toLowerCase()))) continue
      const naam = [p.voornaam, p.achternaam].filter(Boolean).join(' ') || p.email || 'Teamlid'
      medewerkers.push({
        id: `profile-${p.id}`,
        user_id: p.id,
        organisatie_id: p.organisatie_id,
        naam,
        email: p.email || '',
        telefoon: p.telefoon || '',
        functie: p.functie || '',
        afdeling: '',
        avatar_url: p.avatar_url || '',
        uurtarief: 0,
        status: (p.status === 'actief' ? 'actief' : 'inactief') as 'actief' | 'inactief',
        rol: (p.rol || 'medewerker') as Medewerker['rol'],
        vaardigheden: [],
        created_at: '',
        updated_at: '',
      } as Medewerker)
    }

    return medewerkers.sort((a, b) => a.naam.localeCompare(b.naam))
  }
  return getLocalData<Medewerker>('medewerkers')
}

export async function createMedewerker(mw: Omit<Medewerker, 'id' | 'created_at' | 'updated_at'>): Promise<Medewerker> {
  const newMw: Medewerker = { ...mw, id: generateId(), created_at: now(), updated_at: now() } as Medewerker
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const payload = { ...await withUserId(newMw), organisatie_id: _orgId }

    // Claim-pad dekt alleen path B (AuthContext na invite-signup) en path C
    // (TeamWelkomPagina). Path A (api/invite-team-member.ts) heeft eigen
    // server-side insert-logica en valt buiten scope van deze check.
    const claimEmail = (mw.email || '').trim()
    if (claimEmail) {
      const { data: bestaand } = await supabase
        .from('medewerkers')
        .select('*')
        .eq('organisatie_id', _orgId)
        .ilike('email', claimEmail)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (bestaand) {
        const { data: updated, error: updErr } = await supabase
          .from('medewerkers')
          .update({ ...payload, id: bestaand.id, created_at: bestaand.created_at, updated_at: now() })
          .eq('id', bestaand.id)
          .select()
          .single()
        if (updErr) throw updErr
        console.log('[medewerker-claim]', {
          medewerkerId: bestaand.id,
          oldUserId: bestaand.user_id,
          newUserId: payload.user_id,
          email: claimEmail,
        })
        return updated
      }
    }

    const { data, error } = await supabase.from('medewerkers').insert(payload).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Medewerker>('medewerkers')
  items.push(newMw)
  setLocalData('medewerkers', items)
  return newMw
}

export async function updateMedewerker(id: string, updates: Partial<Medewerker>): Promise<Medewerker> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('medewerkers').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Medewerker>('medewerkers')
  const index = items.findIndex((m) => m.id === id)
  if (index === -1) throw new Error('Medewerker niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('medewerkers', items)
  return items[index]
}

export async function deleteMedewerker(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('medewerkers').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Medewerker>('medewerkers')
  setLocalData('medewerkers', items.filter((m) => m.id !== id))
}

// ============ NOTIFICATIES ============

export async function getNotificaties(limit = 100): Promise<Notificatie[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('notificaties')
      .select('id, user_id, type, titel, bericht, link, gelezen, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  }
  return getLocalData<Notificatie>('notificaties')
}

export async function createNotificatie(notif: Omit<Notificatie, 'id' | 'created_at'>): Promise<Notificatie> {
  const newNotif: Notificatie = { ...notif, id: generateId(), created_at: now() } as Notificatie
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('notificaties').insert({ ...await withUserId(newNotif), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Notificatie>('notificaties')
  items.unshift(newNotif)
  setLocalData('notificaties', items)
  return newNotif
}

export async function markNotificatieGelezen(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('notificaties').update({ gelezen: true }).eq('id', id)
    return
  }
  const items = getLocalData<Notificatie>('notificaties')
  const index = items.findIndex((n) => n.id === id)
  if (index !== -1) {
    items[index].gelezen = true
    setLocalData('notificaties', items)
  }
}

export async function markAlleNotificatiesGelezen(): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('notificaties').update({ gelezen: true }).eq('gelezen', false)
    return
  }
  const items = getLocalData<Notificatie>('notificaties')
  items.forEach((n) => (n.gelezen = true))
  setLocalData('notificaties', items)
}

export async function deleteNotificatie(id: string): Promise<void> {
  assertId(id, 'notificatie_id')
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('notificaties').delete().eq('id', id)
    if (error) throw error
  }
}

// ============ AUDIT LOG ============

export async function getAuditLog(
  entityType: AuditLogEntry['entity_type'],
  entityId: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('audit_log_feature')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as AuditLogEntry[]) || []
}

export async function createAuditLogEntry(
  entry: Omit<AuditLogEntry, 'id' | 'created_at'>
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    const orgId = entry.organisatie_id || (await getOrgId())
    if (!orgId) return
    const { error } = await supabase.from('audit_log_feature').insert({
      ...entry,
      organisatie_id: orgId,
    })
    if (error) console.warn('[audit_log_feature] insert failed:', error.message)
  } catch (err) {
    console.warn('[audit_log_feature] insert exception:', err)
  }
}

// Bulk-fetch audit events voor een project: het project zelf + alle
// gerelateerde offertes/werkbonnen/facturen/taken in één audit-query.
// RLS op audit_log_feature (organisatie_id = current user's org) houdt
// cross-tenant data automatisch buiten de resultaten — ID-collectie via
// project-filtered fetchers is ook RLS-protected, dus de IN-arrays bevatten
// alleen entity_ids uit de eigen organisatie.
//
// Callers die de related entity-arrays al hebben (zoals ProjectDetail
// dat ze toch al laadt voor de cockpit) kunnen die meegeven via options
// — dan slaat de helper de Promise.all over en wordt het 1 round-trip
// in plaats van 2.
export async function getAuditLogForProject(
  projectId: string,
  options?: {
    offerteIds?: string[]
    werkbonIds?: string[]
    factuurIds?: string[]
    taakIds?: string[]
    limit?: number
  }
): Promise<AuditLogEntry[]> {
  assertId(projectId, 'project_id')
  if (!isSupabaseConfigured() || !supabase) return []

  const limit = options?.limit ?? 200

  let offerteIds: string[]
  let werkbonIds: string[]
  let factuurIds: string[]
  let taakIds: string[]

  // Pre-loaded check per type: undefined = niet meegegeven, fetch zelf;
  // [] = bewust leeg meegegeven (caller weet dat er geen offertes zijn),
  // skip de fetch.
  if (
    options?.offerteIds !== undefined &&
    options?.werkbonIds !== undefined &&
    options?.factuurIds !== undefined &&
    options?.taakIds !== undefined
  ) {
    offerteIds = options.offerteIds
    werkbonIds = options.werkbonIds
    factuurIds = options.factuurIds
    taakIds = options.taakIds
  } else {
    const [offertes, werkbonnen, facturen, taken] = await Promise.all([
      getOffertesByProject(projectId).catch(() => []),
      getWerkbonnenByProject(projectId).catch(() => []),
      getFacturenByProject(projectId).catch(() => []),
      getTakenByProject(projectId).catch(() => []),
    ])
    offerteIds = options?.offerteIds ?? offertes.map(o => o.id)
    werkbonIds = options?.werkbonIds ?? werkbonnen.map(w => w.id)
    factuurIds = options?.factuurIds ?? facturen.map(f => f.id)
    taakIds = options?.taakIds ?? taken.map(t => t.id)
  }

  const orClauses: string[] = [
    `and(entity_type.eq.project,entity_id.eq.${projectId})`,
  ]
  if (offerteIds.length > 0) {
    orClauses.push(`and(entity_type.eq.offerte,entity_id.in.(${offerteIds.join(',')}))`)
  }
  if (werkbonIds.length > 0) {
    orClauses.push(`and(entity_type.eq.werkbon,entity_id.in.(${werkbonIds.join(',')}))`)
  }
  if (factuurIds.length > 0) {
    orClauses.push(`and(entity_type.eq.factuur,entity_id.in.(${factuurIds.join(',')}))`)
  }
  if (taakIds.length > 0) {
    orClauses.push(`and(entity_type.eq.taak,entity_id.in.(${taakIds.join(',')}))`)
  }

  const { data, error } = await supabase
    .from('audit_log_feature')
    .select('*')
    .or(orClauses.join(','))
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as AuditLogEntry[]) || []
}
