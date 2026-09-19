import { landOfStandaard } from './landen'

// Wettelijke vermelding bij verlegde btw. In België is bij werk in onroerende
// staat voor een btw-plichtige afnemer (medecontractant, art. 20 KB nr. 1)
// sinds 2023 exact deze tekst verplicht; daarbuiten volstaat de verwijzing
// naar art. 196 van de btw-richtlijn (B2B binnen de EU).
export const MEDECONTRACTANT_TEKST =
  'Verlegging van heffing. Bij gebrek aan schriftelijke betwisting binnen een termijn van één maand na de ontvangst van de factuur, wordt de afnemer geacht te erkennen dat hij een belastingplichtige is gehouden tot de indiening van periodieke aangiften. Als die voorwaarde niet vervuld is, is de afnemer ten aanzien van die voorwaarde aansprakelijk voor de betaling van de verschuldigde belasting, interesten en geldboeten.'

export const ART196_TEKST = 'Btw verlegd naar de afnemer (art. 196 Richtlijn 2006/112/EG).'

export function isMedecontractant(leveranciersLand: string | null | undefined, klantLand: string | null | undefined): boolean {
  return landOfStandaard(leveranciersLand) === 'BE' && landOfStandaard(klantLand) === 'BE'
}

/** Korte omschrijving voor op de factuurregel/UBL en de volledige wettelijke tekst. */
export function verleggingsTekst(leveranciersLand: string | null | undefined, klantLand: string | null | undefined): { kort: string; volledig: string } {
  if (isMedecontractant(leveranciersLand, klantLand)) {
    return { kort: 'Btw verlegd, medecontractant (art. 20 KB nr. 1)', volledig: MEDECONTRACTANT_TEKST }
  }
  return { kort: 'Btw verlegd', volledig: ART196_TEKST }
}
