/**
 * Of iemand admin is. Eén bron: profiles.rol.
 *
 * Waarom niet meer de terugvallen die hier stonden. Er waren drie andere
 * bronnen, en alle drie zijn ze door de gebruiker zelf te schrijven:
 * user_metadata.app_rol via supabase.auth.updateUser({ data: ... }), en
 * medewerkers.rol en .app_rol via de RLS op medewerkers, die org-scoped is maar
 * niets over rollen zegt. Een adminpoort die de gebruiker zelf kan openzetten is
 * geen poort.
 *
 * profiles.rol is de kolom die de backend al vertrouwt (api/invite-team-member
 * en api/manage-team-member checken daarop) en die migratie 173 heeft
 * vastgezet, zodat hij alleen nog via de backend te wijzigen is.
 *
 * Wie hiervoor alleen via medewerkers.rol admin was, ziet nu geen adminknoppen
 * meer. Dat is geen verlies van rechten maar het einde van een schijnvertoning:
 * server-side was die persoon nooit admin, dus die knoppen leverden een 403.
 */
export function isAdminUser(profielRol?: string | null): boolean {
  return profielRol === 'admin'
}

