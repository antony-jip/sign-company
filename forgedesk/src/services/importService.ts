import { getKlanten, createKlant, updateKlant } from './supabaseService'
import { round2 } from '@/utils/budgetUtils'
import type {
  Klant,
  Contactpersoon,
  KlantActiviteit,
  CSVKlantRij,
  CSVActiviteitRij,
  ImportResultaat,
} from '@/types'

// ============ LOCALSTORAGE KEYS ============

const LS_CONTACTPERSONEN = 'forgedesk_import_contactpersonen'
const LS_ACTIVITEITEN_PREFIX = 'forgedesk_activiteiten_'
const LS_ACTIVITEITEN_OLD = 'forgedesk_import_activiteiten'

// ============ HELPERS ============

function getLocalData<T>(key: string): T[] {
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : []
}

function setLocalData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// Migratie: verplaats data van oude single-key naar per-klant keys
function migreerOudeActiviteiten(): void {
  const oudeData = localStorage.getItem(LS_ACTIVITEITEN_OLD)
  if (!oudeData) return
  try {
    const items: KlantActiviteit[] = JSON.parse(oudeData)
    const perKlant = new Map<string, KlantActiviteit[]>()
    for (const item of items) {
      if (!item.klant_id) continue
      const bestaande = perKlant.get(item.klant_id) || []
      bestaande.push(item)
      perKlant.set(item.klant_id, bestaande)
    }
    for (const [klantId, activiteiten] of perKlant) {
      const key = `${LS_ACTIVITEITEN_PREFIX}${klantId}`
      const bestaande = getLocalData<KlantActiviteit>(key)
      localStorage.setItem(key, JSON.stringify([...bestaande, ...activiteiten]))
    }
    localStorage.removeItem(LS_ACTIVITEITEN_OLD)
  } catch {
    localStorage.removeItem(LS_ACTIVITEITEN_OLD)
  }
}

migreerOudeActiviteiten()

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(',', '.').replace(/[^0-9.\-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : round2(num)
}

/** Normalize a company name for comparison: trim, lowercase, strip trailing dots */
function normalizeNaam(naam: string): string {
  return naam.trim().toLowerCase().replace(/\.+$/, '')
}

// ============ CSV PARSER ============

/**
 * Parse CSV text with semicolon delimiter, UTF-8 BOM handling, and quoted fields.
 * Returns an array of objects keyed by header names.
 */
export function parseCSV<T = Record<string, string>>(text: string, separator = ';'): T[] {
  // Strip BOM
  let input = text
  if (input.charCodeAt(0) === 0xFEFF) {
    input = input.slice(1)
  }

  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === separator && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if (char === '\n' && !inQuotes) {
      row.push(current.trim())
      if (row.some((cell) => cell !== '')) rows.push(row)
      row = []
      current = ''
    } else if (char !== '\r') {
      current += char
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim())
    if (row.some((cell) => cell !== '')) rows.push(row)
  }

  if (rows.length < 2) return []

  const headers = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim())
  const result: T[] = []

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || '').replace(/^["']|["']$/g, '').trim()
    })
    result.push(obj as T)
  }

  return result
}

// ============ CONTACTPERSONEN PARSER ============

const CONTACT_REGEX = /^(.+?)\s*(?:<([^>]+)>)?\s*([\d\s\-+()]{7,})?$/

export function parseContactpersonen(raw: string): Array<{ naam: string; email?: string; telefoon?: string }> {
  if (!raw || !raw.trim()) return []

  // Split on ", " (comma space)
  const parts = raw.split(/,\s+/)
  const contacts: Array<{ naam: string; email?: string; telefoon?: string }> = []

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const match = trimmed.match(CONTACT_REGEX)
    if (match) {
      const naam = match[1].trim()
      const email = match[2]?.trim() || undefined
      const telefoon = match[3]?.trim() || undefined
      if (naam) {
        contacts.push({ naam, email, telefoon })
      }
    } else {
      // Fallback: treat entire string as name
      contacts.push({ naam: trimmed })
    }
  }

  return contacts
}

// ============ KLANT LOOKUP ============

export async function findKlantByNaam(naam: string): Promise<Klant | null> {
  if (!naam) return null
  const zoek = normalizeNaam(naam)
  const klanten = await getKlanten()
  return klanten.find((k) => normalizeNaam(k.bedrijfsnaam) === zoek) || null
}

// ============ CONTACTPERSONEN CRUD ============

export interface ImportContactpersoon {
  id: string;
  user_id: string;
  klant_id: string;
  naam: string;
  email?: string;
  telefoon?: string;
  functie?: string;
  import_bron?: string;
  created_at: string;
}

export function getContactpersonen(klant_id: string): ImportContactpersoon[] {
  const all = getLocalData<ImportContactpersoon>(LS_CONTACTPERSONEN)
  return all.filter((c) => c.klant_id === klant_id)
}

export function createContactpersoon(data: Omit<ImportContactpersoon, 'id' | 'created_at'>): ImportContactpersoon {
  const all = getLocalData<ImportContactpersoon>(LS_CONTACTPERSONEN)
  const newRecord: ImportContactpersoon = {
    ...data,
    id: generateId(),
    created_at: now(),
  }
  all.push(newRecord)
  setLocalData(LS_CONTACTPERSONEN, all)
  return newRecord
}

export function deleteContactpersoon(id: string): void {
  const all = getLocalData<ImportContactpersoon>(LS_CONTACTPERSONEN)
  setLocalData(LS_CONTACTPERSONEN, all.filter((c) => c.id !== id))
}

// ============ ACTIVITEITEN CRUD ============

export function getActiviteiten(klant_id: string): KlantActiviteit[] {
  const key = `${LS_ACTIVITEITEN_PREFIX}${klant_id}`
  return getLocalData<KlantActiviteit>(key)
    .sort((a, b) => b.datum.localeCompare(a.datum))
}

function createActiviteit(data: Omit<KlantActiviteit, 'id' | 'created_at'>): KlantActiviteit {
  const key = `${LS_ACTIVITEITEN_PREFIX}${data.klant_id}`
  const all = getLocalData<KlantActiviteit>(key)
  const newRecord: KlantActiviteit = {
    ...data,
    id: generateId(),
    created_at: now(),
  }
  all.push(newRecord)
  setLocalData(key, all)
  return newRecord
}

// ============ IMPORT: KLANTEN ============

export async function importKlanten(rows: CSVKlantRij[]): Promise<ImportResultaat> {
  const resultaat: ImportResultaat = {
    totaal: rows.length,
    geimporteerd: 0,
    overgeslagen: 0,
    fouten: 0,
    fout_details: [],
  }

  // Build lookup map of existing klanten
  const bestaandeKlanten = await getKlanten()
  const klantMap = new Map<string, Klant>()
  bestaandeKlanten.forEach((k) => klantMap.set(normalizeNaam(k.bedrijfsnaam), k))

  let contactpersonenAangemaakt = 0

  for (const rij of rows) {
    try {
      if (!rij.bedrijfsnaam || !rij.bedrijfsnaam.trim()) {
        resultaat.overgeslagen++
        continue
      }

      const zoekNaam = normalizeNaam(rij.bedrijfsnaam)
      const bestaande = klantMap.get(zoekNaam)

      const klantData: Partial<Klant> = {
        adres: rij.adres || undefined,
        postcode: rij.postcode || undefined,
        stad: rij.plaats || undefined,
        telefoon: rij.telefoon || undefined,
        email: rij.email || undefined,
        kvk_nummer: rij.kvk_nummer || undefined,
        btw_nummer: rij.btw_nummer || undefined,
        omzet_totaal: rij.omzet_totaal ? parseNumber(rij.omzet_totaal) : undefined,
        accountmanager: rij.accountmanager || undefined,
        status: (rij.status === 'actief' || rij.status === 'inactief' || rij.status === 'prospect')
          ? rij.status
          : 'actief',
        klant_sinds: rij.klant_sinds || undefined,
        laatst_actief: rij.laatst_actief || undefined,
        aantal_projecten: rij.aantal_projecten ? Math.round(parseNumber(rij.aantal_projecten)) : undefined,
        aantal_offertes: rij.aantal_offertes ? Math.round(parseNumber(rij.aantal_offertes)) : undefined,
        offertes_akkoord: rij.offertes_akkoord ? Math.round(parseNumber(rij.offertes_akkoord)) : undefined,
        totaal_offertewaarde: rij.totaal_offertewaarde ? parseNumber(rij.totaal_offertewaarde) : undefined,
        import_bron: 'csv_import',
        import_datum: now(),
      }

      let klant: Klant
      if (bestaande) {
        // Update existing
        klant = await updateKlant(bestaande.id, klantData)
        klantMap.set(zoekNaam, klant)
      } else {
        // Create new
        klant = await createKlant({
          user_id: '',
          bedrijfsnaam: rij.bedrijfsnaam.trim(),
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
          status: klantData.status as Klant['status'],
          tags: [],
          notities: '',
          contactpersonen: [],
          ...klantData,
        })
        klantMap.set(zoekNaam, klant)
      }

      // Parse contactpersonen from CSV column
      if (rij.contactpersonen) {
        const parsedContacts = parseContactpersonen(rij.contactpersonen)
        for (const pc of parsedContacts) {
          createContactpersoon({
            user_id: klant.user_id || '',
            klant_id: klant.id,
            naam: pc.naam,
            email: pc.email,
            telefoon: pc.telefoon,
            import_bron: 'csv_import',
          })
          contactpersonenAangemaakt++
        }
      }

      resultaat.geimporteerd++
    } catch (error) {
      resultaat.fouten++
      resultaat.fout_details.push(
        `${rij.bedrijfsnaam}: ${error instanceof Error ? error.message : 'Onbekende fout'}`
      )
    }
  }

  // Add contact count to details for UI
  if (contactpersonenAangemaakt > 0) {
    resultaat.fout_details.unshift(`_contactpersonen:${contactpersonenAangemaakt}`)
  }

  return resultaat
}

// ============ IMPORT: ACTIVITEITEN ============

export async function importActiviteiten(rows: CSVActiviteitRij[]): Promise<ImportResultaat> {
  const resultaat: ImportResultaat = {
    totaal: rows.length,
    geimporteerd: 0,
    overgeslagen: 0,
    fouten: 0,
    fout_details: [],
  }

  // Build lookup map
  const klanten = await getKlanten()
  const klantMap = new Map<string, Klant>()
  klanten.forEach((k) => klantMap.set(normalizeNaam(k.bedrijfsnaam), k))

  for (const rij of rows) {
    try {
      if (!rij.bedrijfsnaam || !rij.bedrijfsnaam.trim()) {
        resultaat.overgeslagen++
        continue
      }

      const zoek = normalizeNaam(rij.bedrijfsnaam)
      const klant = klantMap.get(zoek)

      if (!klant) {
        resultaat.fouten++
        resultaat.fout_details.push(`${rij.bedrijfsnaam}: Geen matchende klant gevonden`)
        continue
      }

      const type = rij.type?.toLowerCase().trim()
      if (type !== 'project' && type !== 'offerte') {
        resultaat.fouten++
        resultaat.fout_details.push(`${rij.bedrijfsnaam}: Ongeldig type "${rij.type}" (verwacht: project of offerte)`)
        continue
      }

      // Validate status for offertes
      let status: string | undefined
      if (type === 'offerte' && rij.status) {
        const validStatuses = ['Akkoord', 'In afwachting', 'Niet akkoord']
        status = validStatuses.find((s) => s.toLowerCase() === rij.status.trim().toLowerCase())
        if (!status && rij.status.trim()) {
          // Try case-insensitive match
          status = rij.status.trim()
        }
      }

      createActiviteit({
        user_id: klant.user_id || '',
        klant_id: klant.id,
        datum: rij.datum || '',
        type: type as 'project' | 'offerte',
        omschrijving: rij.omschrijving || '',
        bedrag: rij.bedrag ? parseNumber(rij.bedrag) : undefined,
        status,
        import_bron: 'csv_import',
      })

      resultaat.geimporteerd++
    } catch (error) {
      resultaat.fouten++
      resultaat.fout_details.push(
        `${rij.bedrijfsnaam}: ${error instanceof Error ? error.message : 'Onbekende fout'}`
      )
    }
  }

  return resultaat
}

// ============ CLEAR IMPORT DATA ============

export function clearImportData(): void {
  localStorage.removeItem(LS_CONTACTPERSONEN)
  // Verwijder alle per-klant activiteiten keys
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(LS_ACTIVITEITEN_PREFIX)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
  // Ook oude key opruimen als die er nog is
  localStorage.removeItem(LS_ACTIVITEITEN_OLD)
  localStorage.removeItem('forgedesk_klant_historie')
  localStorage.removeItem('forgedesk_import_log')
}

// ============ TEMPLATE GENERATORS ============

export function generateKlantenTemplate(): string {
  const header = 'bedrijfsnaam;adres;postcode;plaats;telefoon;email;kvk_nummer;btw_nummer;omzet_totaal;accountmanager;status;klant_sinds;laatst_actief;aantal_projecten;aantal_offertes;offertes_akkoord;totaal_offertewaarde;contactpersonen'
  const rows = [
    'Voorbeeld Signing BV;Keizersgracht 100;1015 AA;Amsterdam;020-1234567;info@voorbeeld.nl;12345678;NL001234567B01;85000.50;Jan Bakker;actief;2020-03-15;2026-02-01;12;25;8;125000.00;Piet Jansen <piet@voorbeeld.nl> 06-12345678, Marie de Vries <marie@voorbeeld.nl>',
    'Reclamebureau Noord;Stationsweg 5;8011 CW;Zwolle;038-4567890;contact@recnoord.nl;87654321;;42000.00;Lisa Smit;actief;2022-01-10;2026-01-15;5;10;4;65000.00;Karel Groot <karel@recnoord.nl>',
    'Bouwbedrijf Zuid;Markt 22;5611 EK;Eindhoven;;;;0;;inactief;2019-06-01;2024-08-20;3;8;2;35000.00;',
  ]
  return [header, ...rows].join('\n')
}

export function generateActiviteitenTemplate(): string {
  const header = 'bedrijfsnaam;datum;type;omschrijving;bedrag;status'
  const rows = [
    'Voorbeeld Signing BV;2025-10-15;project;Gevelreclame kantoorpand;;',
    'Voorbeeld Signing BV;2025-10-15;offerte;Gevelreclame kantoorpand;4500.00;Akkoord',
    'Voorbeeld Signing BV;2025-06-20;offerte;Raambelettering showroom;1250.00;In afwachting',
    'Reclamebureau Noord;2026-01-08;project;Beurswand 3x4 meter;;',
    'Reclamebureau Noord;2026-01-10;offerte;Beurswand 3x4 meter;2800.00;Akkoord',
  ]
  return [header, ...rows].join('\n')
}
