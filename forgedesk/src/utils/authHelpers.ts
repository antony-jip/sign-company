import type { Medewerker } from '@/types'

interface UserLike {
  user_metadata?: {
    app_rol?: string
  } & Record<string, unknown>
}

/**
 * Of iemand admin is. Er zijn historisch drie rolvelden: profiles.rol,
 * medewerkers.rol en medewerkers.app_rol. profiles.rol is de bron die de
 * backend gebruikt (api/invite-team-member en api/manage-team-member checken
 * daarop, en migratie 173 zet juist die kolom vast), dus die is hier leidend.
 *
 * De andere twee blijven meedoen als terugval zolang ze niet zijn opgeruimd:
 * ze weghalen zou mensen die alleen via medewerkers.rol admin waren stil hun
 * rechten afnemen. Wat hiermee wél weg is, is dat twee checks in de app een
 * verschillend antwoord konden geven op dezelfde vraag.
 */
export function isAdminUser(
  medewerker?: Medewerker | null,
  user?: UserLike | null,
  profielRol?: string | null
): boolean {
  if (profielRol === 'admin') return true
  if (medewerker?.rol === 'admin') return true
  if (medewerker?.app_rol === 'admin') return true
  if (user?.user_metadata?.app_rol === 'admin') return true
  return false
}
