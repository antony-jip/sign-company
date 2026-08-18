import * as Sentry from '@sentry/react'
import {
  supabase, isSupabaseConfigured,
  assertId, getLocalData, setLocalData, generateId, now,
  withUserId, getOrgId, sanitizeDates, round2, getMaxNummer, fetchAllPages,
} from './supabaseHelpers'
import { logger } from '@/utils/logger'
import type { Factuur, FactuurItem, HerinneringTemplate, Klant } from '@/types'

export class FactuurConflictError extends Error {
  public serverData: Factuur
  constructor(message: string, serverData: Factuur) {
    super(message)
    this.name = 'FactuurConflictError'
    this.serverData = serverData
  }
}

// ============ FACTUREN CRUD ============

export async function getFacturen(limit = 50000): Promise<Factuur[]> {
  const sb = supabase
  if (isSupabaseConfigured() && sb) {
    return fetchAllPages<Factuur>((van, tot) =>
      sb
        .from('facturen')
        .select('*')
        .order('factuurdatum', { ascending: false })
        .order('id', { ascending: true })
        .range(van, tot), limit)
  }
  return getLocalData<Factuur>('facturen')
}

export async function getFactuur(id: string): Promise<Factuur | null> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  const items = getLocalData<Factuur>('facturen')
  return items.find((f) => f.id === id) || null
}

// Hergenereert een factuurnummer format-behoudend (zelfde prefix + zelfde
// padding-lengte) na een unique-collision, zodat gelijktijdige aanmaak niet in
// een duplicaat resulteert.
async function regenerateFactuurNummer(currentNummer: string): Promise<string> {
  const match = /^(.*?)(\d+)$/.exec(currentNummer)
  if (!match) return currentNummer
  const [, prefix, tail] = match
  const maxNr = await getMaxNummer('facturen', 'nummer', prefix)
  return `${prefix}${String(maxNr + 1).padStart(tail.length, '0')}`
}

export async function createFactuur(factuur: Omit<Factuur, 'id' | 'created_at' | 'updated_at'>): Promise<Factuur> {
  const newFactuur: Factuur = { ...sanitizeDates(factuur), id: generateId(), created_at: now(), updated_at: now() } as Factuur
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    for (let poging = 0; poging < 5; poging++) {
      const { data, error } = await supabase.from('facturen').insert({ ...await withUserId(newFactuur), organisatie_id: _orgId }).select().single()
      if (!error) return data
      // 23505 = unique_violation op (organisatie_id, nummer): nummer-race, hergenereer en probeer opnieuw.
      if ((error as { code?: string }).code === '23505' && poging < 4) {
        newFactuur.nummer = await regenerateFactuurNummer(newFactuur.nummer)
        continue
      }
      throw error
    }
    throw new Error('Kon geen uniek factuurnummer genereren na meerdere pogingen')
  }
  const items = getLocalData<Factuur>('facturen')
  items.push(newFactuur)
  setLocalData('facturen', items)
  return newFactuur
}

export async function updateFactuur(id: string, updates: Partial<Factuur>, expectedUpdatedAt?: string): Promise<Factuur> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    // Optimistic locking, zelfde constructie als updateOfferte: de voorwaarde
    // zit in de UPDATE zelf, dus de database beslist wie wint.
    if (expectedUpdatedAt) {
      const { data: bijgewerkt, error } = await supabase
        .from('facturen')
        .update(sanitizeDates({ ...updates, updated_at: now() }))
        .eq('id', id)
        .eq('updated_at', expectedUpdatedAt)
        .select()
        .maybeSingle()
      if (error) throw error
      if (bijgewerkt) return bijgewerkt

      const { data: huidig } = await supabase
        .from('facturen')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (!huidig) throw new Error('Factuur niet gevonden')

      Sentry.captureMessage('Factuur gelijktijdig bewerkt', {
        level: 'info',
        tags: { bron: 'optimistic-locking', entiteit: 'factuur' },
      })

      throw new FactuurConflictError(
        'Deze factuur is ondertussen door iemand anders gewijzigd. Herlaad de pagina om de laatste versie te zien.',
        huidig
      )
    }

    const { data, error } = await supabase.from('facturen').update(sanitizeDates({ ...updates, updated_at: now() })).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<Factuur>('facturen')
  const index = items.findIndex((f) => f.id === id)
  if (index === -1) throw new Error('Factuur niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('facturen', items)
  return items[index]
}

// De status mag nooit achterblijven omdat het tijdstip niet weg kan: draait
// migratie 210 nog niet (kolom verzonden_op ontbreekt), dan valt dit terug
// op alleen de statusovergang.
export async function markeerFactuurVerzonden(id: string): Promise<Factuur> {
  try {
    return await updateFactuur(id, { status: 'verzonden', verzonden_op: new Date().toISOString() })
  } catch (err) {
    if ((err as { message?: string })?.message?.includes('verzonden_op')) {
      return await updateFactuur(id, { status: 'verzonden' })
    }
    throw err
  }
}

// Handmatig "markeer als betaald" loopt door het betalingsgrootboek: de RPC
// boekt het restant als handmatige betaling in factuur_betalingen, zodat
// betaald_bedrag nooit buiten die tabel om verandert. Zolang migratie 210
// nog niet draait valt dit terug op de oude directe update.
export async function markeerFactuurBetaald(id: string, totaal: number): Promise<Partial<Factuur>> {
  assertId(id, 'factuur_id')
  // Lokale dag, geen UTC: de RPC boekt in Europe/Amsterdam en rond
  // middernacht zou de optimistische UI-waarde anders een dag achterlopen.
  const vandaag = new Date().toLocaleDateString('sv-SE')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.rpc('factuur_markeer_betaald', { p_factuur_id: id })
    if (!error) {
      const rij = (Array.isArray(data) ? data[0] : data) as { nieuw_betaald?: number; bijgewerkt_op?: string } | null
      return {
        status: 'betaald',
        betaald_bedrag: rij?.nieuw_betaald ?? totaal,
        betaaldatum: vandaag,
        // De RPC hoogt updated_at op; zonder deze terugkoppeling zou het
        // optimistic lock in de editor bij de eerstvolgende save klappen.
        ...(rij?.bijgewerkt_op ? { updated_at: rij.bijgewerkt_op } : {}),
      }
    }
    // Alleen een onbruikbare functie mag stil terugvallen; een permission-fout
    // moet juist zichtbaar falen. PGRST202 = functie onbekend (migratie 210 nog
    // niet gedraaid). PGRST203 = ambigu: er staan twee overloads van
    // factuur_markeer_betaald naast elkaar, waardoor PostgREST niet kiest en de
    // knop voor iedereen hard zou falen. De directe update is dan het net,
    // maar de database moet opgeruimd worden.
    const functieOnbruikbaar = error.code === 'PGRST202' || error.code === 'PGRST203'
    if (!functieOnbruikbaar) {
      throw error
    }
    if (error.code === 'PGRST203') {
      const melding = 'factuur_markeer_betaald bestaat in meerdere overloads; draai migratie 211 opnieuw om de oude versie te droppen'
      console.warn(`[facturen] ${melding}`)
      Sentry.captureMessage('Functie-overload factuur_markeer_betaald', {
        level: 'warning',
        tags: { bron: 'rpc-fallback', entiteit: 'factuur' },
        extra: { melding, code: error.code },
      })
    }
  }
  return await updateFactuurStatus(id, { status: 'betaald', betaald_bedrag: totaal, betaaldatum: vandaag })
}

// Configureerbare herinnerings-ladder (migratie 212). Geen rij voor een stap
// = de standaard van de cron (7/14/21/30 dagen, herinnering_3 uit).
export interface FactuurOpvolgStap {
  stap_type: 'herinnering_1' | 'herinnering_2' | 'herinnering_3' | 'aanmaning'
  dagen_na_vervaldatum: number
  kanaal: 'email' | 'intern'
  onderwerp: string | null
  inhoud: string | null
  actief: boolean
}

export async function getFactuurOpvolgStappen(organisatieId: string): Promise<FactuurOpvolgStap[]> {
  if (!(isSupabaseConfigured() && supabase)) return []
  const { data, error } = await supabase
    .from('factuur_opvolg_stappen')
    .select('stap_type, dagen_na_vervaldatum, kanaal, onderwerp, inhoud, actief')
    .eq('organisatie_id', organisatieId)
  if (error) {
    if (error.code === 'PGRST205') return []
    throw error
  }
  return (data ?? []) as FactuurOpvolgStap[]
}

// Retourneert false als migratie 212 nog niet gedraaid is; de caller kan dan
// melden dat alleen de teksten (app_settings) zijn opgeslagen.
export async function upsertFactuurOpvolgStappen(organisatieId: string, stappen: FactuurOpvolgStap[]): Promise<boolean> {
  if (!(isSupabaseConfigured() && supabase)) return false
  const { error } = await supabase
    .from('factuur_opvolg_stappen')
    .upsert(
      stappen.map((s) => ({ ...s, organisatie_id: organisatieId, updated_at: new Date().toISOString() })),
      { onConflict: 'organisatie_id,stap_type' }
    )
  if (error) {
    if (error.code === 'PGRST205') return false
    throw error
  }
  return true
}

// Voor het verwerken-pad: daar krijgt een bestaand concept zijn volgnummer via
// een UPDATE, en die had — anders dan createFactuur — geen 23505-afhandeling.
// Twee gebruikers die tegelijk elk hun eigen concept verwerken berekenen
// hetzelfde nummer; de verliezer krijgt hier een vers nummer en probeert opnieuw.
export async function updateFactuurWithNummerRetry(
  id: string,
  updates: Partial<Factuur>,
  expectedUpdatedAt?: string
): Promise<Factuur> {
  let huidige = { ...updates }
  for (let poging = 0; poging < 5; poging++) {
    try {
      return await updateFactuur(id, huidige, expectedUpdatedAt)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === '23505' && huidige.nummer && poging < 4) {
        huidige = { ...huidige, nummer: await regenerateFactuurNummer(huidige.nummer) }
        continue
      }
      throw err
    }
  }
  throw new Error('Kon geen uniek factuurnummer genereren na meerdere pogingen')
}

// Verse DB-check bij offerte-naar-factuur: de client-state kan uren oud zijn,
// dus vlak voor het aanmaken nog even kijken of een collega deze offerte al
// gefactureerd heeft. Voorschotten en creditnota's tellen niet mee.
export async function getStandaardFacturenVoorOfferte(offerteId: string): Promise<Array<Pick<Factuur, 'id' | 'nummer' | 'status'>>> {
  assertId(offerteId, 'offerte_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('facturen')
      .select('id, nummer, status')
      .eq('offerte_id', offerteId)
      .or('factuur_type.is.null,factuur_type.eq.standaard')
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen').filter(
    (f) => f.offerte_id === offerteId && (!f.factuur_type || f.factuur_type === 'standaard')
  )
}

// Verse stand voor de voorschot-flows: de lijst in component-state kan
// verouderd zijn terwijl een collega net verrekend of aangemaakt heeft.
export async function getVoorschottenVoorOfferte(offerteId: string): Promise<Array<Pick<Factuur, 'id' | 'nummer' | 'status' | 'is_voorschot_verrekend' | 'subtotaal' | 'totaal'>>> {
  assertId(offerteId, 'offerte_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('facturen')
      .select('id, nummer, status, is_voorschot_verrekend, subtotaal, totaal')
      .eq('offerte_id', offerteId)
      .eq('factuur_type', 'voorschot')
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen').filter(
    (f) => f.offerte_id === offerteId && f.factuur_type === 'voorschot'
  )
}

export async function deleteFactuur(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    // Verwijder factuur_items eerst
    await supabase.from('factuur_items').delete().eq('factuur_id', id)
    const { error } = await supabase.from('facturen').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<Factuur>('facturen')
  setLocalData('facturen', items.filter((f) => f.id !== id))
}

export async function getFactuurItems(factuurId: string): Promise<FactuurItem[]> {
  assertId(factuurId, 'factuur_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('factuur_items').select('*').eq('factuur_id', factuurId).order('volgorde')
    if (error) throw error
    return data || []
  }
  return getLocalData<FactuurItem>('factuur_items').filter((i) => i.factuur_id === factuurId)
}

export async function createFactuurItem(item: Omit<FactuurItem, 'id' | 'created_at'>): Promise<FactuurItem> {
  const newItem: FactuurItem = { ...item, id: generateId(), created_at: now() } as FactuurItem
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('factuur_items').insert(await withUserId(newItem)).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<FactuurItem>('factuur_items')
  items.push(newItem)
  setLocalData('factuur_items', items)
  return newItem
}

// Vervangt alle regels van een factuur, atomair via de RPC uit migratie 206:
// twee gebruikers die tegelijk opslaan kunnen dan geen dubbele regelsets meer
// achterlaten. Zolang de migratie nog niet gedraaid is valt dit terug op het
// oude drie-stappen-pad (insert vóór delete, zodat een mislukte insert de
// factuur niet regelloos achterlaat).
export async function replaceFactuurItems(
  factuurId: string,
  items: Array<Omit<FactuurItem, 'id' | 'created_at' | 'factuur_id'>>
): Promise<FactuurItem[]> {
  assertId(factuurId, 'factuur_id')
  if (isSupabaseConfigured() && supabase) {
    const { data: viaRpc, error: rpcError } = await supabase.rpc('vervang_factuur_items', {
      p_factuur_id: factuurId,
      p_items: items.map((item, i) => ({
        beschrijving: item.beschrijving,
        aantal: item.aantal,
        eenheidsprijs: item.eenheidsprijs,
        btw_percentage: item.btw_percentage,
        korting_percentage: item.korting_percentage,
        totaal: item.totaal,
        volgorde: item.volgorde ?? i + 1,
        grootboek_code: item.grootboek_code || '',
        detail_regels: item.detail_regels || [],
      })),
    })
    if (!rpcError) return (viaRpc as FactuurItem[]) || []
    // Alleen terugvallen als de functie echt ontbreekt (migratie 206 nog niet
    // gedraaid): PGRST202 = PostgREST kent hem niet, 42883 = Postgres kent hem
    // niet. Andere fouten (bv. 42501 permission denied) mogen niet stil naar
    // het race-gevoelige pad degraderen.
    const functieOntbreekt = rpcError.code === 'PGRST202' || rpcError.code === '42883'
    if (!functieOntbreekt) throw rpcError
    Sentry.addBreadcrumb({ category: 'facturen', message: 'vervang_factuur_items ontbreekt; drie-stappen-fallback actief', level: 'warning' })

    const { data: bestaand, error: leesError } = await supabase
      .from('factuur_items').select('id').eq('factuur_id', factuurId)
    if (leesError) throw leesError
    const oudeIds = (bestaand || []).map((r) => r.id)

    let nieuw: FactuurItem[] = []
    if (items.length > 0) {
      const rijen = await Promise.all(
        items.map(async (item) => await withUserId({
          ...item, factuur_id: factuurId, id: generateId(), created_at: now(),
        } as FactuurItem))
      )
      const { data, error } = await supabase.from('factuur_items').insert(rijen).select()
      if (error) throw error
      nieuw = data || []
    }

    if (oudeIds.length > 0) {
      const { error } = await supabase.from('factuur_items').delete().in('id', oudeIds)
      if (error) throw error
    }
    return nieuw
  }

  const alle = getLocalData<FactuurItem>('factuur_items')
  const nieuw = items.map((item) => ({
    ...item, factuur_id: factuurId, id: generateId(), created_at: now(),
  })) as FactuurItem[]
  setLocalData('factuur_items', [...alle.filter((i) => i.factuur_id !== factuurId), ...nieuw])
  return nieuw
}

// ============ FACTUUR STATUS ============

export async function updateFactuurStatus(
  id: string,
  updates: Partial<Factuur>
): Promise<Partial<Factuur>> {
  assertId(id, 'factuur_id')
  if (isSupabaseConfigured() && supabase) {
    // updated_at expliciet mee, net als updateFactuur: het optimistic lock in
    // de editor moet ook statuswijzigingen van collega's zien, en de
    // updated_at-trigger uit de migratiemap is live niet gegarandeerd.
    const { data, error } = await supabase
      .from('facturen')
      .update({ ...updates, updated_at: now() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  return { id, ...updates }
}

// ============ RELATIONELE QUERIES ============

export async function getFacturenByKlant(klantId: string): Promise<Factuur[]> {
  assertId(klantId, 'klant_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('klant_id', klantId).order('factuurdatum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen').filter((f) => f.klant_id === klantId)
}

export async function getFacturenByProject(projectId: string): Promise<Factuur[]> {
  assertId(projectId, 'project_id')
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('facturen').select('*').eq('project_id', projectId).order('factuurdatum', { ascending: false })
    if (error) throw error
    return data || []
  }
  return getLocalData<Factuur>('facturen').filter((f) => f.project_id === projectId)
}

export async function getVerlopenFacturen(): Promise<Factuur[]> {
  const facturen = await getFacturen()
  const vandaag = new Date().toLocaleDateString('sv-SE')
  return facturen.filter((f) => f.vervaldatum < vandaag && f.status !== 'betaald' && f.status !== 'gecrediteerd' && (f.factuur_type || 'standaard') !== 'creditnota')
}

// ============ HERINNERING TEMPLATES ============

export async function getHerinneringTemplates(): Promise<HerinneringTemplate[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('herinnering_templates').select('*').order('dagen_na_vervaldatum')
    if (error) throw error
    return data || []
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  if (items.length === 0) {
    const defaults = getDefaultHerinneringTemplates('')
    setLocalData('herinnering_templates', defaults)
    return defaults
  }
  return items
}

export function getDefaultHerinneringTemplates(userId: string): HerinneringTemplate[] {
  return [
    {
      id: generateId(), user_id: userId,
      type: 'herinnering_1', onderwerp: 'Herinnering: factuur {factuur_nummer} is verlopen',
      inhoud: 'Beste {klant_naam},\n\nGraag herinneren wij u aan factuur {factuur_nummer} ter waarde van {factuur_bedrag}, die op {vervaldatum} betaald had moeten worden. De factuur staat nu {dagen_verlopen} dagen open.\n\nWij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 7, actief: true, created_at: now(),
    },
    {
      id: generateId(), user_id: userId,
      type: 'herinnering_2', onderwerp: 'Tweede herinnering: factuur {factuur_nummer}',
      inhoud: 'Beste {klant_naam},\n\nOndanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De vervaldatum was {vervaldatum}, inmiddels {dagen_verlopen} dagen geleden.\n\nWij verzoeken u dringend het bedrag binnen 7 dagen te voldoen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 14, actief: true, created_at: now(),
    },
    {
      id: generateId(), user_id: userId,
      type: 'herinnering_3', onderwerp: 'Laatste herinnering: factuur {factuur_nummer}',
      inhoud: 'Beste {klant_naam},\n\nDit is onze laatste herinnering voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De factuur is inmiddels {dagen_verlopen} dagen verlopen.\n\nIndien wij binnen 7 dagen geen betaling ontvangen, zijn wij genoodzaakt verdere stappen te ondernemen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 21, actief: true, created_at: now(),
    },
    {
      id: generateId(), user_id: userId,
      type: 'aanmaning', onderwerp: 'Aanmaning: factuur {factuur_nummer}',
      inhoud: 'Beste {klant_naam},\n\nOndanks herhaalde herinneringen hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De factuur is {dagen_verlopen} dagen verlopen.\n\nDit is een formele aanmaning. Wij verzoeken u het openstaande bedrag per omgaande te voldoen. Bij uitblijven van betaling behouden wij ons het recht voor om wettelijke rente en incassokosten in rekening te brengen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
      dagen_na_vervaldatum: 30, actief: true, created_at: now(),
    },
  ]
}

export async function createHerinneringTemplate(template: Omit<HerinneringTemplate, 'id' | 'created_at'>): Promise<HerinneringTemplate> {
  const newTemplate: HerinneringTemplate = { ...template, id: generateId(), created_at: now() } as HerinneringTemplate
  if (isSupabaseConfigured() && supabase) {
    const _orgId = await getOrgId()
    const { data, error } = await supabase.from('herinnering_templates').insert({ ...await withUserId(newTemplate), organisatie_id: _orgId }).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  items.push(newTemplate)
  setLocalData('herinnering_templates', items)
  return newTemplate
}

export async function updateHerinneringTemplate(id: string, updates: Partial<HerinneringTemplate>): Promise<HerinneringTemplate> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('herinnering_templates').update({ ...updates, updated_at: now() }).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  const index = items.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Herinnering template niet gevonden')
  items[index] = { ...items[index], ...updates, updated_at: now() }
  setLocalData('herinnering_templates', items)
  return items[index]
}

export async function deleteHerinneringTemplate(id: string): Promise<void> {
  assertId(id)
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('herinnering_templates').delete().eq('id', id)
    if (error) throw error
    return
  }
  const items = getLocalData<HerinneringTemplate>('herinnering_templates')
  setLocalData('herinnering_templates', items.filter((t) => t.id !== id))
}

// ============ HERINNERING-ONTVANGER ============

/** Het gevonden adres plus waar het vandaan komt, zodat de UI kan tonen wie er mailt. */
export interface HerinneringOntvanger {
  email: string | null
  bron: 'factuur_contact' | 'klant_standaard' | 'klant' | 'geen'
}

function schoonEmail(waarde: unknown): string | null {
  const adres = typeof waarde === 'string' ? waarde.trim() : ''
  return adres || null
}

// klanten.contactpersonen is JSONB, maar komt bij oudere imports als string terug.
function parseContactpersonenJson(waarde: unknown): Array<{ id?: string; email?: string }> {
  let rauw = waarde
  if (typeof rauw === 'string') {
    try {
      rauw = JSON.parse(rauw)
    } catch {
      return []
    }
  }
  return Array.isArray(rauw) ? (rauw as Array<{ id?: string; email?: string }>) : []
}

// De ontvanger van een betalingsherinnering, in de volgorde die migratie 101
// vastlegt: het contact dat op de factuur staat wint van de standaard van de
// klant, en die weer van het algemene klantadres. Elke stap draait alleen als
// de vorige geen adres opleverde, en een supabase-fout laat de volgende stap
// het werk doen in plaats van de verzending te blokkeren.
export async function bepaalHerinneringOntvanger(
  factuur: { klant_id?: string | null; contactpersoon_id?: string | null }
): Promise<HerinneringOntvanger> {
  const klantId = factuur.klant_id || null
  const contactpersoonId = factuur.contactpersoon_id || null
  const sb = supabase

  // Lokale modus kent geen contactpersonen-tabel; daar is de klantkaart alles.
  if (!(isSupabaseConfigured() && sb)) {
    const klant = klantId ? getLocalData<Klant>('klanten').find((k) => k.id === klantId) : undefined
    const lokaalEmail = schoonEmail(klant?.email)
    return lokaalEmail ? { email: lokaalEmail, bron: 'klant' } : { email: null, bron: 'geen' }
  }

  // (a) Het contact dat expliciet op de factuur staat.
  if (contactpersoonId) {
    const { data, error } = await sb
      .from('contactpersonen')
      .select('email')
      .eq('id', contactpersoonId)
      .maybeSingle()
    if (error) {
      logger.warn('Factuur-contactpersoon ophalen mislukt, valt terug op de klant', error)
    } else {
      const contactEmail = schoonEmail((data as { email?: string } | null)?.email)
      if (contactEmail) return { email: contactEmail, bron: 'factuur_contact' }
    }
  }

  if (!klantId) return { email: null, bron: 'geen' }

  // De klantkaart draagt twee stappen tegelijk: contactpersoon_id heeft bewust
  // geen FK (migratie 101) en kan dus ook naar een contact in de JSONB-kolom
  // wijzen, en dezelfde rij levert het algemene adres als laatste vangnet.
  const { data: klantRij, error: klantError } = await sb
    .from('klanten')
    .select('email, contactpersonen')
    .eq('id', klantId)
    .maybeSingle()
  if (klantError) {
    logger.warn('Klant ophalen voor herinnering-ontvanger mislukt', klantError)
  }
  const klant = klantRij as { email?: string | null; contactpersonen?: unknown } | null

  if (contactpersoonId && klant) {
    const jsonbContact = parseContactpersonenJson(klant.contactpersonen).find((c) => c.id === contactpersoonId)
    const jsonbEmail = schoonEmail(jsonbContact?.email)
    if (jsonbEmail) return { email: jsonbEmail, bron: 'factuur_contact' }
  }

  // (b) De standaard factuur-ontvanger van de klant; uniek per klant.
  const { data: standaard, error: standaardError } = await sb
    .from('contactpersonen')
    .select('email')
    .eq('klant_id', klantId)
    .eq('is_factuur_standaard', true)
    .limit(1)
  if (standaardError) {
    logger.warn('Standaard factuur-contact ophalen mislukt, valt terug op het klantadres', standaardError)
  } else {
    const standaardEmail = schoonEmail((standaard as Array<{ email?: string }> | null)?.[0]?.email)
    if (standaardEmail) return { email: standaardEmail, bron: 'klant_standaard' }
  }

  // (c) Het algemene adres op de klantkaart.
  const klantEmail = schoonEmail(klant?.email)
  return klantEmail ? { email: klantEmail, bron: 'klant' } : { email: null, bron: 'geen' }
}

// Standaardteksten voor de opvolg-ladder, gebruikt zodra een organisatie geen
// eigen tekst heeft ingesteld. Dit is de spiegel van STANDAARD_TEKSTEN in
// src/trigger/factuur-herinnering.ts: de cron draait los van deze bundel en
// houdt bewust een eigen kopie, dus pas je hier iets aan, pas het daar ook aan.
export const STANDAARD_HERINNERING_TEKSTEN: Record<'herinnering_1' | 'herinnering_2' | 'herinnering_3' | 'aanmaning', { onderwerp: string; inhoud: string }> = {
  herinnering_1: {
    onderwerp: 'Herinnering: factuur {factuur_nummer}',
    inhoud:
      'Beste {klant_naam},\n\nGraag herinneren wij u aan factuur {factuur_nummer} ter waarde van {factuur_bedrag}, met vervaldatum {vervaldatum}. De factuur staat nu {dagen_verlopen} dagen open.\n\nWij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen. Heeft u al betaald, dan kunt u dit bericht negeren.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
  },
  herinnering_2: {
    onderwerp: 'Tweede herinnering: factuur {factuur_nummer}',
    inhoud:
      'Beste {klant_naam},\n\nOndanks onze eerdere herinnering hebben wij nog geen betaling ontvangen voor factuur {factuur_nummer} ter waarde van {factuur_bedrag}. De vervaldatum was {vervaldatum}, inmiddels {dagen_verlopen} dagen geleden.\n\nWij verzoeken u het bedrag binnen 7 dagen te voldoen. Heeft u al betaald, dan kunt u dit bericht negeren.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
  },
  herinnering_3: {
    onderwerp: 'Derde herinnering: factuur {factuur_nummer}',
    inhoud:
      'Beste {klant_naam},\n\nFactuur {factuur_nummer} ter waarde van {factuur_bedrag} staat nog altijd open, {dagen_verlopen} dagen na de vervaldatum van {vervaldatum}.\n\nWij verzoeken u het openstaande bedrag per omgaande te voldoen. Heeft u al betaald, dan kunt u dit bericht negeren.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
  },
  aanmaning: {
    onderwerp: 'Aanmaning: factuur {factuur_nummer}',
    inhoud:
      'Beste {klant_naam},\n\nOndanks meerdere herinneringen staat factuur {factuur_nummer} ter waarde van {factuur_bedrag} nog altijd open ({dagen_verlopen} dagen na de vervaldatum van {vervaldatum}).\n\nWij verzoeken u dringend het openstaande bedrag binnen 7 dagen te voldoen om verdere stappen te voorkomen.\n\nMet vriendelijke groet,\n{bedrijfsnaam}',
  },
}

// ============ NUMMER GENERATIE ============

function buildFactuurNummer(prefix: string, volgnummer: number): string {
  const jaar = new Date().getFullYear().toString()
  const resolvedPrefix = prefix.replace('{jaar}', jaar)
  return `${resolvedPrefix}${volgnummer}`
}

export async function generateFactuurNummer(prefix: string = '', startNummer = 1): Promise<string> {
  const jaar = new Date().getFullYear().toString()
  const resolvedPrefix = prefix.replace('{jaar}', jaar)
  let maxNr = await getMaxNummer('facturen', 'nummer', resolvedPrefix)
  if (maxNr === 0) {
    const facturen = isSupabaseConfigured() ? [] : getLocalData<Factuur>('facturen')
    maxNr = facturen
      .filter((f) => f.nummer.startsWith(resolvedPrefix))
      .reduce((max, f) => {
        const tail = f.nummer.slice(resolvedPrefix.length)
        const n = /^\d+$/.test(tail) ? parseInt(tail, 10) : 0
        return Math.max(max, n)
      }, 0)
  }
  const nextNr = Math.max(maxNr, Math.max(0, startNummer - 1)) + 1
  return buildFactuurNummer(prefix, nextNr)
}

// ============ CONVERSIES (voorschot) ============

export async function createVoorschotfactuur(
  factuurId: string,
  userId: string,
  percentage: number,
  factuurPrefix: string = 'FAC'
): Promise<Factuur> {
  assertId(factuurId, 'factuur_id')
  const origineel = await getFactuur(factuurId)
  if (!origineel) throw new Error('Factuur niet gevonden')
  const nummer = await generateFactuurNummer(factuurPrefix)
  const voorschotSubtotaal = round2(origineel.subtotaal * (percentage / 100))
  const voorschotBtw = round2(origineel.btw_bedrag * (percentage / 100))
  const voorschotTotaal = round2(voorschotSubtotaal + voorschotBtw)
  const voorschot = await createFactuur({
    user_id: userId,
    klant_id: origineel.klant_id,
    klant_naam: origineel.klant_naam,
    project_id: origineel.project_id,
    nummer,
    titel: `Voorschotfactuur ${percentage}% - ${origineel.titel}`,
    status: 'concept',
    subtotaal: voorschotSubtotaal,
    btw_bedrag: voorschotBtw,
    totaal: voorschotTotaal,
    betaald_bedrag: 0,
    factuurdatum: new Date().toLocaleDateString('sv-SE'),
    vervaldatum: new Date(Date.now() + 14 * 86400000).toLocaleDateString('sv-SE'),
    notities: `Voorschot van ${percentage}% op ${origineel.nummer}`,
    voorwaarden: origineel.voorwaarden || '',
    factuur_type: 'voorschot',
    gerelateerde_factuur_id: factuurId,
    voorschot_percentage: percentage,
    contactpersoon_id: origineel.contactpersoon_id,
  } as Omit<Factuur, 'id' | 'created_at' | 'updated_at'>)
  return voorschot
}
