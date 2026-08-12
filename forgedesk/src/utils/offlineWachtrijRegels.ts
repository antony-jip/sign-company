// Beslisregels van de offline-wachtrij. Pure functies, geen imports uit de
// app, zodat elk oordeel zonder DOM en zonder database te testen is.

import { magOpnieuwProberen, type FoutSoort } from './offlineFoutClassificatie'

export type MutatieStatus = 'wachtend' | 'bezig' | 'vast'
export type MutatieSoort = 'werkbon_foto' | 'werkbon_feedback'

// Vijf pogingen. Bij een échte netwerkfout kost elke poging een mislukte
// ronde; meer dan vijf voegt niets toe behalve batterij, en het item blijft
// staan (nooit weggooien), dus 'vast' is geen verlies maar een signaal.
export const MAX_POGINGEN = 5

/**
 * Wat is de stand van een mutatie na een mislukte poging?
 * `pogingen` is het aantal pogingen INCLUSIEF deze, want de teller wordt
 * opgehoogd vóór de poging: een crash tussen poging en bijwerken moet als
 * poging tellen.
 */
export function volgendeMutatieStatus(pogingen: number, soort: FoutSoort): MutatieStatus {
  if (!magOpnieuwProberen(soort)) return 'vast'
  // Een netwerkfout telt NIET mee voor de cap. De teller wordt opgehoogd per
  // flush-trigger, en triggers zijn gratis: elke keer dat de monteur terugswitcht
  // van de camera naar de app vuurt visibilitychange. Vijf keer wisselen zou de
  // eerste foto dan op 'vast' zetten terwijl er nooit een antwoord is geweest en
  // er dus geen enkele aanwijzing is dat er iets mis is met het item.
  //
  // De cap hoort te gaan over "de server antwoordde en het lukte niet", niet over
  // "we hebben het geprobeerd". Bij 'netwerk' blijft hij dus wachten, hoe vaak
  // dan ook: een monteur zonder bereik moet een halve dag kunnen overbruggen.
  if (soort === 'netwerk') return 'wachtend'
  return pogingen >= MAX_POGINGEN ? 'vast' : 'wachtend'
}

export type ConflictOordeel =
  | { toegestaan: true }
  | { toegestaan: false; foutSoort: FoutSoort; uitleg: string }

/**
 * Conflictregel voor mutaties op een werkbon.
 *
 * De regel: **de server wint op de statusovergang, de offline schrijver wint
 * op de velden, en niets wordt stil weggegooid.**
 *
 * Per soort verschilt wat "de server wint" betekent, en dat is opzet:
 *
 * - `werkbon_feedback` overschrijft velden (uren, opmerkingen, handtekening).
 *   Zodra de werkbon is afgerond of gefactureerd is hij de basis voor een
 *   factuur; een oudere buffer die daar overheen schrijft verandert een
 *   document dat de deur al uit is. Dat is de bestaande regel uit
 *   `werkbonOfflineQueue.ts:53-55`, met één verschil: daar werd de buffer
 *   stil gewist, hier blijft hij staan als 'vast' zodat de monteur ziet dat
 *   zijn drie uur en zijn handtekening niet zijn aangekomen.
 *
 * - `werkbon_foto` voegt toe, het overschrijft niets. Bij `afgerond` is de
 *   foto dus toegestaan: hij documenteert alleen, en de enige kopie staat op
 *   de telefoon (`capture="environment"` zet een opname op iOS niet in de
 *   camerarol). Weigeren zou dataverlies zijn om een conflict te vermijden
 *   dat er niet is. Pas bij `gefactureerd` weegt het andersom: de foto zou
 *   onder een verstuurde factuur opduiken, dus daar wint de server en blijft
 *   de foto zichtbaar wachten op een beslissing van de monteur.
 *
 * Bestaat de werkbon niet meer, dan is er geen doelwit en is elke poging
 * zinloos: 'weg'.
 */
export function beoordeelWerkbonMutatie(
  soort: MutatieSoort,
  werkbonStatus: 'concept' | 'definitief' | 'afgerond' | 'gefactureerd' | null,
): ConflictOordeel {
  if (werkbonStatus === null) {
    return { toegestaan: false, foutSoort: 'weg', uitleg: 'Deze werkbon bestaat niet meer' }
  }
  if (werkbonStatus === 'gefactureerd') {
    return {
      toegestaan: false,
      foutSoort: 'conflict',
      uitleg: 'De werkbon is al gefactureerd',
    }
  }
  if (soort === 'werkbon_feedback' && werkbonStatus === 'afgerond') {
    return {
      toegestaan: false,
      foutSoort: 'conflict',
      uitleg: 'De werkbon is inmiddels afgerond',
    }
  }
  return { toegestaan: true }
}

/**
 * Per-veld laatste-schrijver-wint: alleen wat de gebruiker echt aanraakte
 * gaat mee in de UPDATE. Zonder dit overschrijft een flush ook de velden die
 * het kantoor ondertussen heeft bijgewerkt, met een oudere waarde.
 */
export function beperkTotGewijzigd<T extends Record<string, unknown>>(
  payload: T,
  gewijzigdeVelden: readonly string[],
): Partial<T> {
  if (gewijzigdeVelden.length === 0) return {}
  const uit: Partial<T> = {}
  for (const veld of gewijzigdeVelden) {
    if (veld in payload) uit[veld as keyof T] = payload[veld as keyof T]
  }
  return uit
}

export interface WachtrijStand {
  wachtend: number
  vast: number
}

export function telStand(items: readonly { status: MutatieStatus }[]): WachtrijStand {
  let wachtend = 0
  let vast = 0
  for (const item of items) {
    if (item.status === 'vast') vast++
    else wachtend++
  }
  return { wachtend, vast }
}

/**
 * De tekst van de app-brede banner. Drie standen, en de tweede verschijnt
 * juist ook als je online bent: een wachtrij die niet leegloopt terwijl er
 * verbinding is, is precies het geval dat vandaag onzichtbaar is.
 */
export function bannerTekst(online: boolean, stand: WachtrijStand): string | null {
  if (stand.vast > 0) {
    return stand.vast === 1
      ? '1 item kon niet verstuurd worden. Open de werkbon om te kiezen wat ermee gebeurt.'
      : `${stand.vast} items konden niet verstuurd worden. Open de werkbon om te kiezen wat ermee gebeurt.`
  }
  if (stand.wachtend > 0) {
    return stand.wachtend === 1
      ? '1 item wacht op verzending.'
      : `${stand.wachtend} items wachten op verzending.`
  }
  if (!online) return "Geen verbinding. Foto's en uren worden bewaard en later verstuurd."
  return null
}
