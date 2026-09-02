/**
 * Vult en ververst de demo-omgeving (Signmakers Demo BV).
 *
 *   node scripts/demo-data.cjs [--dry-run]
 *
 * De demo is de belangrijkste verkoopasset: hij staat achter de link in de
 * outreach-mail, achter de knop op de landingspagina en op de telefoon aan
 * tafel. Wie hem opent moet binnen vier seconden zien dat dit signwerk is en
 * geen algemene bedrijfssoftware.
 *
 * Alle datums worden bij elke run opnieuw om vandaag heen gelegd. Draai je
 * hem elke nacht, dan is de demo altijd "deze week" en zet hij tegelijk terug
 * wat bezoekers overdag hebben aangepast.
 *
 * Raakt uitsluitend rijen met organisatie_id = DEMO_ORG.
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

for (const regel of fs.readFileSync(path.join(__dirname, '..', '.env.vercel.local'), 'utf8').split('\n')) {
  const m = regel.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt')
  process.exit(1)
}

const DEMO_ORG = '54b401d6-4f1c-41ad-8f1b-0def12c5b85d'
const DEMO_USER = '6ecd3e9c-8fc0-4ef9-888a-9a10fef04d97'
const DROOG = process.argv.includes('--dry-run')

const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function api(methode, pad, body, extra = {}) {
  if (DROOG && methode !== 'GET') {
    console.log(`   [droog] ${methode} ${pad}`)
    return []
  }
  const res = await fetch(`${URL}/rest/v1/${pad}`, {
    method: methode,
    headers: { ...HEAD, Prefer: 'return=representation', ...extra },
    body: body ? JSON.stringify(body) : undefined,
  })
  const tekst = await res.text()
  if (!res.ok) throw new Error(`${methode} ${pad} -> ${res.status} ${tekst.slice(0, 300)}`)
  return tekst ? JSON.parse(tekst) : []
}

const haal = (pad) => api('GET', pad)
const zet = (pad, body) => api('PATCH', pad, body)
const weg = (pad) => api('DELETE', pad)

/**
 * PostgREST weigert een bulk-insert waarvan de objecten niet dezelfde sleutels
 * hebben ("All object keys must match"), dus vullen we ontbrekende velden aan
 * met null in plaats van ze weg te laten.
 */
function maak(tabel, rijen) {
  const alleSleutels = [...new Set(rijen.flatMap(Object.keys))]
  const gelijk = rijen.map((rij) =>
    Object.fromEntries(alleSleutels.map((s) => [s, rij[s] ?? null]))
  )
  return api('POST', tabel, gelijk)
}

// ─── Datums ────────────────────────────────────────────────────────────────
// Eén anker, zodat de hele demo bij elke run meeschuift met vandaag.

const VANDAAG = new Date()
VANDAAG.setHours(12, 0, 0, 0)

function dag(offset) {
  const d = new Date(VANDAAG)
  d.setDate(d.getDate() + offset)
  return d
}
const datum = (offset) => dag(offset).toISOString().slice(0, 10)
const tijdstip = (offset, uur = 10) => {
  const d = dag(offset)
  d.setHours(uur, 0, 0, 0)
  return d.toISOString()
}
/** Eerstvolgende maandag vanaf vandaag, als anker voor de montageweek. */
function komendeMaandag() {
  const d = new Date(VANDAAG)
  const naarMaandag = (8 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + naarMaandag)
  return d
}
const MAANDAG = komendeMaandag()
const werkdag = (n) => {
  const d = new Date(MAANDAG)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const JAAR = VANDAAG.getFullYear()

// ─── Handtekening als PNG ──────────────────────────────────────────────────
// De werkbon toont klant_handtekening als afbeelding. Een echte krabbel maakt
// het verschil tussen "demo" en "dit is hoe het er bij mij uit gaat zien", dus
// die rasteren we hier zelf. Geen dependencies: zlib zit in Node.

function crc32(buf) {
  let c
  const tabel = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabel[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = tabel[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const lengte = Buffer.alloc(4)
  lengte.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([lengte, body, crc])
}

function handtekeningPng(paden, breedte = 560, hoogte = 190) {
  const px = Buffer.alloc(breedte * hoogte * 4, 0)

  const stip = (x, y, dekking) => {
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 0 || yi < 0 || xi >= breedte || yi >= hoogte) return
    const i = (yi * breedte + xi) * 4
    const a = Math.min(255, px[i + 3] + Math.round(255 * dekking))
    px[i] = 26
    px[i + 1] = 38
    px[i + 2] = 43
    px[i + 3] = a
  }

  // Ronde penpunt, zodat de lijn niet als getrapte pixels leest.
  const punt = (x, y, dikte) => {
    const straal = dikte / 2
    for (let dy = -Math.ceil(straal); dy <= Math.ceil(straal); dy++) {
      for (let dx = -Math.ceil(straal); dx <= Math.ceil(straal); dx++) {
        const afstand = Math.hypot(dx, dy)
        if (afstand > straal + 0.5) continue
        stip(x + dx, y + dy, Math.min(1, Math.max(0, straal + 0.5 - afstand)))
      }
    }
  }

  const bezier = (p, t) => {
    const u = 1 - t
    return [
      u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6],
      u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7],
    ]
  }

  for (const { segmenten, dikte } of paden) {
    for (const seg of segmenten) {
      for (let t = 0; t <= 1; t += 0.0015) {
        const [x, y] = bezier(seg, t)
        // De pen drukt in het midden van een haal iets zwaarder aan.
        punt(x, y, dikte * (0.75 + 0.35 * Math.sin(Math.PI * t)))
      }
    }
  }

  const rauw = Buffer.alloc((breedte * 4 + 1) * hoogte)
  for (let y = 0; y < hoogte; y++) {
    rauw[y * (breedte * 4 + 1)] = 0
    px.copy(rauw, y * (breedte * 4 + 1) + 1, y * breedte * 4, (y + 1) * breedte * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(breedte, 0)
  ihdr.writeUInt32BE(hoogte, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(rauw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
  return 'data:image/png;base64,' + png.toString('base64')
}

// Een echte handtekening is onregelmatig: pieken van ongelijke hoogte, een
// oplopende basislijn en een uithaal aan het eind. Een gelijkmatige golf leest
// als versiering, niet als een naam.
const HANDTEKENING_DIJKSTRA = handtekeningPng([
  { dikte: 5, segmenten: [
    [ 55, 152,  46,  92,  60,  54,  79,  60],  // opgaande haal van de kapitaal
    [ 79,  60,  98,  66,  83, 141, 101, 143],
    [101, 143, 118, 145, 107,  50, 129,  55],  // hoge tweede stok
    [129,  55, 152,  60, 133, 139, 154, 136],
    [154, 136, 178, 133, 161,  76, 188,  82],
    [188,  82, 212,  88, 191, 143, 216, 138],
    [216, 138, 246, 132, 227,  59, 260,  68],  // hoogste lus
    [260,  68, 290,  77, 265, 145, 298, 140],
    [298, 140, 325, 135, 307,  90, 336,  94],  // vlakkere lus
    [336,  94, 361,  98, 341, 137, 370, 133],
    [370, 133, 403, 128, 381,  64, 418,  73],
    [418,  73, 450,  81, 421, 139, 458, 132],
    [458, 132, 481, 127, 494, 103, 486,  86],  // uithaal omhoog
    [486,  86, 479,  71, 461,  76, 470,  93],
  ] },
  { dikte: 2.5, segmenten: [
    [ 62, 172, 190, 180, 330, 162, 476, 168],  // onderstreep, licht golvend
  ] },
])

// ─── Inkoopfactuur als PDF ─────────────────────────────────────────────────
// pdf_storage_path is NOT NULL en de app downloadt het bestand echt, dus een
// verzonnen pad levert een kapotte knop op. Daarom hier een klein maar geldig
// PDF'je, met de hand opgebouwd zodat er geen pakket bij hoeft.

function eenvoudigePdf(regels) {
  const esc = (s) => s.replace(/([\\()])/g, '\\$1')
  let inhoud = 'BT\n'
  let y = 780
  for (const regel of regels) {
    const grootte = regel.groot ? 16 : 10
    inhoud += `/F1 ${grootte} Tf\n1 0 0 1 60 ${y} Tm\n(${esc(regel.tekst)}) Tj\n`
    y -= regel.groot ? 30 : (regel.wit ? 26 : 15)
  }
  inhoud += 'ET'

  const objecten = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(inhoud)} >>\nstream\n${inhoud}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const posities = []
  objecten.forEach((obj, i) => {
    posities.push(Buffer.byteLength(pdf))
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objecten.length + 1}\n0000000000 65535 f \n`
  for (const p of posities) pdf += `${String(p).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objecten.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'binary')
}

async function uploadBestand(bucket, pad, buffer, type) {
  if (DROOG) { console.log(`   [droog] UPLOAD ${bucket}/${pad}`); return }
  const res = await fetch(`${URL}/storage/v1/object/${bucket}/${pad}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': type, 'x-upsert': 'true' },
    body: buffer,
  })
  if (!res.ok) throw new Error(`upload ${bucket}/${pad} -> ${res.status} ${(await res.text()).slice(0, 200)}`)
}

// ─── De gouden klus ────────────────────────────────────────────────────────
// Eén klus loopt in de demo compleet door: aanvraag, offerte met marge per
// regel, akkoord via het portaal, montageweek, werkbon met uren en foto's,
// factuur betaald. Dat is precies wat de mail belooft, dus dat moet kloppen.

function calcRegel(naam, aantal, eenheid, inkoop, verkoop, notitie = '') {
  return {
    id: `calc-demo-${naam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    aantal,
    eenheid,
    notitie,
    categorie: '',
    inkoop_prijs: inkoop,
    nacalculatie: false,
    product_naam: naam,
    verkoop_prijs: verkoop,
    btw_percentage: 21,
    marge_percentage: inkoop > 0 ? Math.round(((verkoop - inkoop) / inkoop) * 1000) / 10 : 0,
    korting_percentage: 0,
  }
}

const GEVELREGELS = [
  {
    beschrijving: 'Doosletters RVS geborsteld, letterhoogte 400 mm, 9 letters, LED-verlichting achterzijde',
    breedte_mm: 4200, hoogte_mm: 400,
    calc: [
      calcRegel('Doosletters RVS 400 mm', 9, 'stuks', 118, 215, 'Vandaglas, levertijd 12 werkdagen'),
    ],
  },
  {
    beschrijving: 'Lichtbak dubbelzijdig 1200 x 800 mm, opaal acryl, LED-module',
    breedte_mm: 1200, hoogte_mm: 800,
    calc: [
      calcRegel('Lichtbak dubbelzijdig', 1, 'stuks', 385, 795),
    ],
  },
  {
    beschrijving: 'Ontwerp, gevelaanzicht en drukproef',
    calc: [
      calcRegel('Tekenwerk Ilse', 3, 'uur', 50, 85),
    ],
  },
  {
    beschrijving: 'Montage buiten, twee monteurs',
    calc: [
      calcRegel('Montage buiten', 12, 'uur', 45, 75),
      calcRegel('Hoogwerker 16 m', 1, 'dagdeel', 240, 340, 'Boels, opgehaald ma-ochtend'),
    ],
  },
  {
    beschrijving: 'Bouwkundige voorbereiding, pluggen en waterdicht afwerken',
    calc: [
      calcRegel('Bevestigingsmateriaal', 1, 'post', 90, 280),
    ],
  },
  {
    beschrijving: 'Elektra: bekabeling naar meterkast en aansluiting',
    calc: [
      calcRegel('Bekabeling en aansluiting', 1, 'post', 165, 295),
    ],
  },
]

function regelTotaal(regel) {
  return regel.calc.reduce((som, c) => som + c.aantal * c.verkoop_prijs, 0)
}
function regelInkoop(regel) {
  return regel.calc.reduce((som, c) => som + c.aantal * c.inkoop_prijs, 0)
}

// ─── Uitvoering ────────────────────────────────────────────────────────────

async function main() {
  console.log(DROOG ? 'DROOGLOOP, er wordt niets geschreven\n' : 'Demo-omgeving verversen\n')

  const org = await haal(`organisaties?select=id,naam&id=eq.${DEMO_ORG}`)
  if (!org.length) throw new Error('Demo-organisatie niet gevonden')
  console.log(`Organisatie: ${org[0].naam}\n`)

  const klanten = await haal(`klanten?select=id,bedrijfsnaam,stad,adres,postcode&organisatie_id=eq.${DEMO_ORG}`)
  const klantOp = (naam) => klanten.find((k) => k.bedrijfsnaam.toLowerCase().includes(naam.toLowerCase()))
  const dijkstra = klantOp('Dijkstra')
  if (!dijkstra) throw new Error('Klant Autocentrum Dijkstra niet gevonden')

  const projecten = await haal(`projecten?select=id,naam,status,budget&organisatie_id=eq.${DEMO_ORG}`)
  const projectOp = (naam) => projecten.find((p) => p.naam.toLowerCase().includes(naam.toLowerCase()))

  const offertes = await haal(`offertes?select=id,nummer,titel,status,klant_id,project_id&organisatie_id=eq.${DEMO_ORG}`)
  // Zoek op klant plus onderwerp, niet op de exacte titel: deze run hernoemt
  // de offerte, dus een titelmatch zou de tweede keer niets meer vinden.
  const gevel = offertes.find((o) => o.klant_id === dijkstra.id && /gevelreclame|showroom/i.test(o.titel))
  if (!gevel) throw new Error('Offerte gevelreclame showroom Dijkstra niet gevonden')

  // ── 1. De vlaggenschip-offerte, met marge per regel ──────────────────────
  console.log('1. Offerte gevelreclame Dijkstra opnieuw opbouwen')

  await weg(`offerte_items?offerte_id=eq.${gevel.id}`)

  const items = GEVELREGELS.map((regel, i) => ({
    offerte_id: gevel.id,
    user_id: DEMO_USER,
    organisatie_id: DEMO_ORG,
    beschrijving: regel.beschrijving,
    aantal: 1,
    eenheidsprijs: regelTotaal(regel),
    totaal: regelTotaal(regel),
    btw_percentage: 21,
    korting_percentage: 0,
    volgorde: i + 1,
    soort: 'prijs',
    heeft_calculatie: true,
    calculatie_regels: regel.calc,
    detail_regels: [],
    breedte_mm: regel.breedte_mm ?? null,
    hoogte_mm: regel.hoogte_mm ?? null,
    foto_op_offerte: false,
    is_optioneel: false,
  }))
  await maak('offerte_items', items)

  const subtotaal = Math.round(GEVELREGELS.reduce((s, r) => s + regelTotaal(r), 0) * 100) / 100
  const inkoop = Math.round(GEVELREGELS.reduce((s, r) => s + regelInkoop(r), 0) * 100) / 100
  const btw = Math.round(subtotaal * 0.21 * 100) / 100
  const marge = Math.round(((subtotaal - inkoop) / subtotaal) * 1000) / 10

  // Token hergebruiken als hij er al is: een nieuw token bij elke run zou een
  // link die je ergens geplakt hebt elke nacht laten sterven.
  const bestaandToken = (await haal(`offertes?select=publiek_token&id=eq.${gevel.id}`))[0]?.publiek_token
  const token = bestaandToken || require('crypto').randomBytes(24).toString('hex')

  await zet(`offertes?id=eq.${gevel.id}`, {
    nummer: `OFF-${JAAR}-0142`,
    titel: 'Gevelreclame showroom Autocentrum Dijkstra',
    status: 'goedgekeurd',
    subtotaal,
    btw_bedrag: btw,
    totaal: Math.round((subtotaal + btw) * 100) / 100,
    intro_tekst: 'Zoals besproken op locatie. De doosletters komen op een aluminium montagerail, zodat de gevel intact blijft. Levertijd van de letters is twaalf werkdagen.',
    outro_tekst: 'Prijzen exclusief btw. Montage in overleg, wij regelen de hoogwerker.',
    geldigheid_dagen: 30,
    geldig_tot: datum(16),
    verloopdatum: datum(16),
    verstuurd_op: tijdstip(-14, 9),
    verstuurd_naar: 'inkoop@autocentrumdijkstra.nl',
    bekeken_door_klant: true,
    eerste_bekeken_op: tijdstip(-14, 17),
    laatst_bekeken_op: tijdstip(-12, 8),
    aantal_keer_bekeken: 4,
    publiek_token: token,
    publiek_token_verloopt_op: tijdstip(45, 12),
    publieke_link_geopend_op: tijdstip(-14, 17),
    publieke_link_views: 4,
    akkoord_op: tijdstip(-12, 9),
    geaccepteerd_door: 'M. Dijkstra',
    geaccepteerd_op: tijdstip(-12, 9),
    levertijd: '12 werkdagen na akkoord',
    betalingsconditie: '50% bij opdracht, restant binnen 14 dagen na oplevering',
  })

  console.log(`   ${GEVELREGELS.length} regels · subtotaal ${subtotaal} · inkoop ${inkoop} · marge ${marge}%`)
  console.log(`   portaal-token gezet, akkoord van M. Dijkstra op ${datum(-12)}`)

  // ── 2. Projecten: nummers, statussen en data ─────────────────────────────
  console.log('2. Projecten bijwerken')

  const projectPlan = [
    { zoek: 'Gevelreclame showroom', nummer: `${JAAR}-084`, status: 'actief', start: datum(-12), eind: werkdag(2), voortgang: 65 },
    { zoek: 'Raamdecoratie', nummer: `${JAAR}-086`, status: 'gepland', start: werkdag(7), eind: werkdag(9), voortgang: 10 },
    { zoek: 'Interieur signing', nummer: `${JAAR}-079`, status: 'gefactureerd', start: datum(-48), eind: datum(-31), voortgang: 100 },
    { zoek: 'Terras- en entree', nummer: `${JAAR}-087`, status: 'te-factureren', start: datum(-9), eind: datum(-2), voortgang: 100 },
    { zoek: 'Bouwborden', nummer: `${JAAR}-085`, status: 'ingepland', start: werkdag(1), eind: werkdag(3), voortgang: 30 },
    { zoek: 'Winkeldecoratie', nummer: `${JAAR}-081`, status: 'afgerond', start: datum(-38), eind: datum(-24), voortgang: 100 },
  ]

  for (const p of projectPlan) {
    const doel = projectOp(p.zoek)
    if (!doel) { console.log(`   overgeslagen, niet gevonden: ${p.zoek}`); continue }
    await zet(`projecten?id=eq.${doel.id}`, {
      project_nummer: p.nummer,
      status: p.status,
      start_datum: p.start,
      eind_datum: p.eind,
      voortgang: p.voortgang,
    })
  }
  console.log(`   ${projectPlan.length} projecten genummerd en op de kalender gezet`)

  // ── 3. De werkbon: uren, opmerking, handtekening ─────────────────────────
  console.log('3. Werkbon gevelmontage vullen')

  const werkbonnen = await haal(`werkbonnen?select=id,werkbon_nummer,project_id,status&organisatie_id=eq.${DEMO_ORG}&order=werkbon_nummer.asc`)
  const gevelProject = projectOp('Gevelreclame showroom')
  let bon = werkbonnen.find((w) => w.project_id === gevelProject?.id) || werkbonnen[0]

  if (bon) {
    await weg(`werkbon_items?werkbon_id=eq.${bon.id}`)
    await weg(`werkbon_regels?werkbon_id=eq.${bon.id}`)

    await zet(`werkbonnen?id=eq.${bon.id}`, {
      werkbon_nummer: `WB-${JAAR}-0134`,
      titel: 'Montage gevelreclame showroom',
      status: 'afgerond',
      datum: datum(-3),
      start_tijd: '07:30',
      eind_tijd: '14:00',
      pauze_minuten: 30,
      uren_gewerkt: 12,
      locatie_adres: dijkstra.adres || 'Industrieweg 12',
      locatie_postcode: dijkstra.postcode || '1704 AA',
      locatie_stad: dijkstra.stad || 'Heerhugowaard',
      contact_naam: 'Marco Dijkstra',
      contact_telefoon: '06 21 44 87 30',
      omschrijving: 'Doosletters en lichtbak gemonteerd, elektra aangesloten en getest.',
      monteur_opmerkingen: 'Gevel was zachter dan verwacht, twee extra chemische ankers gezet. Klant ter plekke akkoord op het meerwerk. Lichtbak brandt, timer staat op schemerschakelaar.',
      klant_handtekening: HANDTEKENING_DIJKSTRA,
      klant_naam_getekend: 'M. Dijkstra',
      getekend_op: tijdstip(-3, 14),
      kilometers: 34,
      km_tarief: 0.35,
      klant_id: dijkstra.id,
      project_id: gevelProject?.id ?? null,
      offerte_id: gevel.id,
    })

    await maak('werkbon_items', [
      { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, volgorde: 1,
        omschrijving: 'Doosletters RVS 400 mm op montagerail, 9 letters', afmeting_breedte_mm: 4200, afmeting_hoogte_mm: 400 },
      { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, volgorde: 2,
        omschrijving: 'Lichtbak dubbelzijdig aan gevelbeugel', afmeting_breedte_mm: 1200, afmeting_hoogte_mm: 800 },
      { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, volgorde: 3,
        omschrijving: 'Bekabeling naar meterkast, schemerschakelaar afgesteld',
        interne_notitie: 'Meerwerk: 2 chemische ankers, mondeling akkoord Marco Dijkstra' },
    ])

    await maak('werkbon_regels', [
      { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'arbeid',
        omschrijving: 'Montage buiten, Roel van der Berg', uren: 6, uurtarief: 75, totaal: 450, factureerbaar: true },
      { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'arbeid',
        omschrijving: 'Montage buiten, Bas Admiraal', uren: 6, uurtarief: 75, totaal: 450, factureerbaar: true },
      { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'materiaal',
        omschrijving: 'Chemisch anker M10 (meerwerk)', aantal: 2, eenheid: 'stuks', prijs_per_eenheid: 14.5, totaal: 29, factureerbaar: true },
      { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'overig',
        omschrijving: 'Hoogwerker 16 m, dagdeel', aantal: 1, eenheid: 'dagdeel', prijs_per_eenheid: 340, totaal: 340, factureerbaar: true },
    ])
    // Foto's uit de eigen fotobank van Sign Company. Een werkbon zonder beeld
    // leest als een formulier; met beeld leest hij als een afgeronde klus.
    const FOTOBANK = path.join(__dirname, '..', '..', 'public', 'images', 'fotos')
    const fotos = [
      { bestand: 'hoogwerker-aan-de-gevel.webp', type: 'voor', omschrijving: 'Doosletters gemonteerd, folie zit er nog op' },
      { bestand: 'kijken-of-het-staat.webp', type: 'na', omschrijving: 'Opgeleverd, lichtbak brandt' },
    ]

    await weg(`werkbon_fotos?werkbon_id=eq.${bon.id}`)
    const fotoRijen = []
    for (const foto of fotos) {
      const bron = path.join(FOTOBANK, foto.bestand)
      if (!fs.existsSync(bron)) { console.log(`   foto ontbreekt: ${foto.bestand}`); continue }
      const pad = `werkbon-fotos/${bon.id}/${foto.bestand}`
      await uploadBestand('documenten-prive', pad, fs.readFileSync(bron), 'image/webp')
      fotoRijen.push({
        werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG,
        type: foto.type, url: pad, omschrijving: foto.omschrijving,
      })
    }
    if (fotoRijen.length) await maak('werkbon_fotos', fotoRijen)

    console.log(`   ${bon.werkbon_nummer} -> WB-${JAAR}-0134, 12 uur, getekend door M. Dijkstra, ${fotoRijen.length} foto's`)
  }

  // De overige bonnen hernummeren en een titel geven: nummers uit een vorig
  // jaar naast een verse bon verraden dat de demo stilstaat.
  const overigeBonnen = [
    { nummer: `WB-${JAAR}-0135`, titel: 'Bouwborden plaatsen, vier locaties', status: 'concept', dag: 1 },
    { nummer: `WB-${JAAR}-0136`, titel: 'Raamfolie vestiging Purmerend', status: 'concept', dag: 3 },
    { nummer: `WB-${JAAR}-0131`, titel: 'Interieur signing sportschool', status: 'afgerond', dag: -18 },
  ]
  // Er ligt een unieke sleutel op (organisatie_id, werkbon_nummer), en bij het
  // herverdelen kunnen twee bonnen elkaars nummer willen. Daarom eerst alles
  // naar een tijdelijk nummer en pas daarna naar het echte.
  const overigeRest = werkbonnen.filter((w) => w.id !== bon?.id).sort((a, b) => a.id.localeCompare(b.id))
  for (const [i, w] of overigeRest.entries()) {
    await zet(`werkbonnen?id=eq.${w.id}`, { werkbon_nummer: `WB-TMP-${i}` })
  }
  for (const [i, w] of overigeRest.entries()) {
    const p = overigeBonnen[i % overigeBonnen.length]
    await zet(`werkbonnen?id=eq.${w.id}`, {
      werkbon_nummer: p.nummer,
      titel: p.titel,
      status: p.status,
      datum: p.dag > 0 ? werkdag(p.dag) : datum(p.dag),
    })
  }

  // ── 3b. Het klantportaal ─────────────────────────────────────────────────
  // De offertekaart in het demo-portaal stond los van de offerte, dus er zat
  // geen link en geen PDF-knop op. Zonder die koppeling kan portaal-get geen
  // publiek token meegeven en toont de kaart alleen een titel.
  console.log('3b. Offertekaart in het klantportaal koppelen')

  const portaalItems = await haal(`portaal_items?select=id,type,titel,offerte_id&organisatie_id=eq.${DEMO_ORG}&type=eq.offerte`)
  for (const item of portaalItems) {
    await zet(`portaal_items?id=eq.${item.id}`, {
      offerte_id: gevel.id,
      titel: `Offerte OFF-${JAAR}-0142 · gevelreclame showroom`,
    })
  }
  const portalen = await haal(`project_portalen?select=id,token&organisatie_id=eq.${DEMO_ORG}`)
  console.log(`   ${portaalItems.length} offertekaart(en) gekoppeld`)
  if (portalen[0]?.token) console.log(`   portaal: /portaal/${portalen[0].token}`)

  // ── 4. Montageweek ───────────────────────────────────────────────────────
  console.log('4. Montageweek op de planning zetten')

  const afspraken = await haal(`montage_afspraken?select=id,titel&organisatie_id=eq.${DEMO_ORG}&order=datum.asc`)
  const weekPlan = [
    { datum: werkdag(0), start: '07:30', eind: '12:00', status: 'gepland' },
    { datum: werkdag(1), start: '08:00', eind: '16:00', status: 'gepland' },
    { datum: werkdag(2), start: '07:30', eind: '14:00', status: 'gepland' },
    { datum: datum(-3), start: '07:30', eind: '14:00', status: 'afgerond' },
    { datum: datum(-10), start: '09:00', eind: '15:30', status: 'afgerond' },
  ]
  for (const [i, a] of afspraken.entries()) {
    const plan = weekPlan[i % weekPlan.length]
    await zet(`montage_afspraken?id=eq.${a.id}`, {
      datum: plan.datum, start_tijd: plan.start, eind_tijd: plan.eind, status: plan.status,
    })
  }
  console.log(`   ${afspraken.length} afspraken verdeeld over de week van ${werkdag(0)}`)

  // ── 5. Facturen ──────────────────────────────────────────────────────────
  console.log('5. Facturen bijwerken')

  const facturen = await haal(`facturen?select=id,nummer,titel,status,totaal&organisatie_id=eq.${DEMO_ORG}&order=nummer.asc`)
  const factuurPlan = [
    { status: 'betaald',   factuurdatum: datum(-31), vervaldatum: datum(-17), betaaldatum: datum(-19) },
    { status: 'betaald',   factuurdatum: datum(-12), vervaldatum: datum(2),   betaaldatum: datum(-5) },
    { status: 'verzonden', factuurdatum: datum(-9),  vervaldatum: datum(5),   betaaldatum: null },
    { status: 'open',      factuurdatum: datum(-24), vervaldatum: datum(-10), betaaldatum: null },
    { status: 'concept',   factuurdatum: datum(0),   vervaldatum: datum(14),  betaaldatum: null },
  ]
  for (const [i, f] of facturen.entries()) {
    const plan = factuurPlan[i % factuurPlan.length]
    await zet(`facturen?id=eq.${f.id}`, {
      ...plan,
      betaald_bedrag: plan.status === 'betaald' ? f.totaal : 0,
      betaaltermijn_dagen: 14,
    })
  }
  console.log(`   ${facturen.length} facturen, waarvan één te laat en één betaald`)

  // ── 6. Inkoopfactuur die Daan heeft uitgelezen ───────────────────────────
  console.log('6. Inkoopfactuur toevoegen')

  const pdfPad = `${DEMO_ORG}/vandaglas-441882.pdf`
  await uploadBestand('inkoopfacturen', pdfPad, eenvoudigePdf([
    { tekst: 'Vandaglas Reclame BV', groot: true },
    { tekst: 'Ambachtsweg 44, 1817 MP Alkmaar   KvK 37094412   BTW NL8102.44.771.B01', wit: true },
    { tekst: 'Factuur 2026-441882' },
    { tekst: `Factuurdatum ${datum(-8)}      Vervaldatum ${datum(22)}`, wit: true },
    { tekst: 'Aan: Signmakers Demo BV, Heerhugowaard', wit: true },
    { tekst: 'Omschrijving                                    Aantal   Prijs      Totaal' },
    { tekst: 'Doosletters RVS 304 geborsteld, h 400 mm             9   118,00    1.062,00' },
    { tekst: 'Referentie: showroom Autocentrum Dijkstra', wit: true },
    { tekst: 'Subtotaal                                                      1.062,00' },
    { tekst: 'BTW 21%                                                          223,02' },
    { tekst: 'Te voldoen                                                     1.285,02' },
    { tekst: 'Betaling binnen 30 dagen op NL21 RABO 0123 4567 89', wit: true },
  ]), 'application/pdf')
  console.log('   PDF geplaatst in de bucket inkoopfacturen')

  const bestaand = await haal(`inkoopfacturen?select=id&organisatie_id=eq.${DEMO_ORG}&factuur_nummer=eq.2026-441882`)
  if (!bestaand.length) {
    await maak('inkoopfacturen', [{
      organisatie_id: DEMO_ORG,
      pdf_storage_path: pdfPad,
      leverancier_naam: 'Vandaglas Reclame BV',
      factuur_nummer: '2026-441882',
      factuur_datum: datum(-8),
      vervaldatum: datum(22),
      subtotaal: 1062,
      btw_bedrag: 223.02,
      totaal: 1285.02,
      valuta: 'EUR',
      status: 'goedgekeurd',
      email_subject: 'Factuur 2026-441882 doosletters RVS',
      email_van: 'facturen@vandaglas.nl',
      email_ontvangen_op: tijdstip(-8, 7),
      extractie_vertrouwen: 'hoog',
      project_id: gevelProject?.id ?? null,
      goedgekeurd_op: tijdstip(-8, 9),
    }])
    console.log('   Vandaglas 1285,02 gekoppeld aan het gevelproject')
  } else {
    await zet(`inkoopfacturen?id=eq.${bestaand[0].id}`, {
      factuur_datum: datum(-8), vervaldatum: datum(22), email_ontvangen_op: tijdstip(-8, 7), goedgekeurd_op: tijdstip(-8, 9), pdf_storage_path: pdfPad,
    })
    console.log('   bestaande inkoopfactuur bijgewerkt')
  }

  // ── 7. Taken op de kalender ──────────────────────────────────────────────
  console.log('7. Taken verversen')
  const taken = await haal(`taken?select=id,titel,status&organisatie_id=eq.${DEMO_ORG}&order=created_at.asc`)
  for (const [i, t] of taken.entries()) {
    await zet(`taken?id=eq.${t.id}`, { deadline: datum(-4 + (i % 12)) })
  }
  console.log(`   ${taken.length} taken herverdeeld rond vandaag`)

  console.log('\nKlaar.')
  console.log(`Portaal-link voor de offerte: /portaal/offerte/${token}`)
  console.log('(controleer het exacte pad in de app voordat je hem in een mail zet)')
}

main().catch((e) => {
  console.error('\nMislukt:', e.message)
  process.exit(1)
})
