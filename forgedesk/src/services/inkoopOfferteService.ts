import { getSignedUrl } from './storageService'
import { createInkoopRegel, updateInkoopOfferte } from './crmService'
import { gooiBijBudgetError } from '@/lib/aiBudgetError'
import { round2 } from '@/utils/budgetUtils'
import type { InkoopOfferte, InkoopRegel } from '@/types'

/**
 * Een inkoopofferte die uit een mailbijlage komt wordt eerst alleen vastgelegd:
 * leverancier, datum en het bestand. Het uitlezen van de regels kost AI-budget
 * en gebeurt daarom pas wanneer iemand er zelf om vraagt. Deze functie doet dat
 * losse uitlezen, met hetzelfde eindpunt als het inkooppaneel bij offertes.
 */

interface GeanalyseerdeRegel {
  omschrijving: string
  aantal: number
  eenheid?: string
  prijs_per_stuk: number
  totaal: number
  confidence: number
}

export interface UitleesResultaat {
  regels: InkoopRegel[]
  totaal: number
}

async function alsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Kon het bestand niet lezen'))
    reader.readAsDataURL(blob)
  })
}

function isPdfBestand(offerte: InkoopOfferte, blob: Blob): boolean {
  if (blob.type.toLowerCase().includes('pdf')) return true
  return (offerte.bestand_url || '').toLowerCase().endsWith('.pdf')
}

export async function leesInkoopOfferteUit(
  offerte: InkoopOfferte,
  accessToken?: string,
): Promise<UitleesResultaat> {
  if (!offerte.bestand_url) {
    throw new Error('Bij deze inkoopofferte is geen bestand bewaard')
  }

  const url = await getSignedUrl(offerte.bestand_url)
  if (!url) throw new Error('Kon het bestand niet ophalen')
  const bestandRespons = await fetch(url)
  if (!bestandRespons.ok) throw new Error('Kon het bestand niet ophalen')
  const blob = await bestandRespons.blob()

  const respons = await fetch('/api/analyze-inkoop-offerte', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      bestand_base64: await alsDataUrl(blob),
      bestand_type: isPdfBestand(offerte, blob) ? 'pdf' : 'image',
      leverancier: offerte.leverancier_naam,
    }),
  })

  if (!respons.ok) {
    await gooiBijBudgetError(respons)
    const fout = await respons.json().catch(() => ({})) as { error?: string }
    throw new Error(fout.error || 'Analyse mislukt')
  }

  const data = await respons.json() as { regels?: GeanalyseerdeRegel[] }
  const gevonden = data.regels || []
  if (gevonden.length === 0) {
    throw new Error('Geen regels gevonden in dit bestand')
  }

  const regels = await Promise.all(gevonden.map((regel) =>
    createInkoopRegel({
      user_id: offerte.user_id,
      inkoop_offerte_id: offerte.id,
      omschrijving: regel.omschrijving,
      aantal: regel.aantal,
      eenheid: regel.eenheid,
      prijs_per_stuk: round2(regel.prijs_per_stuk),
      totaal: round2(regel.totaal),
      // Zelfde grens als het inkooppaneel: onder 0.7 markeren zodat je die
      // regel zelf nakijkt voor hij in een calculatie belandt.
      twijfelachtig: regel.confidence < 0.7,
    })
  ))

  const totaal = round2(regels.reduce((som, r) => som + round2(r.totaal), 0))
  await updateInkoopOfferte(offerte.id, { totaal })

  return { regels, totaal }
}
