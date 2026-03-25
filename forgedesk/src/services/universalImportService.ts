/**
 * Universal Import Service
 *
 * Handles parsing and importing of data from any source:
 * - Klanten (CSV/XLSX) → klanten
 * - Projecten (CSV/XLSX) → projecten
 * - Offertes (CSV/XLSX) → offertes
 * - Facturen (CSV/XLSX) → facturen
 *
 * Kolom auto-detectie maakt het mogelijk om bestanden van elk systeem te importeren.
 */

import * as XLSX from 'xlsx'
import supabase from './supabaseClient'

// ── Types ──

export type ImportType = 'klanten' | 'projecten' | 'offertes' | 'facturen'

export interface ParseResult {
  type: ImportType
  rows: Record<string, string>[]
  count: number
  error?: string
}

export interface ImportProgress {
  type: ImportType
  current: number
  total: number
  status: 'wacht' | 'bezig' | 'klaar' | 'fout'
  error?: string
}

export interface ImportResultaat {
  klanten: { imported: number; skipped: number; errors: string[] }
  projecten: { imported: number; linked: number; errors: string[] }
  offertes: { imported: number; linkedKlant: number; errors: string[] }
  facturen: { imported: number; linkedKlant: number; errors: string[] }
  unmatchedNames: string[] // bedrijfsnamen die niet gekoppeld konden worden
}

export interface ImportData {
  klanten: Record<string, string>[]
  projecten: Record<string, string>[]
  offertes: Record<string, string>[]
  facturen: Record<string, string>[]
}

/** @deprecated Gebruik ImportData */
export type JamesProImportData = ImportData

export interface ImportSamenvatting {
  klanten: number
  projecten: { total: number; linkedKlanten: number }
  offertes: { total: number; akkoord: number; inAfwachting: number; afgewezen: number }
  facturen: { total: number; totaalBedrag: number }
  warnings: string[]
  previewKlanten: PreviewKlant[]
}

interface PreviewKlant {
  naam: string
  projecten: number
  offertes: number
  facturen: number
  omzet: number
}

// ── Kolom Auto-Detectie ──

const KOLOM_HERKENNING: Record<string, string> = {
  // Klanten
  'name': 'bedrijfsnaam', 'bedrijfsnaam': 'bedrijfsnaam', 'company': 'bedrijfsnaam', 'company name': 'bedrijfsnaam', 'firma': 'bedrijfsnaam', 'bedrijf': 'bedrijfsnaam',
  'email': 'email', 'e-mail': 'email', 'emailadres': 'email',
  'phone': 'telefoon', 'phonenumber': 'telefoon', 'telefoon': 'telefoon', 'telefoonnummer': 'telefoon', 'tel': 'telefoon',
  'address': 'adres', 'adres': 'adres', 'straat': 'adres',
  'zip': 'postcode', 'postcode': 'postcode', 'postal code': 'postcode',
  'city': 'stad', 'stad': 'stad', 'plaats': 'stad', 'woonplaats': 'stad', 'location': 'stad',
  'country': 'land', 'land': 'land',
  'website': 'website', 'url': 'website',
  'coc': 'kvk_nummer', 'kvk': 'kvk_nummer', 'kvk_nummer': 'kvk_nummer', 'kvk nummer': 'kvk_nummer',
  'vat': 'btw_nummer', 'btw': 'btw_nummer', 'btw_nummer': 'btw_nummer', 'btw nummer': 'btw_nummer',
  // Projecten
  'project': 'naam', 'projectnaam': 'naam', 'project name': 'naam',
  'date_created': 'start_datum', 'startdatum': 'start_datum', 'start datum': 'start_datum',
  'deadline': 'eind_datum', 'einddatum': 'eind_datum', 'eind datum': 'eind_datum',
  'pm': 'projectleider', 'projectleider': 'projectleider',
  // Offertes
  'offertenummer': 'nummer', 'offerte nummer': 'nummer', 'quote number': 'nummer',
  'omschrijving': 'titel', 'description': 'titel', 'titel': 'titel',
  'datum': 'datum', 'date': 'datum',
  'status': 'status',
  'waarde': 'waarde', 'value': 'waarde', 'bedrag': 'waarde', 'amount': 'waarde',
  // Facturen
  'factuurnummer': 'nummer', 'factuur nummer': 'nummer', 'invoice number': 'nummer',
  'factuurdatum': 'factuurdatum', 'invoice date': 'factuurdatum',
  'vervaldatum': 'vervaldatum', 'due date': 'vervaldatum',
  'bedrag excl btw': 'bedrag_excl_btw', 'bedrag_excl_btw': 'bedrag_excl_btw', 'amount excl vat': 'bedrag_excl_btw',
  'bedrag incl btw': 'bedrag_incl_btw', 'bedrag_incl_btw': 'bedrag_incl_btw', 'amount incl vat': 'bedrag_incl_btw',
  'dagen vervallen': 'dagen_vervallen', 'days overdue': 'dagen_vervallen',
}

/**
 * Detecteer kolomnamen en map ze naar interne veldnamen.
 * Geeft een mapping terug van originele header → intern veld.
 */
export function detectKolommen(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const header of headers) {
    const normalized = header.toLowerCase().trim()
    const match = KOLOM_HERKENNING[normalized]
    if (match) mapping[header] = match
  }
  return mapping
}

// ── File Parsing ──

export async function parseImportFile(file: File, type: ImportType): Promise<ParseResult> {
  try {
    const ext = file.name.split('.').pop()?.toLowerCase()
    let rows: Record<string, string>[]

    if (ext === 'csv') {
      rows = await parseCSVFile(file)
    } else if (ext === 'xls' || ext === 'xlsx') {
      rows = await parseExcelFile(file)
    } else {
      return { type, rows: [], count: 0, error: 'Ongeldig bestandstype. Gebruik CSV, XLS of XLSX.' }
    }

    if (rows.length === 0) {
      return { type, rows: [], count: 0, error: 'Geen data gevonden in het bestand.' }
    }

    return { type, rows, count: rows.length }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bestand kon niet worden gelezen'
    return { type, rows: [], count: 0, error: msg }
  }
}

/** @deprecated Gebruik parseImportFile */
export const parseJamesProFile = parseImportFile

async function parseCSVFile(file: File): Promise<Record<string, string>[]> {
  const text = await file.text()
  const clean = text.replace(/^\uFEFF/, '') // UTF-8 BOM

  // Detect separator
  const firstLine = clean.split('\n')[0] || ''
  const separator = firstLine.includes(';') ? ';' : ','

  const lines = clean.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0], separator)
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line, separator)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || '').trim()
    })
    return row
  })
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

async function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  // Stringify all values
  return raw.map(row => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) {
        out[k] = v.toISOString().split('T')[0]
      } else {
        out[k] = String(v ?? '')
      }
    }
    return out
  })
}

// ── Name Matching ──

function normalizeCompanyName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    // Strip rechtsvorm-suffixen
    .replace(/\b(b\.?\s*v\.?|n\.?\s*v\.?|v\.?\s*o\.?\s*f\.?|c\.?\s*v\.?)\s*$/i, '')
    // Strip trailing dots, commas, dashes
    .replace(/[.,\-]+$/, '')
    .trim()
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
}

// ── Helper: veld ophalen met meerdere mogelijke namen ──

function getField(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key]
    if (val !== undefined && val !== '') return val.trim()
  }
  return ''
}

// ── Samenvatting (Controleren stap) ──

export function buildSamenvatting(data: ImportData): ImportSamenvatting {
  const warnings: string[] = []

  // Klant namen normaliseren
  const klantNamen = new Set(data.klanten.map(r => normalizeCompanyName(
    getField(r, 'name', 'bedrijfsnaam', 'Name', 'Bedrijfsnaam', 'company', 'Company', 'firma', 'Firma', 'bedrijf', 'Bedrijf')
  )))

  // Project koppeling preview
  let projectLinked = 0
  for (const p of data.projecten) {
    const company = normalizeCompanyName(
      getField(p, 'Company', 'company', 'bedrijfsnaam', 'Bedrijfsnaam', 'firma', 'Firma')
    )
    if (company && klantNamen.has(company)) projectLinked++
  }
  if (data.projecten.length > 0 && projectLinked < data.projecten.length) {
    const unlinked = data.projecten.length - projectLinked
    warnings.push(`${unlinked} projecten kunnen niet aan een klant gekoppeld worden (bedrijfsnaam niet gevonden)`)
  }

  // Offerte statistieken
  let akkoord = 0, inAfwachting = 0, afgewezen = 0
  for (const o of data.offertes) {
    const st = getField(o, 'Status', 'status').toLowerCase()
    if (st.includes('akkoord') && !st.includes('niet')) akkoord++
    else if (st.includes('afwacht') || st.includes('wacht')) inAfwachting++
    else if (st.includes('niet')) afgewezen++
    else inAfwachting++
  }

  // Factuur totaal
  let totaalBedrag = 0
  for (const f of data.facturen) {
    const bedrag = parseFloat(getField(f, 'Bedrag excl BTW', 'bedrag_excl_btw', 'amount excl vat', 'bedrag', 'Bedrag').replace(',', '.'))
    if (!isNaN(bedrag)) totaalBedrag += bedrag
  }

  // Niet-gekoppelde facturen
  let factuurLinked = 0
  for (const f of data.facturen) {
    const company = normalizeCompanyName(
      getField(f, 'Bedrijfsnaam', 'bedrijfsnaam', 'Company', 'company', 'firma', 'Firma')
    )
    if (company && klantNamen.has(company)) factuurLinked++
  }
  if (data.facturen.length > 0 && factuurLinked < data.facturen.length) {
    const unlinked = data.facturen.length - factuurLinked
    warnings.push(`${unlinked} facturen worden geïmporteerd maar niet aan een klant gekoppeld`)
  }

  // Preview klanten (top 5 by linked items)
  const klantStats = new Map<string, PreviewKlant>()
  for (const r of data.klanten) {
    const naam = getField(r, 'name', 'bedrijfsnaam', 'Name', 'Bedrijfsnaam', 'company', 'Company', 'firma', 'Firma', 'bedrijf', 'Bedrijf')
    const norm = normalizeCompanyName(naam)
    if (!norm) continue
    klantStats.set(norm, { naam, projecten: 0, offertes: 0, facturen: 0, omzet: 0 })
  }

  for (const p of data.projecten) {
    const norm = normalizeCompanyName(
      getField(p, 'Company', 'company', 'bedrijfsnaam', 'Bedrijfsnaam', 'firma', 'Firma')
    )
    const k = klantStats.get(norm)
    if (k) k.projecten++
  }
  for (const o of data.offertes) {
    const norm = normalizeCompanyName(
      getField(o, 'Bedrijfsnaam', 'bedrijfsnaam', 'Company', 'company', 'firma', 'Firma')
    )
    const k = klantStats.get(norm)
    if (k) k.offertes++
  }
  for (const f of data.facturen) {
    const norm = normalizeCompanyName(
      getField(f, 'Bedrijfsnaam', 'bedrijfsnaam', 'Company', 'company', 'firma', 'Firma')
    )
    const bedrag = parseFloat(getField(f, 'Bedrag excl BTW', 'bedrag_excl_btw', 'amount excl vat').replace(',', '.')) || 0
    const k = klantStats.get(norm)
    if (k) { k.facturen++; k.omzet += bedrag }
  }

  const previewKlanten = [...klantStats.values()]
    .sort((a, b) => (b.projecten + b.offertes + b.facturen) - (a.projecten + a.offertes + a.facturen))
    .slice(0, 5)

  return {
    klanten: data.klanten.length,
    projecten: { total: data.projecten.length, linkedKlanten: projectLinked },
    offertes: { total: data.offertes.length, akkoord, inAfwachting, afgewezen },
    facturen: { total: data.facturen.length, totaalBedrag },
    warnings,
    previewKlanten,
  }
}

// ── Import ──

const BATCH_SIZE = 50

export async function importData(
  data: ImportData,
  userId: string,
  onProgress: (p: ImportProgress) => void,
  importBron: string = 'import',
): Promise<ImportResultaat> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')

  const result: ImportResultaat = {
    klanten: { imported: 0, skipped: 0, errors: [] },
    projecten: { imported: 0, linked: 0, errors: [] },
    offertes: { imported: 0, linkedKlant: 0, errors: [] },
    facturen: { imported: 0, linkedKlant: 0, errors: [] },
    unmatchedNames: [],
  }
  const unmatchedSet = new Set<string>() // track unique unmatched bedrijfsnamen

  // ── 1. Klanten (individueel vanwege duplicate check) ──
  onProgress({ type: 'klanten', current: 0, total: data.klanten.length, status: 'bezig' })
  const klantMap = new Map<string, string>() // normalizedName → id

  // Pre-fetch all existing klanten for this user in one query
  const { data: existingKlanten } = await supabase
    .from('klanten')
    .select('id, bedrijfsnaam')
    .eq('user_id', userId)
  const existingMap = new Map(
    (existingKlanten || []).map((k: { id: string; bedrijfsnaam: string }) => [normalizeCompanyName(k.bedrijfsnaam), k.id])
  )

  for (let i = 0; i < data.klanten.length; i += BATCH_SIZE) {
    const batch = data.klanten.slice(i, i + BATCH_SIZE)
    const newKlanten: ReturnType<typeof mapKlant>[] = []
    const updateIds: { id: string; import_id?: string }[] = []

    for (const row of batch) {
      const mapped = mapKlant(row, userId, importBron)
      const norm = normalizeCompanyName(mapped.bedrijfsnaam)
      if (!norm) { result.klanten.skipped++; continue }

      const existingId = existingMap.get(norm)
      if (existingId) {
        klantMap.set(norm, existingId)
        updateIds.push({ id: existingId, import_id: mapped.james_pro_id })
        result.klanten.skipped++
      } else {
        newKlanten.push(mapped)
      }
    }

    // Batch update existing klanten metadata
    for (const upd of updateIds) {
      await supabase.from('klanten').update({
        james_pro_id: upd.import_id,
        import_bron: importBron,
        import_datum: new Date().toISOString(),
      }).eq('id', upd.id)
    }

    // Batch insert new klanten
    if (newKlanten.length > 0) {
      const { data: created, error } = await supabase
        .from('klanten')
        .insert(newKlanten)
        .select('id, bedrijfsnaam')

      if (error) {
        // Batch failed — retry per record
        for (const record of newKlanten) {
          const { data: single, error: singleError } = await supabase
            .from('klanten')
            .insert(record)
            .select('id, bedrijfsnaam')

          if (singleError) {
            result.klanten.errors.push(`${record.bedrijfsnaam || 'onbekend'}: ${singleError.message}`)
          } else if (single && single[0]) {
            klantMap.set(normalizeCompanyName(single[0].bedrijfsnaam), single[0].id)
            existingMap.set(normalizeCompanyName(single[0].bedrijfsnaam), single[0].id)
            result.klanten.imported++
          }
        }
      } else if (created) {
        for (const k of created) {
          klantMap.set(normalizeCompanyName(k.bedrijfsnaam), k.id)
          existingMap.set(normalizeCompanyName(k.bedrijfsnaam), k.id)
        }
        result.klanten.imported += created.length
      }
    }

    onProgress({ type: 'klanten', current: Math.min(i + BATCH_SIZE, data.klanten.length), total: data.klanten.length, status: 'bezig' })
  }
  onProgress({ type: 'klanten', current: data.klanten.length, total: data.klanten.length, status: 'klaar' })

  // ── 2. Projecten (batch insert) ──
  onProgress({ type: 'projecten', current: 0, total: data.projecten.length, status: 'bezig' })

  for (let i = 0; i < data.projecten.length; i += BATCH_SIZE) {
    const batch = data.projecten.slice(i, i + BATCH_SIZE)
    const mappedBatch: ReturnType<typeof mapProject>[] = []

    for (const row of batch) {
      const rawCompany = getField(row, 'Company', 'company', 'bedrijfsnaam', 'Bedrijfsnaam', 'firma', 'Firma')
      const company = normalizeCompanyName(rawCompany)
      const klantId = klantMap.get(company)
      if (company && !klantId) unmatchedSet.add(rawCompany.trim())
      mappedBatch.push(mapProject(row, klantId, userId, importBron))
    }

    const { data: created, error } = await supabase
      .from('projecten')
      .insert(mappedBatch)
      .select('id, klant_id')

    if (error) {
      // Batch failed — retry per record
      for (const record of mappedBatch) {
        const { data: single, error: singleError } = await supabase
          .from('projecten')
          .insert(record)
          .select('id, klant_id')

        if (singleError) {
          result.projecten.errors.push(`${record.naam || 'onbekend'}: ${singleError.message}`)
        } else if (single && single[0]) {
          result.projecten.imported++
          if (single[0].klant_id) result.projecten.linked++
        }
      }
    } else if (created) {
      result.projecten.imported += created.length
      result.projecten.linked += created.filter((p: { klant_id: string | null }) => !!p.klant_id).length
    }

    onProgress({ type: 'projecten', current: Math.min(i + BATCH_SIZE, data.projecten.length), total: data.projecten.length, status: 'bezig' })
  }
  onProgress({ type: 'projecten', current: data.projecten.length, total: data.projecten.length, status: 'klaar' })

  // ── 3. Offertes (batch insert, klant-only koppeling) ──
  onProgress({ type: 'offertes', current: 0, total: data.offertes.length, status: 'bezig' })

  for (let i = 0; i < data.offertes.length; i += BATCH_SIZE) {
    const batch = data.offertes.slice(i, i + BATCH_SIZE)
    const mappedBatch: ReturnType<typeof mapOfferte>[] = []
    let batchLinkedKlant = 0

    for (const row of batch) {
      const rawCompany = getField(row, 'Bedrijfsnaam', 'bedrijfsnaam', 'Company', 'company', 'firma', 'Firma')
      const company = normalizeCompanyName(rawCompany)
      const klantId = klantMap.get(company)
      if (company && !klantId) unmatchedSet.add(rawCompany.trim())
      mappedBatch.push(mapOfferte(row, klantId, userId, importBron))
      if (klantId) batchLinkedKlant++
    }

    const { data: created, error } = await supabase.from('offertes').insert(mappedBatch).select('id')

    if (error) {
      // Batch failed — retry per record
      for (const record of mappedBatch) {
        const { data: single, error: singleError } = await supabase
          .from('offertes')
          .insert(record)
          .select('id')

        if (singleError) {
          result.offertes.errors.push(`${record.nummer || 'onbekend'}: ${singleError.message}`)
        } else if (single) {
          result.offertes.imported++
          // We can't easily track linkedKlant per record here, but the klantId is set
          if (record.klant_id) result.offertes.linkedKlant++
        }
      }
    } else if (created) {
      result.offertes.imported += created.length
      result.offertes.linkedKlant += batchLinkedKlant
    }

    onProgress({ type: 'offertes', current: Math.min(i + BATCH_SIZE, data.offertes.length), total: data.offertes.length, status: 'bezig' })
  }
  onProgress({ type: 'offertes', current: data.offertes.length, total: data.offertes.length, status: 'klaar' })

  // ── 4. Facturen (batch insert, klant-only koppeling) ──
  onProgress({ type: 'facturen', current: 0, total: data.facturen.length, status: 'bezig' })

  for (let i = 0; i < data.facturen.length; i += BATCH_SIZE) {
    const batch = data.facturen.slice(i, i + BATCH_SIZE)
    const mappedBatch: ReturnType<typeof mapFactuur>[] = []
    let batchLinkedKlant = 0

    for (const row of batch) {
      const rawCompany = getField(row, 'Bedrijfsnaam', 'bedrijfsnaam', 'Company', 'company', 'firma', 'Firma')
      const company = normalizeCompanyName(rawCompany)
      const klantId = klantMap.get(company)
      if (company && !klantId) unmatchedSet.add(rawCompany.trim())
      mappedBatch.push(mapFactuur(row, klantId, userId, importBron))
      if (klantId) batchLinkedKlant++
    }

    const { data: created, error } = await supabase.from('facturen').insert(mappedBatch).select('id')

    if (error) {
      // Batch failed — retry per record
      for (const record of mappedBatch) {
        const { data: single, error: singleError } = await supabase
          .from('facturen')
          .insert(record)
          .select('id')

        if (singleError) {
          result.facturen.errors.push(`${record.nummer || 'onbekend'}: ${singleError.message}`)
        } else if (single) {
          result.facturen.imported++
          if (record.klant_id) result.facturen.linkedKlant++
        }
      }
    } else if (created) {
      result.facturen.imported += created.length
      result.facturen.linkedKlant += batchLinkedKlant
    }

    onProgress({ type: 'facturen', current: Math.min(i + BATCH_SIZE, data.facturen.length), total: data.facturen.length, status: 'bezig' })
  }
  onProgress({ type: 'facturen', current: data.facturen.length, total: data.facturen.length, status: 'klaar' })

  result.unmatchedNames = [...unmatchedSet].sort()
  return result
}

/** @deprecated Gebruik importData */
export const importJamesProData = importData

// ── Mapping Functions ──

function mapKlant(row: Record<string, string>, userId: string, importBron: string) {
  const name = getField(row, 'name', 'bedrijfsnaam', 'Name', 'Bedrijfsnaam', 'company', 'Company', 'firma', 'Firma', 'bedrijf', 'Bedrijf')
  return {
    user_id: userId,
    bedrijfsnaam: name,
    contactpersoon: getField(row, 'contactpersoon', 'Contactpersoon', 'contact', 'Contact'),
    email: getField(row, 'email', 'Email', 'e-mail', 'E-mail', 'emailadres', 'Emailadres'),
    telefoon: getField(row, 'phonenumber', 'telefoon', 'Telefoon', 'phone', 'Phone', 'telefoonnummer', 'Telefoonnummer', 'tel', 'Tel'),
    adres: getField(row, 'address', 'adres', 'Adres', 'Address', 'straat', 'Straat'),
    postcode: getField(row, 'zip', 'postcode', 'Postcode', 'postal code', 'Postal Code'),
    stad: getField(row, 'city', 'stad', 'Stad', 'location', 'Location', 'plaats', 'Plaats', 'woonplaats', 'Woonplaats'),
    land: getField(row, 'country', 'land', 'Land', 'Country') || 'Nederland',
    website: getField(row, 'website', 'Website', 'url', 'URL'),
    kvk_nummer: getField(row, 'COC', 'coc', 'kvk', 'kvk_nummer', 'KVK', 'kvk nummer', 'KVK nummer'),
    btw_nummer: getField(row, 'VAT', 'vat', 'btw', 'btw_nummer', 'BTW', 'btw nummer', 'BTW nummer'),
    status: 'actief' as const,
    tags: [] as string[],
    notities: '',
    contactpersonen: [] as { naam: string; email: string; telefoon: string; functie: string }[],
    james_pro_id: getField(row, 'number', 'Number', 'id', 'ID') || undefined,
    klant_sinds: parseDate(row.date || row.Date || row.datum || row.Datum) || undefined,
    import_bron: importBron,
    import_datum: new Date().toISOString(),
    import_metadata: {
      number_external: row.number_external || row.Number_external || '',
      faxnumber: row.faxnumber || row.Faxnumber || '',
      address2: row.address2 || row.Address2 || '',
      location: row.location || row.Location || '',
    },
  }
}

function mapProject(row: Record<string, string>, klantId: string | undefined, userId: string, importBron: string) {
  const naam = getField(row, 'name', 'Name', 'naam', 'Naam', 'projectnaam', 'Projectnaam', 'project', 'Project')
  const dateCreated = parseDate(
    getField(row, 'date_created', 'Date_created', 'startdatum', 'Startdatum', 'start datum', 'Start datum', 'datum', 'Datum')
  )
  const deadline = parseDate(
    getField(row, 'deadline', 'Deadline', 'einddatum', 'Einddatum', 'eind datum', 'Eind datum')
  )

  return {
    user_id: userId,
    klant_id: klantId || null,
    naam,
    beschrijving: '',
    status: 'afgerond' as const,
    prioriteit: 'medium' as const,
    budget: 0,
    besteed: 0,
    voortgang: 100,
    team_leden: [] as string[],
    start_datum: dateCreated || undefined,
    eind_datum: deadline || undefined,
    import_bron: importBron,
    import_metadata: {
      import_project_id: getField(row, 'id', 'ID'),
      pm: getField(row, 'PM', 'pm', 'projectleider', 'Projectleider'),
      tags: getField(row, 'tags', 'Tags'),
      company: getField(row, 'Company', 'company', 'bedrijfsnaam', 'Bedrijfsnaam'),
    },
  }
}

function mapOfferte(
  row: Record<string, string>,
  klantId: string | undefined,
  userId: string,
  importBron: string,
) {
  const nummer = getField(row, 'Offertenummer', 'offertenummer', 'offerte nummer', 'Offerte nummer', 'quote number', 'Quote number', 'nummer', 'Nummer')
  const titel = getField(row, 'Omschrijving', 'omschrijving', 'description', 'Description', 'titel', 'Titel')
  const datum = parseDate(getField(row, 'Datum', 'datum', 'date', 'Date'))
  const status = mapOfferteStatus(getField(row, 'Status', 'status'))
  const waarde = parseFloat(getField(row, 'Waarde', 'waarde', 'value', 'Value', 'bedrag', 'Bedrag', 'amount', 'Amount').replace(',', '.')) || 0

  return {
    user_id: userId,
    klant_id: klantId || null,
    project_id: null,
    nummer: nummer || `IMP-${Date.now()}`,
    titel: titel || 'Onbekend',
    status,
    subtotaal: waarde,
    btw_bedrag: 0,
    totaal: waarde,
    geldig_tot: datum ? new Date(new Date(datum).getTime() + 30 * 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notities: '',
    voorwaarden: '',
    verstuurd_op: datum || undefined,
    import_bron: importBron,
    import_metadata: {
      import_offerte_nummer: nummer,
      gemaakt_door: getField(row, 'Gemaakt door', 'gemaakt_door', 'Created by', 'created_by'),
      tags: getField(row, 'Tags', 'tags'),
      bedrijfsnaam: getField(row, 'Bedrijfsnaam', 'bedrijfsnaam', 'Company', 'company'),
    },
  }
}

function mapFactuur(
  row: Record<string, string>,
  klantId: string | undefined,
  userId: string,
  importBron: string,
) {
  const nummer = getField(row, 'Factuurnummer', 'factuurnummer', 'factuur nummer', 'Factuur nummer', 'invoice number', 'Invoice number', 'nummer', 'Nummer')
  const titel = getField(row, 'Omschrijving', 'omschrijving', 'description', 'Description', 'titel', 'Titel')
  const factuurdatum = parseDate(getField(row, 'Factuurdatum', 'factuurdatum', 'invoice date', 'Invoice date', 'datum', 'Datum'))
  const vervaldatum = parseDate(getField(row, 'Vervaldatum', 'vervaldatum', 'due date', 'Due date'))
  const exclBtw = parseFloat(getField(row, 'Bedrag excl BTW', 'bedrag_excl_btw', 'amount excl vat', 'Amount excl VAT').replace(',', '.')) || 0
  const inclBtw = parseFloat(getField(row, 'Bedrag incl BTW', 'bedrag_incl_btw', 'amount incl vat', 'Amount incl VAT').replace(',', '.')) || 0
  const dagenVervallen = parseInt(getField(row, 'Dagen vervallen', 'dagen_vervallen', 'days overdue', 'Days overdue')) || 0

  return {
    user_id: userId,
    klant_id: klantId || null,
    project_id: null,
    nummer: nummer || `IMP-F-${Date.now()}`,
    titel: titel || 'Onbekend',
    status: (dagenVervallen > 0 ? 'vervallen' : 'verzonden') as 'vervallen' | 'verzonden',
    subtotaal: exclBtw,
    btw_bedrag: Math.round((inclBtw - exclBtw) * 100) / 100,
    totaal: inclBtw || exclBtw,
    betaald_bedrag: 0,
    factuurdatum: factuurdatum || new Date().toISOString().split('T')[0],
    vervaldatum: vervaldatum || new Date().toISOString().split('T')[0],
    notities: '',
    voorwaarden: '',
    import_bron: importBron,
    import_metadata: {
      import_factuur_nummer: nummer,
      company_id: getField(row, 'Company ID', 'company_id'),
      bedrijfsnaam: getField(row, 'Bedrijfsnaam', 'bedrijfsnaam', 'Company', 'company'),
      dagen_vervallen: dagenVervallen,
    },
  }
}

// ── Helpers ──

function mapOfferteStatus(statusStr: string): 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen' | 'verlopen' | 'gefactureerd' | 'wijziging_gevraagd' {
  const s = statusStr.toLowerCase()
  if (s.includes('akkoord') && !s.includes('niet')) return 'goedgekeurd'
  if (s.includes('niet akkoord') || s.includes('afgewezen')) return 'afgewezen'
  if (s.includes('afwacht') || s.includes('wacht')) return 'verzonden'
  if (s.includes('concept')) return 'concept'
  return 'verzonden'
}

function parseDate(val: string | undefined): string | undefined {
  if (!val || val === 'None' || val === 'null' || val === '') return undefined
  const d = new Date(val)
  if (isNaN(d.getTime())) return undefined
  return d.toISOString().split('T')[0]
}
