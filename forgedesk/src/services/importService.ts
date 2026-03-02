import supabase, { isSupabaseConfigured } from './supabaseClient'
import { createKlant, getKlanten } from './supabaseService'
import type {
  Klant,
  KlantHistorie,
  KlantProject,
  KlantOfferte,
  CSVKlantRij,
  CSVHistorieRij,
  ImportResultaat,
} from '@/types'

// ============ LOCALSTORAGE KEYS ============

const LS_KLANT_HISTORIE = 'forgedesk_klant_historie'
const LS_IMPORT_LOG = 'forgedesk_import_log'

// ============ HELPERS ============

function getLocalHistorie(): KlantHistorie[] {
  const data = localStorage.getItem(LS_KLANT_HISTORIE)
  return data ? JSON.parse(data) : []
}

function setLocalHistorie(data: KlantHistorie[]): void {
  localStorage.setItem(LS_KLANT_HISTORIE, JSON.stringify(data))
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

// ============ CSV IMPORT: KLANTEN ============

type ParsedKlant = CSVKlantRij

export async function importKlantenFromCSV(csvData: ParsedKlant[]): Promise<ImportResultaat> {
  const resultaat: ImportResultaat = {
    totaal: csvData.length,
    geimporteerd: 0,
    overgeslagen: 0,
    fouten: 0,
    fout_details: [],
  }

  for (const rij of csvData) {
    try {
      const isDuplicaat = await checkDuplicaat(rij.bedrijfsnaam)
      if (isDuplicaat) {
        resultaat.overgeslagen++
        continue
      }

      await createKlant({
        user_id: '',
        bedrijfsnaam: rij.bedrijfsnaam,
        contactpersoon: '',
        email: rij.email || '',
        telefoon: rij.telefoon || '',
        adres: rij.adres || '',
        postcode: rij.postcode || '',
        stad: rij.plaats || '',
        land: 'Nederland',
        website: '',
        kvk_nummer: rij.kvk_nummer || '',
        btw_nummer: rij.btw_nummer || '',
        status: (rij.status === 'actief' || rij.status === 'inactief' || rij.status === 'prospect')
          ? rij.status
          : 'actief',
        tags: [],
        notities: '',
        contactpersonen: [],
        omzet_totaal: parseNumber(rij.omzet_totaal),
        omzet_2026: parseNumber(rij.omzet_2026),
        klant_sinds: rij.klant_sinds || undefined,
        laatst_actief: rij.laatst_actief || undefined,
        aantal_projecten: parseNumber(rij.aantal_projecten),
        aantal_offertes: parseNumber(rij.aantal_offertes),
        totaal_offertewaarde: parseNumber(rij.totaal_offertewaarde),
        accountmanager: rij.accountmanager || undefined,
        import_bron: 'james_pro',
        import_datum: new Date().toISOString(),
      })

      resultaat.geimporteerd++
    } catch (error) {
      resultaat.fouten++
      resultaat.fout_details.push(
        `${rij.bedrijfsnaam}: ${error instanceof Error ? error.message : 'Onbekende fout'}`
      )
    }
  }

  // Log de import
  const logs = JSON.parse(localStorage.getItem(LS_IMPORT_LOG) || '[]')
  logs.push({ datum: new Date().toISOString(), type: 'klanten', resultaat })
  localStorage.setItem(LS_IMPORT_LOG, JSON.stringify(logs))

  return resultaat
}

// ============ DUPLICAAT CHECK ============

export async function checkDuplicaat(bedrijfsnaam: string): Promise<boolean> {
  if (!bedrijfsnaam) return false
  const zoekNaam = bedrijfsnaam.toLowerCase().trim()

  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('klanten')
      .select('id')
      .ilike('bedrijfsnaam', zoekNaam)
      .limit(1)
    return (data || []).length > 0
  }

  const klanten = await getKlanten()
  return klanten.some((k) => k.bedrijfsnaam.toLowerCase().trim() === zoekNaam)
}

// ============ KLANT HISTORIE (KENNISBANK) ============

export async function getKlantHistorie(klant_id: string): Promise<KlantHistorie | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klant_historie')
      .select('*')
      .eq('klant_id', klant_id)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  const historie = getLocalHistorie()
  return historie.find((h) => h.klant_id === klant_id) || null
}

export async function getAlleKlantHistorie(): Promise<KlantHistorie[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klant_historie')
      .select('*')
      .order('bedrijfsnaam')
    if (error) throw error
    return data || []
  }

  return getLocalHistorie()
}

export async function zoekKlantHistorie(zoekterm: string): Promise<KlantHistorie[]> {
  const query = zoekterm.toLowerCase().trim()
  if (!query) return getAlleKlantHistorie()

  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('klant_historie')
      .select('*')
      .ilike('bedrijfsnaam', `%${query}%`)
    if (error) throw error
    return data || []
  }

  const historie = getLocalHistorie()
  return historie.filter((h) =>
    h.bedrijfsnaam.toLowerCase().includes(query) ||
    h.specialisaties.some((s) => s.toLowerCase().includes(query))
  )
}

export async function saveKlantHistorie(data: KlantHistorie): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('klant_historie')
      .upsert(data, { onConflict: 'klant_id' })
    if (error) throw error
    return
  }

  const historie = getLocalHistorie()
  const index = historie.findIndex((h) => h.klant_id === data.klant_id)
  if (index >= 0) {
    historie[index] = data
  } else {
    historie.push(data)
  }
  setLocalHistorie(historie)
}

// ============ CSV IMPORT: HISTORIE ============

type ParsedHistorie = CSVHistorieRij

function parseProjectenSamenvatting(raw: string): KlantProject[] {
  if (!raw || !raw.trim()) return []
  return raw.split(' | ').map((entry) => {
    // Formaat: "2026-01-06 €1234.56 Projectnaam" of "2026-01-06 Projectnaam"
    const parts = entry.split(' ')
    const datum = parts[0] || ''

    // Check of het tweede deel een prijs is (begint met €)
    if (parts[1] && parts[1].startsWith('€')) {
      const waardeDeel = parts[1].replace('€', '').replace(',', '.')
      return {
        datum,
        waarde: parseFloat(waardeDeel) || 0,
        naam: parts.slice(2).join(' '),
        projectmanager: '',
      }
    }

    return {
      datum,
      naam: parts.slice(1).join(' '),
      projectmanager: '',
    }
  })
}

function parseOffertesSamenvatting(raw: string): KlantOfferte[] {
  if (!raw || !raw.trim()) return []
  return raw.split(' | ').map((entry, index) => {
    // Formaat: "2026-01-08 €3625.0 Akkoord Omschrijving"
    const parts = entry.split(' ')
    const datum = parts[0] || ''
    const waardeDeel = (parts[1] || '').replace('€', '').replace(',', '.')
    const status = parts[2] || ''
    const omschrijving = parts.slice(3).join(' ')
    return {
      nummer: index + 1,
      datum,
      waarde: parseFloat(waardeDeel) || 0,
      status,
      omschrijving,
    }
  })
}

export async function importHistorieFromCSV(csvData: ParsedHistorie[]): Promise<ImportResultaat> {
  const resultaat: ImportResultaat = {
    totaal: csvData.length,
    geimporteerd: 0,
    overgeslagen: 0,
    fouten: 0,
    fout_details: [],
  }

  // Haal alle klanten op om klant_id te matchen op bedrijfsnaam
  const klanten = await getKlanten()
  const klantMap = new Map<string, string>()
  klanten.forEach((k) => klantMap.set(k.bedrijfsnaam.toLowerCase().trim(), k.id))

  for (const rij of csvData) {
    try {
      const klantId = klantMap.get(rij.bedrijfsnaam.toLowerCase().trim())
      if (!klantId) {
        resultaat.overgeslagen++
        resultaat.fout_details.push(`${rij.bedrijfsnaam}: Geen matchende klant gevonden`)
        continue
      }

      const historie: KlantHistorie = {
        klant_id: klantId,
        bedrijfsnaam: rij.bedrijfsnaam,
        specialisaties: rij.specialisaties
          ? rij.specialisaties.split(', ').map((s) => s.trim()).filter(Boolean)
          : [],
        conversie_percentage: parseNumber(rij.conversie_percentage) || undefined,
        projecten: parseProjectenSamenvatting(rij.projecten_samenvatting),
        offertes: parseOffertesSamenvatting(rij.offertes_samenvatting),
      }

      await saveKlantHistorie(historie)
      resultaat.geimporteerd++
    } catch (error) {
      resultaat.fouten++
      resultaat.fout_details.push(
        `${rij.bedrijfsnaam}: ${error instanceof Error ? error.message : 'Onbekende fout'}`
      )
    }
  }

  // Log de import
  const logs = JSON.parse(localStorage.getItem(LS_IMPORT_LOG) || '[]')
  logs.push({ datum: new Date().toISOString(), type: 'historie', resultaat })
  localStorage.setItem(LS_IMPORT_LOG, JSON.stringify(logs))

  return resultaat
}
