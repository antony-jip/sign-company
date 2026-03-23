/**
 * James PRO Import Service
 *
 * Handles parsing and importing of James PRO exports:
 * - Companies (CSV) → klanten
 * - Projects (XLSX) → projecten
 * - Offers (XLSX) → offertes
 * - Invoices (XLSX) → facturen
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

export interface JamesProImportData {
  klanten: Record<string, string>[]
  projecten: Record<string, string>[]
  offertes: Record<string, string>[]
  facturen: Record<string, string>[]
}

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

// ── File Parsing ──

export async function parseJamesProFile(file: File, type: ImportType): Promise<ParseResult> {
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

// ── Samenvatting (Stap 3) ──

export function buildSamenvatting(data: JamesProImportData): ImportSamenvatting {
  const warnings: string[] = []

  // Klant namen normaliseren
  const klantNamen = new Set(data.klanten.map(r => normalizeCompanyName(r.name || r.bedrijfsnaam || '')))

  // Project koppeling preview
  let projectLinked = 0
  for (const p of data.projecten) {
    const company = normalizeCompanyName(p.Company || p.company || '')
    if (company && klantNamen.has(company)) projectLinked++
  }
  if (data.projecten.length > 0 && projectLinked < data.projecten.length) {
    const unlinked = data.projecten.length - projectLinked
    warnings.push(`${unlinked} projecten kunnen niet aan een klant gekoppeld worden (bedrijfsnaam niet gevonden)`)
  }

  // Offerte statistieken
  let akkoord = 0, inAfwachting = 0, afgewezen = 0
  for (const o of data.offertes) {
    const st = (o.Status || o.status || '').toLowerCase()
    if (st.includes('akkoord') && !st.includes('niet')) akkoord++
    else if (st.includes('afwacht') || st.includes('wacht')) inAfwachting++
    else if (st.includes('niet')) afgewezen++
    else inAfwachting++
  }

  // Factuur totaal
  let totaalBedrag = 0
  for (const f of data.facturen) {
    const bedrag = parseFloat((f['Bedrag excl BTW'] || f['bedrag_excl_btw'] || '0').replace(',', '.'))
    if (!isNaN(bedrag)) totaalBedrag += bedrag
  }

  // Niet-gekoppelde facturen
  let factuurLinked = 0
  for (const f of data.facturen) {
    const company = normalizeCompanyName(f.Bedrijfsnaam || f.bedrijfsnaam || '')
    if (company && klantNamen.has(company)) factuurLinked++
  }
  if (data.facturen.length > 0 && factuurLinked < data.facturen.length) {
    const unlinked = data.facturen.length - factuurLinked
    warnings.push(`${unlinked} facturen worden geïmporteerd maar niet aan een klant gekoppeld`)
  }

  // Preview klanten (top 5 by linked items)
  const klantStats = new Map<string, PreviewKlant>()
  for (const r of data.klanten) {
    const naam = r.name || r.bedrijfsnaam || ''
    const norm = normalizeCompanyName(naam)
    if (!norm) continue
    klantStats.set(norm, { naam, projecten: 0, offertes: 0, facturen: 0, omzet: 0 })
  }

  for (const p of data.projecten) {
    const norm = normalizeCompanyName(p.Company || p.company || '')
    const k = klantStats.get(norm)
    if (k) k.projecten++
  }
  for (const o of data.offertes) {
    const norm = normalizeCompanyName(o.Bedrijfsnaam || o.bedrijfsnaam || '')
    const k = klantStats.get(norm)
    if (k) k.offertes++
  }
  for (const f of data.facturen) {
    const norm = normalizeCompanyName(f.Bedrijfsnaam || f.bedrijfsnaam || '')
    const bedrag = parseFloat((f['Bedrag excl BTW'] || '0').replace(',', '.')) || 0
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

// ── Import (Stap 4) ──

const BATCH_SIZE = 50

export async function importJamesProData(
  data: JamesProImportData,
  userId: string,
  onProgress: (p: ImportProgress) => void,
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
    const newKlanten: ReturnType<typeof mapJamesProKlant>[] = []
    const updateIds: { id: string; james_pro_id?: string }[] = []

    for (const row of batch) {
      const mapped = mapJamesProKlant(row, userId)
      const norm = normalizeCompanyName(mapped.bedrijfsnaam)
      if (!norm) { result.klanten.skipped++; continue }

      const existingId = existingMap.get(norm)
      if (existingId) {
        klantMap.set(norm, existingId)
        updateIds.push({ id: existingId, james_pro_id: mapped.james_pro_id })
        result.klanten.skipped++
      } else {
        newKlanten.push(mapped)
      }
    }

    // Batch update existing klanten metadata
    for (const upd of updateIds) {
      await supabase.from('klanten').update({
        james_pro_id: upd.james_pro_id,
        import_bron: 'james_pro',
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
        result.klanten.errors.push(`Batch ${i}: ${error.message}`)
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
    const mappedBatch: ReturnType<typeof mapJamesProProject>[] = []

    for (const row of batch) {
      const rawCompany = row.Company || row.company || ''
      const company = normalizeCompanyName(rawCompany)
      const klantId = klantMap.get(company)
      if (company && !klantId) unmatchedSet.add(rawCompany.trim())
      mappedBatch.push(mapJamesProProject(row, klantId, userId))
    }

    const { data: created, error } = await supabase
      .from('projecten')
      .insert(mappedBatch)
      .select('id, klant_id')

    if (error) {
      result.projecten.errors.push(`Batch ${i}: ${error.message}`)
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
    const mappedBatch: ReturnType<typeof mapJamesProOfferte>[] = []
    let batchLinkedKlant = 0

    for (const row of batch) {
      const rawCompany = row.Bedrijfsnaam || row.bedrijfsnaam || ''
      const company = normalizeCompanyName(rawCompany)
      const klantId = klantMap.get(company)
      if (company && !klantId) unmatchedSet.add(rawCompany.trim())
      mappedBatch.push(mapJamesProOfferte(row, klantId, userId))
      if (klantId) batchLinkedKlant++
    }

    const { data: created, error } = await supabase.from('offertes').insert(mappedBatch).select('id')

    if (error) {
      result.offertes.errors.push(`Batch ${i}: ${error.message}`)
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
    const mappedBatch: ReturnType<typeof mapJamesProFactuur>[] = []
    let batchLinkedKlant = 0

    for (const row of batch) {
      const rawCompany = row.Bedrijfsnaam || row.bedrijfsnaam || ''
      const company = normalizeCompanyName(rawCompany)
      const klantId = klantMap.get(company)
      if (company && !klantId) unmatchedSet.add(rawCompany.trim())
      mappedBatch.push(mapJamesProFactuur(row, klantId, userId))
      if (klantId) batchLinkedKlant++
    }

    const { data: created, error } = await supabase.from('facturen').insert(mappedBatch).select('id')

    if (error) {
      result.facturen.errors.push(`Batch ${i}: ${error.message}`)
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

// ── Mapping Functions ──

function mapJamesProKlant(row: Record<string, string>, userId: string) {
  const name = (row.name || row.bedrijfsnaam || '').trim()
  return {
    user_id: userId,
    bedrijfsnaam: name,
    contactpersoon: '',
    email: (row.email || '').trim(),
    telefoon: (row.phonenumber || row.telefoon || '').trim(),
    adres: (row.address || row.adres || '').trim(),
    postcode: (row.zip || row.postcode || '').trim(),
    stad: (row.city || row.stad || row.location || '').trim(),
    land: (row.country || '').trim() || 'Nederland',
    website: '',
    kvk_nummer: (row.COC || row.kvk_nummer || '').trim(),
    btw_nummer: (row.VAT || row.btw_nummer || '').trim(),
    status: 'actief' as const,
    tags: [] as string[],
    notities: '',
    contactpersonen: [] as { naam: string; email: string; telefoon: string; functie: string }[],
    james_pro_id: (row.number || '').trim() || undefined,
    klant_sinds: parseDate(row.date) || undefined,
    import_bron: 'james_pro',
    import_datum: new Date().toISOString(),
    import_metadata: {
      number_external: row.number_external || '',
      faxnumber: row.faxnumber || '',
      address2: row.address2 || '',
      location: row.location || '',
    },
  }
}

function mapJamesProProject(row: Record<string, string>, klantId: string | undefined, userId: string) {
  const naam = (row.name || '').trim()
  const dateCreated = parseDate(row.date_created)
  const deadline = parseDate(row.deadline)

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
    import_bron: 'james_pro',
    import_metadata: {
      james_pro_project_id: row.id || '',
      pm: row.PM || '',
      tags: row.tags || '',
      company: row.Company || '',
    },
  }
}

function mapJamesProOfferte(
  row: Record<string, string>,
  klantId: string | undefined,
  userId: string,
) {
  const nummer = (row.Offertenummer || row.offertenummer || '').trim()
  const titel = (row.Omschrijving || row.omschrijving || '').trim()
  const datum = parseDate(row.Datum || row.datum)
  const status = mapOfferteStatus(row.Status || row.status || '')
  const waarde = parseFloat((row.Waarde || row.waarde || '0').replace(',', '.')) || 0

  return {
    user_id: userId,
    klant_id: klantId || null,
    project_id: null,
    nummer: nummer || `JP-${Date.now()}`,
    titel: titel || 'Onbekend',
    status,
    subtotaal: waarde,
    btw_bedrag: 0,
    totaal: waarde,
    geldig_tot: datum ? new Date(new Date(datum).getTime() + 30 * 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notities: '',
    voorwaarden: '',
    verstuurd_op: datum || undefined,
    import_bron: 'james_pro',
    import_metadata: {
      james_pro_offerte_nummer: nummer,
      gemaakt_door: row['Gemaakt door'] || row.gemaakt_door || '',
      tags: row.Tags || row.tags || '',
      bedrijfsnaam: row.Bedrijfsnaam || row.bedrijfsnaam || '',
    },
  }
}

function mapJamesProFactuur(
  row: Record<string, string>,
  klantId: string | undefined,
  userId: string,
) {
  const nummer = (row.Factuurnummer || row.factuurnummer || '').trim()
  const titel = (row.Omschrijving || row.omschrijving || '').trim()
  const factuurdatum = parseDate(row.Factuurdatum || row.factuurdatum)
  const vervaldatum = parseDate(row.Vervaldatum || row.vervaldatum)
  const exclBtw = parseFloat((row['Bedrag excl BTW'] || row.bedrag_excl_btw || '0').replace(',', '.')) || 0
  const inclBtw = parseFloat((row['Bedrag incl BTW'] || row.bedrag_incl_btw || '0').replace(',', '.')) || 0
  const dagenVervallen = parseInt(row['Dagen vervallen'] || row.dagen_vervallen || '0') || 0

  return {
    user_id: userId,
    klant_id: klantId || null,
    project_id: null,
    nummer: nummer || `JP-F-${Date.now()}`,
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
    import_bron: 'james_pro',
    import_metadata: {
      james_pro_factuur_nummer: nummer,
      company_id: row['Company ID'] || row.company_id || '',
      bedrijfsnaam: row.Bedrijfsnaam || row.bedrijfsnaam || '',
      dagen_vervallen: dagenVervallen,
    },
  }
}

// ── Helpers ──

function mapOfferteStatus(jamesStatus: string): 'concept' | 'verzonden' | 'bekeken' | 'goedgekeurd' | 'afgewezen' | 'verlopen' | 'gefactureerd' | 'wijziging_gevraagd' {
  const s = jamesStatus.toLowerCase()
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

