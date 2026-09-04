import { createTijdregistratie } from './tijdregistratieService'
import { updateWerkbon } from './werkbonService'
import { getMontageAfspraak } from './planningService'
import { getProjectUrenBudget, type ProjectUrenBudget } from './projectUrenService'
import { kostprijsVoor, uurtariefVoorkeuze } from '@/utils/kostprijs'
import { logger } from '@/utils/logger'
import type { AppSettings, Medewerker, Tijdregistratie, Werkbon } from '@/types'

export interface BoekWerkbonUrenInput {
  werkbon: Werkbon
  afronder: Medewerker | null
  medewerkers: Medewerker[]
  settings: AppSettings
  urenVelden: string[]
}

export function montageVeld(urenVelden: string[]): string | null {
  if (urenVelden.includes('Montage')) return 'Montage'
  return urenVelden.find((v) => v.toLowerCase().includes('montage')) ?? null
}

/** Gelijk verdelen op hele minuten; wat overblijft gaat naar de eerste. */
export function verdeelMinuten(totaal: number, aantal: number): number[] {
  const basis = Math.floor(totaal / aantal)
  const rest = totaal - basis * aantal
  return Array.from({ length: aantal }, (_, i) => basis + (i === 0 ? rest : 0))
}

function matchMonteurs(namen: string[], medewerkers: Medewerker[]): Medewerker[] {
  const gevonden: Medewerker[] = []
  for (const naam of namen) {
    const sleutel = naam.trim().toLowerCase()
    if (!sleutel) continue
    const medewerker = medewerkers.find((m) => m.naam.trim().toLowerCase() === sleutel)
    if (medewerker && !gevonden.includes(medewerker)) gevonden.push(medewerker)
  }
  return gevonden
}

async function ontvangers(input: BoekWerkbonUrenInput): Promise<(Medewerker | null)[]> {
  const { werkbon, afronder, medewerkers, settings } = input
  if (settings.werkbon_uren_verdelen && werkbon.montage_afspraak_id) {
    const afspraak = await getMontageAfspraak(werkbon.montage_afspraak_id)
    const monteurs = matchMonteurs(afspraak?.monteurs ?? [], medewerkers)
    if (monteurs.length > 0) return monteurs
  }
  return [afronder]
}

async function budgetVan(projectId: string, urenVelden: string[]): Promise<ProjectUrenBudget | null> {
  try {
    return await getProjectUrenBudget(projectId, urenVelden)
  } catch (err) {
    logger.warn('Kon urenbudget voor werkbon-uren niet laden:', err)
    return null
  }
}

export function geboektMelding(regels: Tijdregistratie[]): string {
  const uren = regels.reduce((s, r) => s + (r.duur_minuten || 0), 0) / 60
  return `${uren.toLocaleString('nl-NL', { maximumFractionDigits: 2 })} uur geboekt op het project`
}

/**
 * Zet de gewerkte uren van een afgeronde werkbon om in urenregels op het
 * project. `uren_geboekt_op` voorkomt dubbel boeken bij opnieuw afronden.
 * Fouten worden doorgegooid; de aanroeper beslist wat hij ermee doet.
 */
export async function boekWerkbonUren(input: BoekWerkbonUrenInput): Promise<Tijdregistratie[]> {
  const { werkbon, settings, urenVelden } = input
  const totaalMinuten = Math.round((werkbon.uren_gewerkt || 0) * 60)
  if (totaalMinuten <= 0 || !werkbon.project_id || werkbon.uren_geboekt_op) return []

  const projectId = werkbon.project_id
  const bewerking = montageVeld(urenVelden)
  const [personen, budget] = await Promise.all([ontvangers(input), budgetVan(projectId, urenVelden)])
  const tariefVanBewerking = bewerking ? budget?.perVeld[bewerking]?.tarief : null
  const minuten = verdeelMinuten(totaalMinuten, personen.length)
  const datum = werkbon.datum || new Date().toISOString().slice(0, 10)

  const regels: Tijdregistratie[] = []
  for (let i = 0; i < personen.length; i++) {
    const medewerker = personen[i]
    regels.push(await createTijdregistratie({
      project_id: projectId,
      urenveld: bewerking,
      medewerker_id: medewerker?.id,
      medewerker_naam: medewerker?.naam,
      omschrijving: `Werkbon ${werkbon.werkbon_nummer}`,
      datum,
      start_tijd: '',
      eind_tijd: '',
      duur_minuten: minuten[i],
      uurtarief: uurtariefVoorkeuze(tariefVanBewerking, medewerker, settings),
      kostprijs_uur: kostprijsVoor(medewerker, settings),
      facturabel: true,
      gefactureerd: false,
    }))
  }

  await updateWerkbon(werkbon.id, { uren_geboekt_op: new Date().toISOString() })
  return regels
}
