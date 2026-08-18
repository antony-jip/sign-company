import type { Factuur, Klant, OfferteItem } from '@/types'
import {
  getFactuur,
  getFactuurItems,
  markeerFactuurVerzonden,
  bepaalHerinneringOntvanger,
  generateFactuurNummer,
  updateFactuurWithNummerRetry,
} from './factuurService'
import { getKlant } from './klantService'
import { factuurVerzendTemplate } from './emailTemplateService'
import { genereerEnUploadFactuurPdf, downloadFactuurPdfFromStorage } from './factuurPdfService'
import { generateFactuurPDF } from './pdfService'
import { sendEmail } from './gmailService'
import supabase from './supabaseClient'
import { formatDate } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import { logger } from '@/utils/logger'

// Gedeelde keten voor "factuur de deur uit": verwerken (nummer + status open),
// PDF, naar Exact syncen en mailen naar de klant. Gebruikt door de
// bulkverwerking in de Te verzenden-tab, de rij-actie in de lijst en de
// direct-verzenden-knop in de editor, zodat alle paden dezelfde mail (mét
// PDF-bijlage) en dezelfde volgorde hanteren: sync vóór verzenden, zodat
// Exact dezelfde PDF krijgt als de klant.

export type FactuurKetenStap = 'verwerken' | 'pdf' | 'exact' | 'verzenden'

const STAP_LABEL: Record<FactuurKetenStap, string> = {
  verwerken: 'Verwerken',
  pdf: 'PDF',
  exact: 'Exact-sync',
  verzenden: 'Verzenden',
}

export class FactuurKetenFout extends Error {
  constructor(public stap: FactuurKetenStap, message: string) {
    super(message)
    this.name = 'FactuurKetenFout'
  }

  get gebruikersmelding(): string {
    return `${STAP_LABEL[this.stap]}: ${this.message}`
  }
}

export type FactuurVerzendStijl = {
  bedrijfsProfiel: Parameters<typeof generateFactuurPDF>[3]
  documentStyle?: Parameters<typeof generateFactuurPDF>[4]
  bedrijfsnaam: string
  primaireKleur: string
  emailHandtekening?: string
  logoUrl?: string
}

export type FactuurKetenResultaat = {
  factuur: Factuur
  ontvanger: string
  exactGesynct: boolean
  exactWaarschuwing?: string
  // Mail is verstuurd maar de status-update naar de database faalde; niet
  // nogmaals versturen.
  statusWaarschuwing?: string
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token ?? null
}

// De org-vlag exact_online_connected gaat nooit meer omlaag na een eerste
// koppeling; de echte staat zit in exact_tokens. null = status onbekend
// (netwerkfout), de caller beslist dan zelf op basis van de org-vlag.
export async function heeftExactTokens(): Promise<boolean | null> {
  try {
    const token = await getAccessToken()
    if (!token) return null
    const res = await fetch('/api/exact-token-status', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { heeftTokens?: boolean }
    return data.heeftTokens === true
  } catch {
    return null
  }
}

async function syncFactuurNaarExact(factuurId: string): Promise<{
  exactEntryId: string
  documentId: string | null
  bijlageSynced: boolean
  alGesynct: boolean
  waarschuwing?: string
}> {
  const token = await getAccessToken()
  if (!token) throw new FactuurKetenFout('exact', 'Niet ingelogd')

  const res = await fetch('/api/exact-sync-factuur', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ factuur_id: factuurId }),
  })
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string }
    throw new FactuurKetenFout('exact', errData.error || `Synchronisatie mislukt (${res.status})`)
  }
  const data = (await res.json()) as {
    exact_entry_id: string
    document_id: string | null
    bijlage_synced: boolean
    al_gesynct?: boolean
    waarschuwing?: string
  }
  return {
    exactEntryId: data.exact_entry_id,
    documentId: data.document_id,
    bijlageSynced: data.bijlage_synced,
    alGesynct: data.al_gesynct === true,
    waarschuwing: data.waarschuwing,
  }
}

function blobNaarBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

// Voorschot- en eindafrekeningsfacturen worden zonder factuur_items-rijen
// aangemaakt (alleen totalen op de kop); voor de PDF reconstrueren we dan één
// regel die het btw-bedrag op de cent exact reproduceert. Zelfde logica als
// btwRegelsUitTotalen in FacturenLayout/FactuurEditor: een te grof afgerond
// percentage zou het factuurbedrag stil veranderen, en een mengvorm mag niet
// per ongeluk als zuiver tarief ogen.
function regelsUitTotalen(beschrijving: string, subtotaal: number, btwBedrag: number): OfferteItem[] {
  const netto = round2(subtotaal)
  let btwPercentage = 21
  let eenheidsprijs = netto

  if (netto !== 0) {
    const absNetto = Math.abs(netto)
    const absBtw = Math.abs(round2(btwBedrag))
    const zuiver = [21, 9, 0].find((tarief) => Math.abs(absBtw - round2((absNetto * tarief) / 100)) <= 0.02)
    if (zuiver !== undefined) {
      btwPercentage = zuiver
    } else {
      const ruwPct = (absBtw / absNetto) * 100
      btwPercentage = round2(ruwPct)
      for (const decimalen of [2, 3, 4, 5, 6]) {
        const kandidaat = Number(ruwPct.toFixed(decimalen))
        btwPercentage = kandidaat
        const reconstrueert = Math.abs(round2((absNetto * kandidaat) / 100) - absBtw) < 0.005
        const botstMetZuiver = kandidaat === 21 || kandidaat === 9 || kandidaat === 0
        if (reconstrueert && !botstMetZuiver) break
      }
    }
  } else {
    eenheidsprijs = 0
  }

  return [{
    id: '',
    offerte_id: '',
    beschrijving,
    aantal: 1,
    eenheidsprijs,
    btw_percentage: btwPercentage,
    korting_percentage: 0,
    totaal: eenheidsprijs,
    volgorde: 1,
    detail_regels: [],
    created_at: new Date().toISOString(),
  }]
}

// Claim vóór de mail: zet verzonden_op alleen als die nog leeg is. Twee
// gelijktijdige runs (twee tabbladen, bulk + rij-actie, een verouderde lijst)
// kunnen zo nooit allebei dezelfde factuur mailen — de verliezer strandt hier,
// vóór sendEmail. Kolom ontbreekt (migratie 210 niet gedraaid) of lokale
// modus: dan zonder claim door, zoals markeerFactuurVerzonden ook terugvalt.
async function claimVerzending(factuurId: string): Promise<{ geclaimd: boolean; claimTijd: string | null }> {
  if (!supabase) return { geclaimd: true, claimTijd: null }
  const claimTijd = new Date().toISOString()
  const { data, error } = await supabase
    .from('facturen')
    .update({ verzonden_op: claimTijd })
    .eq('id', factuurId)
    .is('verzonden_op', null)
    .select('id')
  if (error) {
    if (error.message?.includes('verzonden_op')) {
      return { geclaimd: true, claimTijd: null }
    }
    throw new FactuurKetenFout('verzenden', error.message)
  }
  if (!data || data.length === 0) {
    throw new FactuurKetenFout('verzenden', 'Deze factuur is zojuist al (door een collega) verzonden')
  }
  return { geclaimd: true, claimTijd }
}

async function geefClaimTerug(factuurId: string, claimTijd: string | null): Promise<void> {
  if (!supabase || !claimTijd) return
  // Alleen de eigen claim terugdraaien, en nooit van een al-verzonden factuur.
  await supabase
    .from('facturen')
    .update({ verzonden_op: null })
    .eq('id', factuurId)
    .eq('verzonden_op', claimTijd)
    .neq('status', 'verzonden')
}

export async function verwerkEnVerzendFactuur(opts: {
  factuurId: string
  stijl: FactuurVerzendStijl
  metExact: boolean
  verwerkOpties?: { prefix: string; startNummer: number }
  klant?: Klant
  // true = bewust opnieuw versturen (rij-actie op een verzonden/vervallen
  // factuur). Zonder deze vlag weigert de keten alles wat al verzonden is —
  // ook als de lijst in de browser verouderd was.
  herverzenden?: boolean
}): Promise<FactuurKetenResultaat> {
  const { factuurId, stijl, metExact } = opts

  let factuur = await getFactuur(factuurId)
  if (!factuur) throw new FactuurKetenFout('verwerken', 'Factuur niet gevonden')
  if (factuur.status === 'betaald' || factuur.status === 'gecrediteerd') {
    throw new FactuurKetenFout('verwerken', `Factuur is al ${factuur.status}`)
  }
  const alVerzonden = factuur.status === 'verzonden' || factuur.status === 'vervallen' || !!factuur.verzonden_op
  if (alVerzonden && !opts.herverzenden) {
    throw new FactuurKetenFout('verzenden', 'Al verzonden (ververs de lijst)')
  }

  const klant = opts.klant ?? (factuur.klant_id ? await getKlant(factuur.klant_id).catch(() => null) : null)
  if (!klant) throw new FactuurKetenFout('verzenden', 'Klant niet gevonden')

  // Ontvanger vóór alles: een factuur zonder mailadres mag geen nummer of
  // Exact-boeking krijgen om daarna alsnog te stranden.
  const ontvanger = await bepaalHerinneringOntvanger(factuur)
  if (!ontvanger.email) {
    throw new FactuurKetenFout('verzenden', 'Geen e-mailadres bekend voor deze klant')
  }

  if (factuur.status === 'concept') {
    if (!opts.verwerkOpties) {
      throw new FactuurKetenFout('verwerken', 'Factuur is nog een concept')
    }
    const nummer = factuur.nummer
      || await generateFactuurNummer(opts.verwerkOpties.prefix, opts.verwerkOpties.startNummer)
    try {
      const verwerkt = await updateFactuurWithNummerRetry(
        factuur.id,
        { nummer, status: 'open' },
        factuur.updated_at
      )
      factuur = { ...factuur, ...verwerkt }
    } catch (err) {
      logger.error('Factuur verwerken in verzendketen mislukt:', err)
      throw new FactuurKetenFout('verwerken', err instanceof Error ? err.message : 'Kon geen nummer toekennen')
    }
  }

  const echteItems = await getFactuurItems(factuur.id).catch(() => [] as Awaited<ReturnType<typeof getFactuurItems>>)
  const pdfItems: OfferteItem[] = echteItems.length > 0
    ? echteItems.map((item, idx) => ({
        id: item.id,
        offerte_id: '',
        beschrijving: item.beschrijving,
        aantal: item.aantal,
        eenheidsprijs: item.eenheidsprijs,
        btw_percentage: item.btw_percentage,
        korting_percentage: item.korting_percentage,
        totaal: item.totaal,
        volgorde: idx + 1,
        detail_regels: item.detail_regels || [],
        created_at: item.created_at,
      }))
    : regelsUitTotalen(factuur.titel, factuur.subtotaal, factuur.btw_bedrag)

  const factuurData = {
    nummer: factuur.nummer,
    titel: factuur.titel,
    datum: factuur.factuurdatum,
    vervaldatum: factuur.vervaldatum,
    subtotaal: factuur.subtotaal,
    btw_bedrag: factuur.btw_bedrag,
    totaal: factuur.totaal,
    notities: factuur.notities || undefined,
    betaalvoorwaarden: factuur.voorwaarden || undefined,
    factuur_type: (factuur.factuur_type || 'standaard') as string,
    betaal_link: factuur.betaal_link || undefined,
    outro_tekst: factuur.outro_tekst || undefined,
    factuur_bedrijfsnaam: factuur.factuur_bedrijfsnaam || undefined,
    factuur_tav: factuur.factuur_tav || undefined,
    factuur_adres: factuur.factuur_adres || undefined,
    factuur_postcode: factuur.factuur_postcode || undefined,
    factuur_plaats: factuur.factuur_plaats || undefined,
  }

  // Een bestaande Storage-PDF is bevroren: dat is het exemplaar dat (mogelijk)
  // al aan Exact hangt en eerder naar de klant ging. Die hergebruiken we; we
  // hergenereren alleen als er geen bevroren exemplaar is (editor-wijzigingen
  // maken pdf_storage_path leeg, dus dan is hergenereren juist correct).
  let pdfBase64: string | null = null
  if (factuur.pdf_storage_path) {
    try {
      const bestaand = await downloadFactuurPdfFromStorage(factuur.pdf_storage_path)
      if (bestaand) pdfBase64 = await blobNaarBase64(bestaand)
    } catch (downloadErr) {
      logger.warn('Bestaande factuur-PDF downloaden mislukt, genereer on-the-fly:', downloadErr)
    }
    if (!pdfBase64) {
      // On-the-fly zonder upload: het bevroren archief-exemplaar niet
      // overschrijven met een hergenereerde versie.
      try {
        const doc = generateFactuurPDF(factuurData, pdfItems, klant, stijl.bedrijfsProfiel, stijl.documentStyle ?? null)
        pdfBase64 = doc.output('datauristring').split(',')[1]
      } catch (pdfErr) {
        logger.error('PDF genereren mislukt in verzendketen:', pdfErr)
        throw new FactuurKetenFout('pdf', 'Kon de factuur-PDF niet genereren')
      }
    }
  } else {
    try {
      if (factuur.organisatie_id) {
        const result = await genereerEnUploadFactuurPdf({
          factuurId: factuur.id,
          organisatieId: factuur.organisatie_id,
          factuurData,
          items: pdfItems,
          klant,
          bedrijfsProfiel: stijl.bedrijfsProfiel,
          docStyle: stijl.documentStyle,
        })
        if (result) pdfBase64 = await blobNaarBase64(result.blob)
      }
    } catch (storageErr) {
      logger.warn('PDF Storage-upload mislukt in verzendketen, val terug op on-the-fly:', storageErr)
    }
    if (!pdfBase64) {
      try {
        const doc = generateFactuurPDF(factuurData, pdfItems, klant, stijl.bedrijfsProfiel, stijl.documentStyle ?? null)
        pdfBase64 = doc.output('datauristring').split(',')[1]
      } catch (pdfErr) {
        logger.error('PDF genereren mislukt in verzendketen:', pdfErr)
        throw new FactuurKetenFout('pdf', 'Kon de factuur-PDF niet genereren')
      }
    }
  }

  let exactGesynct = !!factuur.exact_entry_id || !!factuur.exact_synced_at
  let exactWaarschuwing: string | undefined
  if (metExact && !exactGesynct) {
    const sync = await syncFactuurNaarExact(factuur.id)
    exactGesynct = true
    exactWaarschuwing = sync.waarschuwing
    factuur = {
      ...factuur,
      exact_entry_id: sync.exactEntryId,
      exact_synced_at: factuur.exact_synced_at || new Date().toISOString(),
      exact_document_id: sync.documentId ?? undefined,
      exact_bijlage_gesynced_op: sync.bijlageSynced
        ? new Date().toISOString()
        : factuur.exact_bijlage_gesynced_op,
    }
  }

  const { subject, html } = factuurVerzendTemplate({
    klantNaam: klant.contactpersoon || klant.bedrijfsnaam,
    factuurNummer: factuur.nummer,
    factuurTitel: factuur.titel,
    totaalBedrag: new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(factuur.totaal),
    vervaldatum: formatDate(factuur.vervaldatum),
    bedrijfsnaam: stijl.bedrijfsnaam,
    primaireKleur: stijl.primaireKleur,
    handtekening: stijl.emailHandtekening || undefined,
    logoUrl: stijl.logoUrl,
    betaalUrl: factuur.betaal_link || undefined,
  })

  let claimTijd: string | null = null
  if (!alVerzonden) {
    const claim = await claimVerzending(factuur.id)
    claimTijd = claim.claimTijd
  }

  try {
    await sendEmail(ontvanger.email, subject, '', {
      html,
      attachments: [{ filename: `Factuur-${factuur.nummer}.pdf`, content: pdfBase64, encoding: 'base64' as const }],
    })
  } catch (err) {
    // Mail is niet vertrokken: claim teruggeven zodat een nieuwe poging niet
    // op "al verzonden" strandt.
    await geefClaimTerug(factuur.id, claimTijd).catch(() => undefined)
    throw new FactuurKetenFout('verzenden', err instanceof Error ? err.message : 'Kon de e-mail niet versturen')
  }

  // De mail is de deur uit; een gefaalde statusupdate mag de keten niet meer
  // als mislukt bestempelen (anders zou een retry de klant dubbel mailen).
  // Eén herkansing voor transiente netwerkfouten, daarna expliciet waarschuwen.
  let statusWaarschuwing: string | undefined
  try {
    let updated: Partial<Factuur>
    try {
      updated = await markeerFactuurVerzonden(factuur.id)
    } catch {
      updated = await markeerFactuurVerzonden(factuur.id)
    }
    factuur = { ...factuur, ...updated }
  } catch (err) {
    logger.error('Factuur als verzonden markeren mislukt na verzending:', err)
    factuur = { ...factuur, status: 'verzonden' }
    statusWaarschuwing = `Factuur ${factuur.nummer} is gemaild, maar de status kon niet opgeslagen worden · niet nogmaals versturen`
  }

  return { factuur, ontvanger: ontvanger.email, exactGesynct, exactWaarschuwing, statusWaarschuwing }
}
