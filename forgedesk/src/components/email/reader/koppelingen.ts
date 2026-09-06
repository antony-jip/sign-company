import type { EmailKoppeling, KoppelingSoort } from '@/lib/mail/types'
import { getKlant, getProject, getOfferte, getFactuur } from '@/services/supabaseService'

// Naam en pad achter een koppeling. De koppeltabel bewaart alleen soort en
// id; wat er op de chip staat komt uit de eigen tabel van de entiteit.

export interface KoppelingChip {
  koppeling: EmailKoppeling
  soort: KoppelingSoort
  label: string
  pad: string | null
}

export const SOORT_LABEL: Record<KoppelingSoort, string> = {
  klant: 'Klant',
  project: 'Project',
  offerte: 'Offerte',
  factuur: 'Factuur',
  aanvraag: 'Aanvraag',
  taak: 'Taak',
  lead: 'Lead',
}

export function padVoor(soort: KoppelingSoort, doelId: string): string | null {
  switch (soort) {
    case 'klant': return `/klanten/${doelId}`
    case 'project': return `/projecten/${doelId}`
    case 'offerte': return `/offertes/${doelId}/bewerken`
    case 'factuur': return `/facturen/${doelId}/bewerken`
    default: return null
  }
}

const labelCache = new Map<string, Promise<string>>()

export function laadKoppelingLabel(soort: KoppelingSoort, doelId: string): Promise<string> {
  const sleutel = `${soort}:${doelId}`
  const bekend = labelCache.get(sleutel)
  if (bekend) return bekend
  const belofte = (async () => {
    try {
      switch (soort) {
        case 'klant': {
          const k = await getKlant(doelId)
          return k ? (k.bedrijfsnaam || k.contactpersoon || 'Klant') : 'Klant'
        }
        case 'project': {
          const p = await getProject(doelId)
          return p ? [p.project_nummer, p.naam].filter(Boolean).join(' ') : 'Project'
        }
        case 'offerte': {
          const o = await getOfferte(doelId)
          return o ? [o.nummer, o.titel].filter(Boolean).join(' ') : 'Offerte'
        }
        case 'factuur': {
          const f = await getFactuur(doelId)
          return f ? [f.nummer, f.klant_naam].filter(Boolean).join(' ') : 'Factuur'
        }
        default:
          return SOORT_LABEL[soort]
      }
    } catch {
      return SOORT_LABEL[soort]
    }
  })()
  labelCache.set(sleutel, belofte)
  return belofte
}

export async function chipsVoor(koppelingen: EmailKoppeling[]): Promise<KoppelingChip[]> {
  return Promise.all(koppelingen.map(async (k) => ({
    koppeling: k,
    soort: k.soort,
    label: await laadKoppelingLabel(k.soort, k.doel_id),
    pad: padVoor(k.soort, k.doel_id),
  })))
}
