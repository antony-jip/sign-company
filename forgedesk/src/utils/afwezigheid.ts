import type { VrijPatroon, Afwezigheid, AfwezigStatus, AfwezigheidType } from '@/types'

// Voorgeïndexeerde afwezigheid-data, per medewerker. Bouw één keer per
// data-wijziging; resolveAfwezig doet daarna goedkope lookups per cel.
export interface AfwezigheidIndex {
  patronen: Map<string, VrijPatroon[]>
  afwezigheden: Map<string, Afwezigheid[]>
}

const LEEG: AfwezigStatus = { afwezig: false, type: null, label: '' }

function groepeerPerMedewerker<T extends { medewerker_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const lijst = map.get(row.medewerker_id)
    if (lijst) lijst.push(row)
    else map.set(row.medewerker_id, [row])
  }
  return map
}

export function buildAfwezigheidIndex(
  patronen: VrijPatroon[],
  afwezigheden: Afwezigheid[],
): AfwezigheidIndex {
  return {
    patronen: groepeerPerMedewerker(patronen),
    afwezigheden: groepeerPerMedewerker(afwezigheden),
  }
}

const TYPE_LABEL: Record<AfwezigheidType, string> = {
  vakantie: 'Vakantie',
  ziek: 'Ziek',
  bijzonder: 'Bijzonder',
  vrij: 'Vrij',
}

// Bepaalt de afwezig-status van één monteur op één datum.
// Precedentie: datumbereik-afwezigheid > structureel vrij > niets.
// Feestdag-agnostisch: views roepen dit alleen aan in de !feestdag-tak.
export function resolveAfwezig(
  index: AfwezigheidIndex,
  medewerkerId: string,
  dateStr: string,
  dayIdx: number,
): AfwezigStatus {
  const ranges = index.afwezigheden.get(medewerkerId)
  if (ranges) {
    for (const a of ranges) {
      if (a.start_datum <= dateStr && dateStr <= a.eind_datum) {
        const basis = a.type === 'bijzonder' && a.opmerking ? a.opmerking : TYPE_LABEL[a.type]
        const dagdeel = a.start_tijd && a.eind_tijd ? ` ${a.start_tijd}–${a.eind_tijd}` : ''
        return {
          afwezig: true,
          type: a.type,
          label: basis + dagdeel,
          opmerking: a.opmerking,
          start_tijd: a.start_tijd,
          eind_tijd: a.eind_tijd,
        }
      }
    }
  }

  const patronen = index.patronen.get(medewerkerId)
  if (patronen) {
    for (const p of patronen) {
      const inBereik =
        (p.geldig_van == null || dateStr >= p.geldig_van) &&
        (p.geldig_tot == null || dateStr <= p.geldig_tot)
      if (inBereik && (p.vrije_dagen >> dayIdx) & 1) {
        return { afwezig: true, type: 'structureel', label: 'Vrij', opmerking: p.opmerking }
      }
    }
  }

  return LEEG
}
