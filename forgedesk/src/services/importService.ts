import { getKlanten, createKlant, createImportLog } from './supabaseService'
import type { Klant, ImportOperationResult, ImportLog } from '@/types'
import supabase, { isSupabaseConfigured } from './supabaseClient'

// ============ CSV PARSING ============

/**
 * Parse een CSV bestand met automatische separator-detectie.
 * Ondersteunt ; en , als scheidingsteken, UTF-8 BOM, en quoted fields.
 * Geen limiet op aantal rijen.
 */
export function parseCSV(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let text = e.target?.result as string
        if (!text) {
          resolve({ headers: [], rows: [] })
          return
        }
        // Strip BOM
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1)
        }

        // Detect separator: count ; and , in first line
        const firstLine = text.split('\n')[0] || ''
        const semicolons = (firstLine.match(/;/g) || []).length
        const commas = (firstLine.match(/,/g) || []).length
        const separator = semicolons >= commas ? ';' : ','

        // Parse CSV
        const allRows: string[][] = []
        let current = ''
        let inQuotes = false
        let row: string[] = []

        for (let i = 0; i < text.length; i++) {
          const char = text[i]
          if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
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
            if (row.some((cell) => cell !== '')) allRows.push(row)
            row = []
            current = ''
          } else if (char !== '\r') {
            current += char
          }
        }
        if (current || row.length > 0) {
          row.push(current.trim())
          if (row.some((cell) => cell !== '')) allRows.push(row)
        }

        if (allRows.length < 2) {
          resolve({ headers: [], rows: [] })
          return
        }

        const headers = allRows[0].map((h) =>
          h.replace(/^["']|["']$/g, '').trim().toLowerCase()
        )
        const rows: Record<string, string>[] = []

        for (let i = 1; i < allRows.length; i++) {
          const values = allRows[i]
          const obj: Record<string, string> = {}
          headers.forEach((h, idx) => {
            obj[h] = (values[idx] || '').replace(/^["']|["']$/g, '').trim()
          })
          rows.push(obj)
        }

        resolve({ headers, rows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Bestand kon niet gelezen worden'))
    reader.readAsText(file, 'utf-8')
  })
}

// ============ VALIDATIE ============

export function valideerBedrijfsdata(
  headers: string[],
  rows: Record<string, string>[]
): { isValid: boolean; fouten: string[]; waarschuwingen: string[] } {
  const fouten: string[] = []
  const waarschuwingen: string[] = []

  const lowerHeaders = headers.map((h) => h.toLowerCase())

  if (!lowerHeaders.includes('type')) {
    fouten.push('Kolom "type" ontbreekt. Deze kolom is verplicht.')
  }
  if (!lowerHeaders.includes('bedrijfsnaam')) {
    fouten.push('Kolom "bedrijfsnaam" ontbreekt. Deze kolom is verplicht.')
  }

  if (fouten.length > 0) {
    return { isValid: false, fouten, waarschuwingen }
  }

  const geldigeTypes = ['relatie', 'project', 'offerte', 'factuur']
  let ongeldigeTypes = 0
  let leegBedrijf = 0

  for (let i = 0; i < rows.length; i++) {
    const rij = rows[i]
    const type = (rij.type || '').toLowerCase().trim()

    if (!geldigeTypes.includes(type)) {
      ongeldigeTypes++
      if (ongeldigeTypes <= 3) {
        fouten.push(`Rij ${i + 2}: ongeldige type "${rij.type}" (verwacht: relatie, project, offerte, of factuur)`)
      }
    }

    if (type === 'relatie' && !(rij.bedrijfsnaam || '').trim()) {
      leegBedrijf++
    }
  }

  if (ongeldigeTypes > 3) {
    fouten.push(`...en nog ${ongeldigeTypes - 3} rijen met ongeldig type.`)
  }

  if (leegBedrijf > 0) {
    waarschuwingen.push(`${leegBedrijf} relatie-rij(en) zonder bedrijfsnaam worden overgeslagen.`)
  }

  const zonderBedrijf = rows.filter(
    (r) => (r.type || '').toLowerCase().trim() !== 'relatie' && !(r.bedrijfsnaam || '').trim()
  ).length
  if (zonderBedrijf > 0) {
    waarschuwingen.push(`${zonderBedrijf} rij(en) zonder bedrijfsnaam — worden geïmporteerd zonder klantkoppeling.`)
  }

  return { isValid: fouten.length === 0, fouten, waarschuwingen }
}

export function valideerContactpersonen(
  headers: string[],
  rows: Record<string, string>[]
): { isValid: boolean; fouten: string[]; waarschuwingen: string[] } {
  const fouten: string[] = []
  const waarschuwingen: string[] = []

  const lowerHeaders = headers.map((h) => h.toLowerCase())
  const heeftVoornaam = lowerHeaders.includes('voornaam')
  const heeftAchternaam = lowerHeaders.includes('achternaam')
  const heeftEmail = lowerHeaders.includes('email')

  if (!heeftVoornaam && !heeftAchternaam && !heeftEmail) {
    fouten.push('Minstens één van de kolommen "voornaam", "achternaam", of "email" is vereist.')
  }

  if (fouten.length > 0) {
    return { isValid: false, fouten, waarschuwingen }
  }

  const zonderInfo = rows.filter((r) => {
    const voornaam = (r.voornaam || '').trim()
    const achternaam = (r.achternaam || '').trim()
    const email = (r.email || '').trim()
    return !voornaam && !achternaam && !email
  }).length

  if (zonderInfo > 0) {
    waarschuwingen.push(`${zonderInfo} rij(en) zonder naam en zonder email worden overgeslagen.`)
  }

  return { isValid: true, fouten, waarschuwingen }
}

// ============ DATA TRANSFORMATIES ============

/** "1.234,56" of "€1234.56" of "1234,56" → 1234.56 */
export function normaliseerBedrag(bedrag: string): number | null {
  if (!bedrag || !bedrag.trim()) return null
  let cleaned = bedrag.trim().replace(/[€\s]/g, '')

  // Detect Dutch format: 1.234,56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Check if comma comes after last dot → Dutch format
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      // Dutch: 1.234,56 → remove dots, replace comma
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    }
    // English: 1,234.56 → remove commas
    else {
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes(',')) {
    // Only comma: 1234,56 → replace with dot
    cleaned = cleaned.replace(',', '.')
  }

  cleaned = cleaned.replace(/[^0-9.\-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.round(num * 100) / 100
}

/** "20260323" of "23-03-2026" of "2026/03/23" → "2026-03-23" */
export function normaliseerDatum(datum: string): string | null {
  if (!datum || !datum.trim()) return null
  const d = datum.trim()

  // ISO format: 2026-03-23
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d

  // Compact: 20260323
  if (/^\d{8}$/.test(d)) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  }

  // Dutch: 23-03-2026 or 23/03/2026
  const nlMatch = d.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (nlMatch) {
    const dag = nlMatch[1].padStart(2, '0')
    const maand = nlMatch[2].padStart(2, '0')
    const jaar = nlMatch[3]
    return `${jaar}-${maand}-${dag}`
  }

  // US/ISO with slashes: 2026/03/23
  const isoSlash = d.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (isoSlash) {
    const maand = isoSlash[2].padStart(2, '0')
    const dag = isoSlash[3].padStart(2, '0')
    return `${isoSlash[1]}-${maand}-${dag}`
  }

  return null
}

/** Bedrijfsnaam normaliseren voor matching: lowercase, strip "B.V.", "BV", etc. */
export function normaliseerBedrijfsnaam(naam: string): string {
  return naam
    .trim()
    .toLowerCase()
    .replace(/\s*(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|holding)\s*$/i, '')
    .replace(/\.+$/, '')
    .trim()
}

// ============ IMPORT: BEDRIJFSDATA ============

const CHUNK_SIZE = 500

export async function importeerBedrijfsdata(
  rows: Record<string, string>[],
  organisatieId: string,
  userId: string,
  bestandsnaam: string,
  onProgress?: (current: number, total: number) => void,
): Promise<ImportOperationResult> {
  const resultaat: ImportOperationResult = {
    geimporteerd: 0,
    overgeslagen: 0,
    fouten: 0,
    foutMeldingen: [],
  }

  // Split rows by type
  const relatieRijen: Record<string, string>[] = []
  const historieRijen: Record<string, string>[] = []

  for (const rij of rows) {
    const type = (rij.type || '').toLowerCase().trim()
    if (type === 'relatie') {
      relatieRijen.push(rij)
    } else if (type === 'project' || type === 'offerte' || type === 'factuur') {
      historieRijen.push(rij)
    }
  }

  const totalSteps = relatieRijen.length + historieRijen.length
  let processed = 0

  // 1. Build existing klant map
  const bestaandeKlanten = await getKlanten()
  const klantMap = new Map<string, Klant>()
  bestaandeKlanten.forEach((k) => klantMap.set(normaliseerBedrijfsnaam(k.bedrijfsnaam), k))

  // 2. Import relaties → klanten tabel
  for (let i = 0; i < relatieRijen.length; i += CHUNK_SIZE) {
    const chunk = relatieRijen.slice(i, i + CHUNK_SIZE)

    for (const rij of chunk) {
      try {
        const bedrijfsnaam = (rij.bedrijfsnaam || '').trim()
        if (!bedrijfsnaam) {
          resultaat.overgeslagen++
          processed++
          onProgress?.(processed, totalSteps)
          continue
        }

        const zoekNaam = normaliseerBedrijfsnaam(bedrijfsnaam)
        if (klantMap.has(zoekNaam)) {
          resultaat.overgeslagen++
          processed++
          onProgress?.(processed, totalSteps)
          continue
        }

        const klant = await createKlant({
          user_id: userId,
          bedrijfsnaam,
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
          status: 'actief',
          tags: [],
          notities: '',
          contactpersonen: [],
          import_bron: 'csv_import',
        })

        klantMap.set(zoekNaam, klant)
        resultaat.geimporteerd++
      } catch (err) {
        resultaat.fouten++
        resultaat.foutMeldingen.push(
          `Relatie "${rij.bedrijfsnaam}": ${err instanceof Error ? err.message : 'Onbekende fout'}`
        )
      }
      processed++
      onProgress?.(processed, totalSteps)
    }
  }

  // 3. Import project/offerte/factuur → klant_historie tabel
  if (isSupabaseConfigured() && supabase) {
    for (let i = 0; i < historieRijen.length; i += CHUNK_SIZE) {
      const chunk = historieRijen.slice(i, i + CHUNK_SIZE)
      const batchData: Array<{
        organisatie_id: string
        klant_id: string | null
        type: string
        naam: string
        nummer: string
        datum: string | null
        bedrag: number | null
        verantwoordelijke: string
        user_id: string
      }> = []

      for (const rij of chunk) {
        const type = (rij.type || '').toLowerCase().trim()
        const bedrijfsnaam = (rij.bedrijfsnaam || '').trim()
        const zoekNaam = bedrijfsnaam ? normaliseerBedrijfsnaam(bedrijfsnaam) : ''
        const klant = zoekNaam ? klantMap.get(zoekNaam) : undefined

        batchData.push({
          organisatie_id: organisatieId,
          klant_id: klant?.id || null,
          type,
          naam: rij.naam || '',
          nummer: rij.nummer || '',
          datum: normaliseerDatum(rij.datum || ''),
          bedrag: normaliseerBedrag(rij.bedrag || ''),
          verantwoordelijke: rij.verantwoordelijke || '',
          user_id: userId,
        })
      }

      try {
        const { error } = await supabase
          .from('klant_historie')
          .insert(batchData)

        if (error) throw error
        resultaat.geimporteerd += batchData.length
      } catch (err) {
        resultaat.fouten += batchData.length
        resultaat.foutMeldingen.push(
          `Batch historie (${batchData.length} rijen): ${err instanceof Error ? err.message : 'Onbekende fout'}`
        )
      }

      processed += chunk.length
      onProgress?.(processed, totalSteps)
    }
  }

  // 4. Log import
  try {
    await createImportLog({
      organisatie_id: organisatieId,
      user_id: userId,
      type: 'bedrijfsdata',
      bestandsnaam,
      aantal_rijen: rows.length,
      aantal_geimporteerd: resultaat.geimporteerd,
      aantal_overgeslagen: resultaat.overgeslagen,
      aantal_fouten: resultaat.fouten,
      status: resultaat.fouten > 0 ? 'met_fouten' : 'voltooid',
    })
  } catch {
    // Log failure is niet kritiek
  }

  return resultaat
}

// ============ IMPORT: CONTACTPERSONEN ============

export async function importeerContactpersonen(
  rows: Record<string, string>[],
  organisatieId: string,
  userId: string,
  bestandsnaam: string,
  onProgress?: (current: number, total: number) => void,
): Promise<ImportOperationResult> {
  const resultaat: ImportOperationResult = {
    geimporteerd: 0,
    overgeslagen: 0,
    fouten: 0,
    foutMeldingen: [],
  }

  if (!isSupabaseConfigured() || !supabase) {
    resultaat.foutMeldingen.push('Supabase niet geconfigureerd')
    return resultaat
  }

  // Build klant map
  const klanten = await getKlanten()
  const klantMap = new Map<string, Klant>()
  klanten.forEach((k) => klantMap.set(normaliseerBedrijfsnaam(k.bedrijfsnaam), k))

  // Get existing emails for dedup
  const { data: bestaande } = await supabase
    .from('contactpersonen')
    .select('email')
    .eq('organisatie_id', organisatieId)
  const bestaandeEmails = new Set(
    (bestaande || [])
      .map((c: { email: string }) => c.email?.toLowerCase())
      .filter(Boolean)
  )

  const totalRows = rows.length

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const batchData: Array<{
      organisatie_id: string
      klant_id: string | null
      voornaam: string
      achternaam: string
      email: string
      telefoon: string
      functie: string
      notities: string
      user_id: string
    }> = []

    for (const rij of chunk) {
      const voornaam = (rij.voornaam || '').trim()
      const achternaam = (rij.achternaam || '').trim()
      const email = (rij.email || '').trim()

      // Skip rijen zonder naam en email
      if (!voornaam && !achternaam && !email) {
        resultaat.overgeslagen++
        continue
      }

      // Check duplicaat op email
      if (email && bestaandeEmails.has(email.toLowerCase())) {
        resultaat.overgeslagen++
        continue
      }

      // Koppel aan klant
      const bedrijfsnaam = (rij.bedrijfsnaam || '').trim()
      const zoekNaam = bedrijfsnaam ? normaliseerBedrijfsnaam(bedrijfsnaam) : ''
      const klant = zoekNaam ? klantMap.get(zoekNaam) : undefined

      batchData.push({
        organisatie_id: organisatieId,
        klant_id: klant?.id || null,
        voornaam,
        achternaam,
        email,
        telefoon: (rij.telefoon || '').trim(),
        functie: (rij.functie || '').trim(),
        notities: '',
        user_id: userId,
      })

      if (email) {
        bestaandeEmails.add(email.toLowerCase())
      }
    }

    if (batchData.length > 0) {
      try {
        const { error } = await supabase
          .from('contactpersonen')
          .insert(batchData)

        if (error) throw error
        resultaat.geimporteerd += batchData.length
      } catch (err) {
        resultaat.fouten += batchData.length
        resultaat.foutMeldingen.push(
          `Batch contactpersonen (${batchData.length} rijen): ${err instanceof Error ? err.message : 'Onbekende fout'}`
        )
      }
    }

    onProgress?.(Math.min(i + chunk.length, totalRows), totalRows)
  }

  // Log import
  try {
    await createImportLog({
      organisatie_id: organisatieId,
      user_id: userId,
      type: 'contactpersonen',
      bestandsnaam,
      aantal_rijen: rows.length,
      aantal_geimporteerd: resultaat.geimporteerd,
      aantal_overgeslagen: resultaat.overgeslagen,
      aantal_fouten: resultaat.fouten,
      status: resultaat.fouten > 0 ? 'met_fouten' : 'voltooid',
    })
  } catch {
    // Log failure is niet kritiek
  }

  return resultaat
}

// ============ TEMPLATE GENERATORS ============

export function generateBedrijfsdataTemplate(): string {
  const BOM = '\uFEFF'
  const header = 'type;bedrijfsnaam;naam;nummer;datum;bedrag;adres;postcode;plaats;telefoon;email;kvk_nummer;btw_nummer;verantwoordelijke'
  const rows = [
    'relatie;Bakkerij Janssen;;;;;Hoofdstraat 1;1234 AB;Amsterdam;020-1234567;info@bakkerij-janssen.nl;12345678;NL123456789B01;',
    'relatie;Bouwbedrijf De Groot B.V.;;;;;Industrieweg 88;5678 CD;Rotterdam;010-9876543;info@degroot-bouw.nl;87654321;;',
    'project;Bakkerij Janssen;Gevelreclame hoofdkantoor;P-2026-001;2026-01-15;;;;;;;;;Jan de Vries',
    'project;Bouwbedrijf De Groot B.V.;Signing entree;P-2026-002;2026-02-20;;;;;;;;;Marie Bakker',
    'offerte;Bakkerij Janssen;Gevelreclame 3x2m dibond;OFF-2026-001;2026-01-10;2500.00;;;;;;;;',
    'offerte;Bouwbedrijf De Groot B.V.;Raambelettering 12 stuks;OFF-2026-002;2026-02-15;890.00;;;;;;;;',
    'factuur;Bakkerij Janssen;Gevelreclame 3x2m dibond;FAC-2026-001;2026-02-01;2500.00;;;;;;;;',
    'factuur;Bouwbedrijf De Groot B.V.;Raambelettering 12 stuks;FAC-2026-002;2026-03-01;890.00;;;;;;;;',
  ]
  return BOM + [header, ...rows].join('\n')
}

export function generateContactpersonenTemplate(): string {
  const BOM = '\uFEFF'
  const header = 'bedrijfsnaam;voornaam;achternaam;email;telefoon;functie'
  const rows = [
    'Bakkerij Janssen;Jan;de Vries;jan@bakkerij-janssen.nl;06-12345678;Directeur',
    'Bakkerij Janssen;Marie;Bakker;marie@bakkerij-janssen.nl;06-87654321;Projectleider',
    'Bouwbedrijf De Groot B.V.;Kees;de Groot;kees@degroot-bouw.nl;06-11223344;Eigenaar',
    ';Piet;Vrijlancer;piet@gmail.com;06-99887766;Freelance monteur',
  ]
  return BOM + [header, ...rows].join('\n')
}

/** Download een string als CSV bestand */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
