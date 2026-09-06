import type { Medewerker } from '@/types'

/**
 * getMedewerkers vult teamleden zonder medewerker-record aan met het pseudo-id
 * 'profile-<uuid>'. Dat past niet in de UUID-kolom tijdregistraties.medewerker_id
 * (de insert faalt), dus zo'n regel krijgt geen medewerker_id en user_id blijft
 * de eigenaar. medewerker_contracten.medewerker_id is TEXT en mag het wel.
 */
export function isPseudoMedewerker(id: string | null | undefined): boolean {
  return !!id && id.startsWith('profile-')
}

export function koppelbaarMedewerkerId(medewerker: Pick<Medewerker, 'id'> | null | undefined): string | undefined {
  if (!medewerker || isPseudoMedewerker(medewerker.id)) return undefined
  return medewerker.id
}
