import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, round2,
} from './supabaseHelpers'
import { safeSetItem } from '@/utils/localStorageUtils'
import { DEFAULT_VISUALIZER_INSTELLINGEN } from '@/utils/visualizerDefaults'
import type {
  SigningVisualisatie,
  VisualizerInstellingen,
  VisualizerApiLog,
  VisualizerStats,
  VisualizerCredits,
  CreditTransactie,
} from '@/types'

// --- Visualisaties CRUD ---

export async function getSigningVisualisaties(user_id: string): Promise<SigningVisualisatie[]> {
  assertId(user_id, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('signing_visualisaties')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const all = getLocalData<SigningVisualisatie>(`signing_visualisaties_${user_id}`)
  return all.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function getSigningVisualisatiesByOfferte(offerte_id: string): Promise<SigningVisualisatie[]> {
  assertId(offerte_id, 'offerte_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('signing_visualisaties')
      .select('*')
      .eq('offerte_id', offerte_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  // localStorage fallback: search across all user data
  const keys = Object.keys(localStorage).filter(k => k.startsWith('doen_signing_visualisaties_'))
  const results: SigningVisualisatie[] = []
  for (const key of keys) {
    const items: SigningVisualisatie[] = JSON.parse(localStorage.getItem(key) || '[]')
    results.push(...items.filter(v => v.offerte_id === offerte_id))
  }
  return results.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function getSigningVisualisatiesByProject(project_id: string): Promise<SigningVisualisatie[]> {
  assertId(project_id, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('signing_visualisaties')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const keys = Object.keys(localStorage).filter(k => k.startsWith('doen_signing_visualisaties_'))
  const results: SigningVisualisatie[] = []
  for (const key of keys) {
    const items: SigningVisualisatie[] = JSON.parse(localStorage.getItem(key) || '[]')
    results.push(...items.filter(v => v.project_id === project_id))
  }
  return results.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function getSigningVisualisatiesByKlant(klant_id: string): Promise<SigningVisualisatie[]> {
  assertId(klant_id, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('signing_visualisaties')
      .select('*')
      .eq('klant_id', klant_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const keys = Object.keys(localStorage).filter(k => k.startsWith('doen_signing_visualisaties_'))
  const results: SigningVisualisatie[] = []
  for (const key of keys) {
    const items: SigningVisualisatie[] = JSON.parse(localStorage.getItem(key) || '[]')
    results.push(...items.filter(v => v.klant_id === klant_id))
  }
  return results.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function createSigningVisualisatie(
  data: Omit<SigningVisualisatie, 'id' | 'created_at'>
): Promise<SigningVisualisatie> {
  assertId(data.user_id, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data: row, error } = await supabase
      .from('signing_visualisaties')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return row
  }
  const items = getLocalData<SigningVisualisatie>(`signing_visualisaties_${data.user_id}`)
  const newItem: SigningVisualisatie = {
    ...data,
    id: generateId(),
    created_at: now(),
  }
  items.push(newItem)
  setLocalData(`signing_visualisaties_${data.user_id}`, items)
  return newItem
}

export async function updateSigningVisualisatie(
  id: string,
  data: Partial<SigningVisualisatie>
): Promise<SigningVisualisatie> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data: row, error } = await supabase
      .from('signing_visualisaties')
      .update({ ...data, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return row
  }
  // localStorage: need user_id to find the right key
  const user_id = data.user_id
  if (!user_id) throw new Error('user_id is vereist voor localStorage update')
  const items = getLocalData<SigningVisualisatie>(`signing_visualisaties_${user_id}`)
  const idx = items.findIndex(v => v.id === id)
  if (idx === -1) throw new Error('Visualisatie niet gevonden')
  items[idx] = { ...items[idx], ...data, updated_at: now() }
  setLocalData(`signing_visualisaties_${user_id}`, items)
  return items[idx]
}

export async function deleteSigningVisualisatie(id: string, user_id: string): Promise<void> {
  assertId(id)
  assertId(user_id, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('signing_visualisaties')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id)
    if (error) throw error
    return
  }
  const items = getLocalData<SigningVisualisatie>(`signing_visualisaties_${user_id}`)
  const filtered = items.filter(v => v.id !== id)
  setLocalData(`signing_visualisaties_${user_id}`, filtered)
}

// --- Visualizer Instellingen ---

export async function getVisualizerInstellingen(user_id: string): Promise<VisualizerInstellingen> {
  assertId(user_id, 'user_id')
  const key = `doen_visualizer_instellingen_${user_id}`
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<VisualizerInstellingen>
      return { ...DEFAULT_VISUALIZER_INSTELLINGEN, ...parsed }
    }
  } catch (err) { /* ignore */ }
  return { ...DEFAULT_VISUALIZER_INSTELLINGEN }
}

export async function saveVisualizerInstellingen(
  user_id: string,
  instellingen: Partial<VisualizerInstellingen>
): Promise<VisualizerInstellingen> {
  assertId(user_id, 'user_id')
  const key = `doen_visualizer_instellingen_${user_id}`
  const current = await getVisualizerInstellingen(user_id)
  const updated = { ...current, ...instellingen }
  if (!safeSetItem(key, JSON.stringify(updated))) {
    throw new Error('localStorage quota exceeded voor visualizer instellingen')
  }
  return updated
}

// --- API Log ---

export async function logVisualizerActie(
  data: Omit<VisualizerApiLog, 'id' | 'created_at'>
): Promise<void> {
  assertId(data.user_id, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('visualizer_api_log')
      .insert(await withUserId(data))
    if (error) throw error
    return
  }
  const key = `doen_visualizer_log_${data.user_id}`
  const items: VisualizerApiLog[] = JSON.parse(localStorage.getItem(key) || '[]')
  items.push({ ...data, id: generateId(), created_at: now() })
  safeSetItem(key, JSON.stringify(items))
}

export async function getVisualizerLog(user_id: string): Promise<VisualizerApiLog[]> {
  assertId(user_id, 'user_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('visualizer_api_log')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  const key = `doen_visualizer_log_${user_id}`
  const items: VisualizerApiLog[] = JSON.parse(localStorage.getItem(key) || '[]')
  return items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

// --- Statistieken ---

export async function getVisualizerStats(user_id: string): Promise<VisualizerStats> {
  assertId(user_id, 'user_id')
  const visualisaties = await getSigningVisualisaties(user_id)
  const klaar = visualisaties.filter(v => v.status === 'klaar')

  const nuMaand = new Date().getMonth()
  const nuJaar = new Date().getFullYear()
  const dezeMaand = klaar.filter(v => {
    const d = new Date(v.created_at)
    return d.getMonth() === nuMaand && d.getFullYear() === nuJaar
  })

  const totaal_kosten_eur = round2(klaar.reduce((s, v) => s + (v.api_kosten_eur || 0), 0))
  const totaal_doorberekend_eur = round2(
    klaar.filter(v => v.doorberekend_aan_klant).reduce((s, v) => s + (v.api_kosten_eur || 0), 0)
  )
  const kosten_deze_maand_eur = round2(dezeMaand.reduce((s, v) => s + (v.api_kosten_eur || 0), 0))

  const generatietijden = klaar.filter(v => v.generatie_tijd_ms).map(v => v.generatie_tijd_ms || 0)
  const gemiddelde_generatietijd_ms = generatietijden.length > 0
    ? Math.round(generatietijden.reduce((s, t) => s + t, 0) / generatietijden.length)
    : 0

  return {
    totaal_gegenereerd: klaar.length,
    totaal_kosten_eur,
    totaal_doorberekend_eur,
    gegenereerd_deze_maand: dezeMaand.length,
    kosten_deze_maand_eur,
    gemiddelde_generatietijd_ms,
  }
}

// --- Credits Systeem (Supabase-backed) ---

export const DEMO_CREDITS = 10 // Nieuwe gebruikers krijgen 10 gratis credits

export async function getVisualizerCredits(user_id: string): Promise<VisualizerCredits> {
  assertId(user_id, 'user_id')

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('visualizer_credits')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle()

    if (data && !error) {
      return {
        user_id: data.user_id,
        saldo: data.saldo,
        totaal_gekocht: data.totaal_gekocht,
        totaal_gebruikt: data.totaal_gebruikt,
        laatst_bijgewerkt: data.laatst_bijgewerkt,
      }
    }

    // Nieuwe gebruiker → maak record aan met demo credits
    if (error?.code === 'PGRST116') {
      const { data: newRecord } = await supabase
        .from('visualizer_credits')
        .insert({
          user_id,
          saldo: DEMO_CREDITS,
          totaal_gekocht: DEMO_CREDITS,
          totaal_gebruikt: 0,
        })
        .select()
        .single()

      if (newRecord) {
        // Log de demo credits transactie
        await supabase.from('credit_transacties').insert({
          user_id,
          type: 'handmatig_toegevoegd',
          aantal: DEMO_CREDITS,
          saldo_na: DEMO_CREDITS,
          beschrijving: 'Welkomstcredits — probeer de Visualizer en Daan gratis uit',
        })

        return {
          user_id,
          saldo: DEMO_CREDITS,
          totaal_gekocht: DEMO_CREDITS,
          totaal_gebruikt: 0,
          laatst_bijgewerkt: newRecord.laatst_bijgewerkt || now(),
        }
      }
    }
  }

  // Fallback: localStorage (voor lokale dev zonder Supabase)
  const key = `doen_visualizer_credits_${user_id}`
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored) as VisualizerCredits
  } catch (err) { /* ignore */ }
  return { user_id, saldo: 0, totaal_gekocht: 0, totaal_gebruikt: 0, laatst_bijgewerkt: now() }
}

export async function gebruikCredit(user_id: string, visualisatie_id: string, aantal: number = 1): Promise<VisualizerCredits> {
  assertId(user_id, 'user_id')
  const credits = await getVisualizerCredits(user_id)

  if (credits.saldo < aantal) {
    throw new Error(`Onvoldoende credits — je hebt ${credits.saldo} credits, maar deze actie kost ${aantal}`)
  }

  const nieuwSaldo = credits.saldo - aantal
  const nieuwGebruikt = credits.totaal_gebruikt + aantal

  if (isSupabaseConfigured() && supabase) {
    await supabase
      .from('visualizer_credits')
      .update({
        saldo: nieuwSaldo,
        totaal_gebruikt: nieuwGebruikt,
        laatst_bijgewerkt: now(),
      })
      .eq('user_id', user_id)

    await supabase.from('credit_transacties').insert({
      user_id,
      type: 'gebruik',
      aantal: -aantal,
      saldo_na: nieuwSaldo,
      beschrijving: aantal > 1 ? `${aantal} credits gebruikt (4K visualisatie)` : 'Credit gebruikt voor visualisatie',
      visualisatie_id: visualisatie_id || null,
    })
  } else {
    // localStorage fallback
    const key = `doen_visualizer_credits_${user_id}`
    const updated = { ...credits, saldo: nieuwSaldo, totaal_gebruikt: nieuwGebruikt, laatst_bijgewerkt: now() }
    safeSetItem(key, JSON.stringify(updated))
    await logCreditTransactieLocal({ user_id, type: 'gebruik', aantal: -aantal, saldo_na: nieuwSaldo, beschrijving: 'Credit gebruikt voor visualisatie', visualisatie_id })
  }

  return { ...credits, saldo: nieuwSaldo, totaal_gebruikt: nieuwGebruikt, laatst_bijgewerkt: now() }
}

export async function voegCreditsToe(
  user_id: string,
  aantal: number,
  beschrijving: string
): Promise<VisualizerCredits> {
  assertId(user_id, 'user_id')
  const credits = await getVisualizerCredits(user_id)
  const nieuwSaldo = credits.saldo + aantal
  const nieuwGekocht = credits.totaal_gekocht + aantal

  if (isSupabaseConfigured() && supabase) {
    await supabase
      .from('visualizer_credits')
      .update({
        saldo: nieuwSaldo,
        totaal_gekocht: nieuwGekocht,
        laatst_bijgewerkt: now(),
      })
      .eq('user_id', user_id)

    await supabase.from('credit_transacties').insert({
      user_id,
      type: 'aankoop',
      aantal,
      saldo_na: nieuwSaldo,
      beschrijving,
    })
  } else {
    const key = `doen_visualizer_credits_${user_id}`
    const updated = { ...credits, saldo: nieuwSaldo, totaal_gekocht: nieuwGekocht, laatst_bijgewerkt: now() }
    safeSetItem(key, JSON.stringify(updated))
    await logCreditTransactieLocal({ user_id, type: 'aankoop', aantal, saldo_na: nieuwSaldo, beschrijving })
  }

  return { ...credits, saldo: nieuwSaldo, totaal_gekocht: nieuwGekocht, laatst_bijgewerkt: now() }
}

export async function handmatigCreditsToewijzen(
  user_id: string,
  aantal: number,
  beschrijving: string
): Promise<VisualizerCredits> {
  assertId(user_id, 'user_id')
  const credits = await getVisualizerCredits(user_id)
  const nieuwSaldo = credits.saldo + aantal
  const nieuwGekocht = aantal > 0 ? credits.totaal_gekocht + aantal : credits.totaal_gekocht

  if (isSupabaseConfigured() && supabase) {
    await supabase
      .from('visualizer_credits')
      .update({
        saldo: nieuwSaldo,
        totaal_gekocht: nieuwGekocht,
        laatst_bijgewerkt: now(),
      })
      .eq('user_id', user_id)

    await supabase.from('credit_transacties').insert({
      user_id,
      type: 'handmatig_toegevoegd',
      aantal,
      saldo_na: nieuwSaldo,
      beschrijving,
    })
  } else {
    const key = `doen_visualizer_credits_${user_id}`
    const updated = { ...credits, saldo: nieuwSaldo, totaal_gekocht: nieuwGekocht, laatst_bijgewerkt: now() }
    safeSetItem(key, JSON.stringify(updated))
    await logCreditTransactieLocal({ user_id, type: 'handmatig_toegevoegd', aantal, saldo_na: nieuwSaldo, beschrijving })
  }

  return { ...credits, saldo: nieuwSaldo, totaal_gekocht: nieuwGekocht, laatst_bijgewerkt: now() }
}

// localStorage fallback voor lokale dev
async function logCreditTransactieLocal(
  data: Omit<CreditTransactie, 'id' | 'created_at'>
): Promise<void> {
  const key = `doen_credit_transacties_${data.user_id}`
  const items: CreditTransactie[] = JSON.parse(localStorage.getItem(key) || '[]')
  items.push({ ...data, id: generateId(), created_at: now() })
  safeSetItem(key, JSON.stringify(items))
}

export async function getCreditTransacties(user_id: string): Promise<CreditTransactie[]> {
  assertId(user_id, 'user_id')

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('credit_transacties')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error && data) return data as CreditTransactie[]
  }

  // localStorage fallback
  const key = `doen_credit_transacties_${user_id}`
  const items: CreditTransactie[] = JSON.parse(localStorage.getItem(key) || '[]')
  return items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

// Daan AI maandelijks gebruik ophalen
export async function getForgieGebruik(user_id: string): Promise<{ geschatte_kosten: number; aantal_calls: number; limiet: number }> {
  assertId(user_id, 'user_id')
  const limiet = 5.0 // €5 per maand

  if (isSupabaseConfigured() && supabase) {
    const maand = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { data } = await supabase
      .from('ai_usage')
      .select('geschatte_kosten, aantal_calls')
      .eq('user_id', user_id)
      .eq('maand', maand)
      .maybeSingle()
    return {
      geschatte_kosten: data?.geschatte_kosten ?? 0,
      aantal_calls: data?.aantal_calls ?? 0,
      limiet,
    }
  }

  return { geschatte_kosten: 0, aantal_calls: 0, limiet }
}
