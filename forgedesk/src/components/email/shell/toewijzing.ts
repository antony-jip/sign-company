import { useMemo } from 'react'
import { useMedewerkers } from '@/contexts/MedewerkersContext'
import { getAvatarStyle } from '../emailHelpers'

export interface ToewijsDoel {
  /** Wat in emails.toegewezen_aan komt te staan: user_id, of het medewerker-id als die geen account heeft. */
  sleutel: string
  naam: string
  initiaal: string
  kleur: { bg: string; text: string }
}

function initiaalVan(naam: string): string {
  const delen = naam.trim().split(/\s+/)
  if (delen.length === 0 || !delen[0]) return '?'
  const eerste = delen[0][0]
  const laatste = delen.length > 1 ? delen[delen.length - 1][0] : ''
  return `${eerste}${laatste}`.toUpperCase()
}

/**
 * Onder welke sleutels een gesprek "van mij" is: het eigen user_id, plus het
 * medewerker-id van dezelfde persoon (oudere rijen kunnen dat bevatten).
 */
export function useEigenSleutels(userId?: string | null): string[] {
  const { medewerkers } = useMedewerkers()
  return useMemo(() => {
    if (!userId) return []
    const uit = [userId]
    for (const m of medewerkers) if (m.user_id === userId && m.id !== userId) uit.push(m.id)
    return uit
  }, [medewerkers, userId])
}

/**
 * De collega's waaraan een gesprek toegewezen kan worden, plus een index om
 * een bestaande `toegewezen_aan` terug te vertalen naar een naam. De index
 * kent zowel het user_id als het medewerker-id, want oudere rijen kunnen het
 * een of het ander bevatten.
 */
export function useToewijzing(): { doelen: ToewijsDoel[]; zoek: (sleutel: string | null | undefined) => ToewijsDoel | null } {
  const { medewerkers } = useMedewerkers()
  return useMemo(() => {
    const doelen: ToewijsDoel[] = []
    const index = new Map<string, ToewijsDoel>()
    for (const m of medewerkers) {
      if (m.status === 'inactief') continue
      const doel: ToewijsDoel = {
        sleutel: m.user_id || m.id,
        naam: m.naam,
        initiaal: initiaalVan(m.naam),
        kleur: getAvatarStyle(m.naam),
      }
      doelen.push(doel)
      index.set(doel.sleutel, doel)
      if (m.user_id) index.set(m.id, doel)
      if (m.email) index.set(m.email.toLowerCase(), doel)
    }
    doelen.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
    const zoek = (sleutel: string | null | undefined): ToewijsDoel | null => {
      if (!sleutel) return null
      return index.get(sleutel) ?? index.get(sleutel.toLowerCase()) ?? {
        sleutel,
        naam: sleutel,
        initiaal: initiaalVan(sleutel),
        kleur: getAvatarStyle(sleutel),
      }
    }
    return { doelen, zoek }
  }, [medewerkers])
}
