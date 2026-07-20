/**
 * Importeert de SIBON-outreach-lijst als leads.
 *
 *   node scripts/import-sibon-leads.cjs <pad-naar-xlsx> [--dry-run]
 *
 * Draai eerst migratie 153_leads.sql. Idempotent via import_sleutel:
 * opnieuw draaien werkt bij, maakt geen dubbelen. Bestaande status en
 * notities blijven bij een herhaalde run staan.
 */

const path = require('path')
const fs = require('fs')
const XLSX = require('xlsx')

const USER_ID = 'ce6843e3-5cd9-4043-9461-55071bc91eb7'
const TAG = 'SIBON-campagne 2026'
const TABBLAD = 'Leden'
const IMPORT_BRON = 'sibon-doen-outreach-v7.xlsx'

// Datakwaliteitslabels uit het bronbestand die geen echte lead opleveren.
const SKIP_STATUS = ['beheerder', 'anoniem nummer', 'geen match gevonden']

const bestand = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

if (!bestand) {
  console.error('Gebruik: node scripts/import-sibon-leads.cjs <pad-naar-xlsx> [--dry-run]')
  process.exit(1)
}

for (const regel of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const match = regel.match(/^([A-Z_]+)=(.*)$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local')
  process.exit(1)
}

const tekst = (waarde) => String(waarde ?? '').trim()

// "Nautasign (eigenaar/directeur)" -> bedrijf "Nautasign", functie "eigenaar/directeur"
const splitsBedrijf = (ruw) => {
  const heel = tekst(ruw)
  const match = heel.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  return match ? { bedrijf: match[1].trim(), functie: match[2].trim() } : { bedrijf: heel, functie: '' }
}

const sleutel = (waarde) => tekst(waarde).toLowerCase().replace(/[^a-z0-9]+/g, '')

const rijen = XLSX.utils.sheet_to_json(XLSX.readFile(bestand).Sheets[TABBLAD], { defval: '' })
if (!rijen.length) {
  console.error(`Tabblad "${TABBLAD}" is leeg of ontbreekt`)
  process.exit(1)
}

const overgeslagen = []
const bruikbaar = []

rijen.forEach((rij, index) => {
  const excelRij = index + 2
  const bronStatus = tekst(rij.status)
  const laag = bronStatus.toLowerCase()

  if (SKIP_STATUS.some((s) => laag.includes(s))) {
    overgeslagen.push({ excelRij, reden: bronStatus })
    return
  }
  if (!tekst(rij.naam) && !tekst(rij.bedrijf)) {
    overgeslagen.push({ excelRij, reden: 'geen naam en geen bedrijf' })
    return
  }

  const { bedrijf, functie } = splitsBedrijf(rij.bedrijf)
  bruikbaar.push({
    excelRij,
    naam: tekst(rij.naam),
    bedrijf,
    functie,
    telefoon: tekst(rij.telefoon),
    email: tekst(rij.email),
    provincie: tekst(rij.provincie),
    plaats: tekst(rij.plaats),
    bron: tekst(rij.bron),
    bronStatus,
  })
})

// Eén lead per bedrijf; extra personen bij hetzelfde bedrijf worden
// contactpersoon. Rijen zonder bedrijf blijven een eigen lead.
const leadsPerSleutel = new Map()

for (const rij of bruikbaar) {
  const bedrijfsSleutel = sleutel(rij.bedrijf)
  const importSleutel = bedrijfsSleutel || `persoon-${sleutel(rij.naam)}-${sleutel(rij.telefoon)}`
  const bestaand = leadsPerSleutel.get(importSleutel)

  if (!bestaand) {
    leadsPerSleutel.set(importSleutel, {
      user_id: USER_ID,
      naam: rij.naam,
      bedrijf: rij.bedrijf,
      telefoon: rij.telefoon,
      email: rij.email,
      provincie: rij.provincie,
      plaats: rij.plaats,
      bron: rij.bron,
      bron_status: rij.bronStatus,
      tags: [TAG],
      contactpersonen: [],
      notities: '',
      import_bron: IMPORT_BRON,
      import_datum: new Date().toISOString(),
      import_sleutel: importSleutel,
      _excelRijen: [rij.excelRij],
      _functie: rij.functie,
    })
    continue
  }

  // De rij met een naam wint als hoofdcontact; de naamloze rij levert dan
  // alleen een extra telefoonnummer op (Mull2media, Nautasign).
  const nieuweIsBeter = !bestaand.naam && rij.naam
  const hoofd = nieuweIsBeter ? rij : { naam: bestaand.naam, functie: bestaand._functie, telefoon: bestaand.telefoon, email: bestaand.email, bron: bestaand.bron, bronStatus: bestaand.bron_status }
  const tweede = nieuweIsBeter ? { naam: bestaand.naam, functie: bestaand._functie, telefoon: bestaand.telefoon, email: bestaand.email } : rij

  bestaand.naam = hoofd.naam
  bestaand.telefoon = hoofd.telefoon
  bestaand.email = hoofd.email || bestaand.email
  bestaand.bron = hoofd.bron || bestaand.bron
  bestaand.bron_status = hoofd.bronStatus || bestaand.bron_status
  bestaand._functie = hoofd.functie

  bestaand.contactpersonen.push({
    id: `${importSleutel}-${bestaand.contactpersonen.length + 2}`,
    naam: tweede.naam,
    functie: tweede.functie || '',
    email: tweede.email,
    telefoon: tweede.telefoon,
    is_primair: false,
  })
  bestaand._excelRijen.push(rij.excelRij)
}

const leads = [...leadsPerSleutel.values()].map((lead) => {
  const { _excelRijen, _functie, ...rest } = lead
  return rest
})

const metContact = [...leadsPerSleutel.values()].filter((l) => l.contactpersonen.length)

console.log(`Rijen in "${TABBLAD}": ${rijen.length}`)
console.log(`Overgeslagen:          ${overgeslagen.length}`)
console.log(`Bruikbare rijen:       ${bruikbaar.length}`)
console.log(`Leads na samenvoegen:  ${leads.length}`)
console.log(`  waarvan met 2e contactpersoon: ${metContact.length}`)
for (const lead of metContact) {
  console.log(`    ${lead.bedrijf} (Excel-rij ${lead._excelRijen.join(', ')}) -> ${lead.naam} + ${lead.contactpersonen.map((c) => c.naam || '(naamloos)').join(', ')}`)
}
console.log(`Zonder e-mail:         ${leads.filter((l) => !l.email).length} (alleen WhatsApp-opvolging)`)

if (dryRun) {
  console.log('\n--dry-run: niets weggeschreven.')
  process.exit(0)
}

const upsert = async () => {
  const grootte = 100
  let verwerkt = 0

  for (let i = 0; i < leads.length; i += grootte) {
    const batch = leads.slice(i, i + grootte)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?on_conflict=user_id,import_sleutel`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        // ignore-duplicates: bestaande status/notities niet overschrijven.
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(batch),
    })

    if (!response.ok) {
      console.error(`\nFout bij batch ${i / grootte + 1}: ${response.status}`)
      console.error(await response.text())
      process.exit(1)
    }

    verwerkt += (await response.json()).length
  }

  console.log(`\nNieuw aangemaakt: ${verwerkt} van ${leads.length} (rest bestond al).`)
}

upsert()
