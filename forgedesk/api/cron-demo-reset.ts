/**
 * Zet de openbare demo-omgeving elke nacht terug naar de beginstand en schuift
 * alle datums mee met vandaag.
 *
 * De demo is voor iedereen toegankelijk via /demo en iedereen deelt dezelfde
 * organisatie. Zonder deze reset staat hij binnen een week vol met wat
 * bezoekers hebben aangeklikt, en zijn de datums oud.
 *
 * BEVEILIGD: vereist Authorization: Bearer ${CRON_SECRET} header.
 * Vercel Cron stuurt die automatisch mee op basis van vercel.json.
 *
 * Dit is de serverloze tweeling van scripts/demo-data.cjs. Dat script doet
 * daarnaast de eenmalige uploads (foto's, PDF) die hier niet kunnen, omdat de
 * bestanden niet in de functiebundel zitten. De opgeslagen paden blijven staan,
 * dus de reset hoeft alleen de rijen te herstellen.
 *
 * Handmatig draaien:
 * curl -H "Authorization: Bearer $CRON_SECRET" https://app.doen.team/api/cron-demo-reset
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const DEMO_ORG = '54b401d6-4f1c-41ad-8f1b-0def12c5b85d'
const DEMO_USER = '6ecd3e9c-8fc0-4ef9-888a-9a10fef04d97'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export const config = { maxDuration: 60 }

// ─── Datums ────────────────────────────────────────────────────────────────

function maakKalender() {
  const vandaag = new Date()
  vandaag.setHours(12, 0, 0, 0)
  const dag = (offset: number) => {
    const d = new Date(vandaag)
    d.setDate(d.getDate() + offset)
    return d
  }
  const maandag = new Date(vandaag)
  maandag.setDate(maandag.getDate() + ((8 - maandag.getDay()) % 7 || 7))
  return {
    jaar: vandaag.getFullYear(),
    datum: (offset: number) => dag(offset).toISOString().slice(0, 10),
    tijdstip: (offset: number, uur = 10) => {
      const d = dag(offset)
      d.setHours(uur, 0, 0, 0)
      return d.toISOString()
    },
    werkdag: (n: number) => {
      const d = new Date(maandag)
      d.setDate(d.getDate() + n)
      return d.toISOString().slice(0, 10)
    },
  }
}

// ─── De offerteregels van de gouden klus ───────────────────────────────────
// Zelfde inhoud als scripts/demo-data.cjs. Bewust gedupliceerd: api/-bestanden
// mogen niets uit de repo importeren omdat Vercel ze los bundelt.

function calc(naam: string, aantal: number, eenheid: string, inkoop: number, verkoop: number, notitie = '') {
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
    calc: [calc('Doosletters RVS 400 mm', 9, 'stuks', 118, 215, 'Vandaglas, levertijd 12 werkdagen')],
  },
  {
    beschrijving: 'Lichtbak dubbelzijdig 1200 x 800 mm, opaal acryl, LED-module',
    breedte_mm: 1200, hoogte_mm: 800,
    calc: [calc('Lichtbak dubbelzijdig', 1, 'stuks', 385, 795)],
  },
  {
    beschrijving: 'Ontwerp, gevelaanzicht en drukproef',
    breedte_mm: null, hoogte_mm: null,
    calc: [calc('Tekenwerk Ilse', 3, 'uur', 50, 85)],
  },
  {
    beschrijving: 'Montage buiten, twee monteurs',
    breedte_mm: null, hoogte_mm: null,
    calc: [
      calc('Montage buiten', 12, 'uur', 45, 75),
      calc('Hoogwerker 16 m', 1, 'dagdeel', 240, 340, 'Boels, opgehaald ma-ochtend'),
    ],
  },
  {
    beschrijving: 'Bouwkundige voorbereiding, pluggen en waterdicht afwerken',
    breedte_mm: null, hoogte_mm: null,
    calc: [calc('Bevestigingsmateriaal', 1, 'post', 90, 280)],
  },
  {
    beschrijving: 'Elektra: bekabeling naar meterkast en aansluiting',
    breedte_mm: null, hoogte_mm: null,
    calc: [calc('Bekabeling en aansluiting', 1, 'post', 165, 295)],
  },
]

const regelTotaal = (r: typeof GEVELREGELS[number]) =>
  r.calc.reduce((som, c) => som + c.aantal * c.verkoop_prijs, 0)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const k = maakKalender()
  const gedaan: string[] = []

  try {
    // ── Offerte ────────────────────────────────────────────────────────────
    const { data: klanten } = await supabaseAdmin
      .from('klanten').select('id, bedrijfsnaam, adres, postcode, stad').eq('organisatie_id', DEMO_ORG)
    const dijkstra = (klanten || []).find((kl) => /dijkstra/i.test(kl.bedrijfsnaam as string))

    const { data: projecten } = await supabaseAdmin
      .from('projecten').select('id, naam').eq('organisatie_id', DEMO_ORG)
    const projectOp = (naam: string) =>
      (projecten || []).find((p) => (p.naam as string).toLowerCase().includes(naam.toLowerCase()))
    const gevelProject = projectOp('Gevelreclame showroom')

    const { data: offertes } = await supabaseAdmin
      .from('offertes').select('id, titel, klant_id, publiek_token').eq('organisatie_id', DEMO_ORG)
    const gevel = (offertes || []).find(
      (o) => o.klant_id === dijkstra?.id && /gevelreclame|showroom/i.test(o.titel as string)
    )

    if (gevel) {
      await supabaseAdmin.from('offerte_items').delete().eq('offerte_id', gevel.id)
      await supabaseAdmin.from('offerte_items').insert(
        GEVELREGELS.map((regel, i) => ({
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
          breedte_mm: regel.breedte_mm,
          hoogte_mm: regel.hoogte_mm,
          foto_op_offerte: false,
          is_optioneel: false,
        }))
      )

      const subtotaal = Math.round(GEVELREGELS.reduce((s, r) => s + regelTotaal(r), 0) * 100) / 100
      const btw = Math.round(subtotaal * 0.21 * 100) / 100

      await supabaseAdmin.from('offertes').update({
        nummer: `OFF-${k.jaar}-0142`,
        titel: 'Gevelreclame showroom Autocentrum Dijkstra',
        status: 'goedgekeurd',
        subtotaal,
        btw_bedrag: btw,
        totaal: Math.round((subtotaal + btw) * 100) / 100,
        geldig_tot: k.datum(16),
        verloopdatum: k.datum(16),
        verstuurd_op: k.tijdstip(-14, 9),
        bekeken_door_klant: true,
        eerste_bekeken_op: k.tijdstip(-14, 17),
        laatst_bekeken_op: k.tijdstip(-12, 8),
        aantal_keer_bekeken: 4,
        // Token blijft staan: een nieuw token zou elke gedeelde link breken.
        publiek_token_verloopt_op: k.tijdstip(45, 12),
        publieke_link_geopend_op: k.tijdstip(-14, 17),
        publieke_link_views: 4,
        akkoord_op: k.tijdstip(-12, 9),
        geaccepteerd_door: 'M. Dijkstra',
        geaccepteerd_op: k.tijdstip(-12, 9),
      }).eq('id', gevel.id)

      gedaan.push('offerte')
    }

    // ── Projecten ──────────────────────────────────────────────────────────
    const projectPlan = [
      { zoek: 'Gevelreclame showroom', nummer: `${k.jaar}-084`, status: 'actief', start: k.datum(-12), eind: k.werkdag(2), voortgang: 65 },
      { zoek: 'Raamdecoratie', nummer: `${k.jaar}-086`, status: 'gepland', start: k.werkdag(7), eind: k.werkdag(9), voortgang: 10 },
      { zoek: 'Interieur signing', nummer: `${k.jaar}-079`, status: 'gefactureerd', start: k.datum(-48), eind: k.datum(-31), voortgang: 100 },
      { zoek: 'Terras- en entree', nummer: `${k.jaar}-087`, status: 'te-factureren', start: k.datum(-9), eind: k.datum(-2), voortgang: 100 },
      { zoek: 'Bouwborden', nummer: `${k.jaar}-085`, status: 'ingepland', start: k.werkdag(1), eind: k.werkdag(3), voortgang: 30 },
      { zoek: 'Winkeldecoratie', nummer: `${k.jaar}-081`, status: 'afgerond', start: k.datum(-38), eind: k.datum(-24), voortgang: 100 },
    ]
    for (const p of projectPlan) {
      const doel = projectOp(p.zoek)
      if (!doel) continue
      await supabaseAdmin.from('projecten').update({
        project_nummer: p.nummer, status: p.status,
        start_datum: p.start, eind_datum: p.eind, voortgang: p.voortgang,
      }).eq('id', doel.id)
    }
    gedaan.push('projecten')

    // ── Werkbonnen ─────────────────────────────────────────────────────────
    const { data: werkbonnen } = await supabaseAdmin
      .from('werkbonnen').select('id, werkbon_nummer, project_id').eq('organisatie_id', DEMO_ORG)
      .order('werkbon_nummer', { ascending: true })

    const bon = (werkbonnen || []).find((w) => w.project_id === gevelProject?.id) || (werkbonnen || [])[0]

    if (bon) {
      await supabaseAdmin.from('werkbon_items').delete().eq('werkbon_id', bon.id)
      await supabaseAdmin.from('werkbon_regels').delete().eq('werkbon_id', bon.id)

      await supabaseAdmin.from('werkbonnen').update({
        werkbon_nummer: `WB-${k.jaar}-0134`,
        titel: 'Montage gevelreclame showroom',
        status: 'afgerond',
        datum: k.datum(-3),
        start_tijd: '07:30',
        eind_tijd: '14:00',
        pauze_minuten: 30,
        uren_gewerkt: 12,
        contact_naam: 'Marco Dijkstra',
        contact_telefoon: '06 21 44 87 30',
        omschrijving: 'Doosletters en lichtbak gemonteerd, elektra aangesloten en getest.',
        monteur_opmerkingen: 'Gevel was zachter dan verwacht, twee extra chemische ankers gezet. Klant ter plekke akkoord op het meerwerk. Lichtbak brandt, timer staat op schemerschakelaar.',
        klant_naam_getekend: 'M. Dijkstra',
        getekend_op: k.tijdstip(-3, 14),
        kilometers: 34,
        km_tarief: 0.35,
      }).eq('id', bon.id)

      await supabaseAdmin.from('werkbon_items').insert([
        { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, volgorde: 1, omschrijving: 'Doosletters RVS 400 mm op montagerail, 9 letters', afmeting_breedte_mm: 4200, afmeting_hoogte_mm: 400, interne_notitie: null },
        { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, volgorde: 2, omschrijving: 'Lichtbak dubbelzijdig aan gevelbeugel', afmeting_breedte_mm: 1200, afmeting_hoogte_mm: 800, interne_notitie: null },
        { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, volgorde: 3, omschrijving: 'Bekabeling naar meterkast, schemerschakelaar afgesteld', afmeting_breedte_mm: null, afmeting_hoogte_mm: null, interne_notitie: 'Meerwerk: 2 chemische ankers, mondeling akkoord Marco Dijkstra' },
      ])

      await supabaseAdmin.from('werkbon_regels').insert([
        { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'arbeid', omschrijving: 'Montage buiten, Roel van der Berg', uren: 6, uurtarief: 75, aantal: null, eenheid: null, prijs_per_eenheid: null, totaal: 450, factureerbaar: true },
        { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'arbeid', omschrijving: 'Montage buiten, Bas Admiraal', uren: 6, uurtarief: 75, aantal: null, eenheid: null, prijs_per_eenheid: null, totaal: 450, factureerbaar: true },
        { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'materiaal', omschrijving: 'Chemisch anker M10 (meerwerk)', uren: null, uurtarief: null, aantal: 2, eenheid: 'stuks', prijs_per_eenheid: 14.5, totaal: 29, factureerbaar: true },
        { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'overig', omschrijving: 'Hoogwerker 16 m, dagdeel', uren: null, uurtarief: null, aantal: 1, eenheid: 'dagdeel', prijs_per_eenheid: 340, totaal: 340, factureerbaar: true },
      ])

      // De foto's zelf staan al in storage. Alleen de rijen kunnen weg zijn.
      const { data: fotos } = await supabaseAdmin
        .from('werkbon_fotos').select('id').eq('werkbon_id', bon.id)
      if (!fotos || fotos.length === 0) {
        await supabaseAdmin.from('werkbon_fotos').insert([
          { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'voor', url: `werkbon-fotos/${bon.id}/hoogwerker-aan-de-gevel.webp`, omschrijving: 'Doosletters gemonteerd, folie zit er nog op' },
          { werkbon_id: bon.id, user_id: DEMO_USER, organisatie_id: DEMO_ORG, type: 'na', url: `werkbon-fotos/${bon.id}/kijken-of-het-staat.webp`, omschrijving: 'Opgeleverd, lichtbak brandt' },
        ])
      }

      const overige = [
        { nummer: `WB-${k.jaar}-0135`, titel: 'Bouwborden plaatsen, vier locaties', status: 'concept', datum: k.werkdag(1) },
        { nummer: `WB-${k.jaar}-0136`, titel: 'Raamfolie vestiging Purmerend', status: 'concept', datum: k.werkdag(3) },
        { nummer: `WB-${k.jaar}-0131`, titel: 'Interieur signing sportschool', status: 'afgerond', datum: k.datum(-18) },
      ]
      // Unieke sleutel op (organisatie_id, werkbon_nummer): bij herverdelen
      // kunnen twee bonnen elkaars nummer willen, dus eerst een tijdelijk
      // nummer. Sorteren op id houdt de toewijzing tussen runs gelijk.
      const rest = (werkbonnen || [])
        .filter((w) => w.id !== bon.id)
        .sort((a, b) => (a.id as string).localeCompare(b.id as string))
      for (let i = 0; i < rest.length; i++) {
        await supabaseAdmin.from('werkbonnen').update({ werkbon_nummer: `WB-TMP-${i}` }).eq('id', rest[i].id)
      }
      for (let i = 0; i < rest.length; i++) {
        await supabaseAdmin.from('werkbonnen').update(overige[i % overige.length]).eq('id', rest[i].id)
      }
      gedaan.push('werkbonnen')
    }

    // ── Klantportaal ───────────────────────────────────────────────────────
    // Zonder offerte_id kan portaal-get geen publiek token meegeven en toont
    // de offertekaart geen link en geen PDF-knop.
    if (gevel) {
      await supabaseAdmin.from('portaal_items').update({
        offerte_id: gevel.id,
        titel: `Offerte OFF-${k.jaar}-0142 · gevelreclame showroom`,
      }).eq('organisatie_id', DEMO_ORG).eq('type', 'offerte')
      gedaan.push('portaal')
    }

    // ── Montageweek ────────────────────────────────────────────────────────
    const { data: afspraken } = await supabaseAdmin
      .from('montage_afspraken').select('id').eq('organisatie_id', DEMO_ORG).order('datum', { ascending: true })
    const weekPlan = [
      { datum: k.werkdag(0), start_tijd: '07:30', eind_tijd: '12:00', status: 'gepland' },
      { datum: k.werkdag(1), start_tijd: '08:00', eind_tijd: '16:00', status: 'gepland' },
      { datum: k.werkdag(2), start_tijd: '07:30', eind_tijd: '14:00', status: 'gepland' },
      { datum: k.datum(-3), start_tijd: '07:30', eind_tijd: '14:00', status: 'afgerond' },
      { datum: k.datum(-10), start_tijd: '09:00', eind_tijd: '15:30', status: 'afgerond' },
    ]
    for (let i = 0; i < (afspraken || []).length; i++) {
      await supabaseAdmin.from('montage_afspraken').update(weekPlan[i % weekPlan.length]).eq('id', afspraken![i].id)
    }
    gedaan.push('montage')

    // ── Facturen ───────────────────────────────────────────────────────────
    const { data: facturen } = await supabaseAdmin
      .from('facturen').select('id, totaal').eq('organisatie_id', DEMO_ORG).order('nummer', { ascending: true })
    const factuurPlan = [
      { status: 'betaald',   factuurdatum: k.datum(-31), vervaldatum: k.datum(-17), betaaldatum: k.datum(-19) },
      { status: 'betaald',   factuurdatum: k.datum(-12), vervaldatum: k.datum(2),   betaaldatum: k.datum(-5) },
      { status: 'verzonden', factuurdatum: k.datum(-9),  vervaldatum: k.datum(5),   betaaldatum: null },
      { status: 'open',      factuurdatum: k.datum(-24), vervaldatum: k.datum(-10), betaaldatum: null },
      { status: 'concept',   factuurdatum: k.datum(0),   vervaldatum: k.datum(14),  betaaldatum: null },
    ]
    for (let i = 0; i < (facturen || []).length; i++) {
      const plan = factuurPlan[i % factuurPlan.length]
      await supabaseAdmin.from('facturen').update({
        ...plan,
        betaald_bedrag: plan.status === 'betaald' ? facturen![i].totaal : 0,
        betaaltermijn_dagen: 14,
      }).eq('id', facturen![i].id)
    }
    gedaan.push('facturen')

    // ── Inkoopfactuur en taken ─────────────────────────────────────────────
    await supabaseAdmin.from('inkoopfacturen').update({
      factuur_datum: k.datum(-8),
      vervaldatum: k.datum(22),
      email_ontvangen_op: k.tijdstip(-8, 7),
      goedgekeurd_op: k.tijdstip(-8, 9),
      status: 'goedgekeurd',
    }).eq('organisatie_id', DEMO_ORG)

    const { data: taken } = await supabaseAdmin
      .from('taken').select('id').eq('organisatie_id', DEMO_ORG).order('created_at', { ascending: true })
    for (let i = 0; i < (taken || []).length; i++) {
      await supabaseAdmin.from('taken').update({ deadline: k.datum(-4 + (i % 12)) }).eq('id', taken![i].id)
    }
    gedaan.push('inkoop en taken')

    return res.status(200).json({ success: true, hersteld: gedaan })
  } catch (fout) {
    console.error('[cron-demo-reset] mislukt:', fout)
    return res.status(500).json({ error: 'Demo-reset mislukt', hersteld: gedaan })
  }
}
