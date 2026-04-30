import type { AuditLogEntry, Medewerker } from '@/types'
import { createAuditLogEntry } from '@/services/supabaseService'

// TODO: TasksLayout.tsx:195-203 dupliceert resolveMedewerkerNaam logica.
// Vervangen in aparte refactor-PR — niet in deze feature.

interface ActorUser {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

// Module-level snapshot — gevuld door MedewerkersProvider zodat callers
// zonder lokale medewerkers-state alsnog de medewerker.naam krijgen
// i.p.v. de JWT-fallback.
let medewerkersSnapshot: Medewerker[] = []

export function setMedewerkersSnapshot(medewerkers: Medewerker[]): void {
  medewerkersSnapshot = medewerkers
}

export function resolveMedewerkerNaam(
  user: ActorUser | null | undefined,
  medewerkers: Medewerker[]
): string {
  if (!user) return ''
  const matched = medewerkers.find((m) => m.user_id === user.id)
  if (matched?.naam) return matched.naam
  const voornaam = user.user_metadata?.voornaam as string | undefined
  const achternaam = user.user_metadata?.achternaam as string | undefined
  if (voornaam) return `${voornaam} ${achternaam || ''}`.trim()
  return user.email || ''
}

// Fire-and-forget logger — mag NOOIT de hoofdoperatie blokkeren of laten falen
export async function logWijziging(params: {
  userId: string
  entityType: AuditLogEntry['entity_type']
  entityId: string
  actie: AuditLogEntry['actie']
  medewerkerNaam: string
  veld?: string
  oudeWaarde?: string
  nieuweWaarde?: string
  omschrijving?: string
}): Promise<void> {
  try {
    await createAuditLogEntry({
      user_id: params.userId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      actie: params.actie,
      medewerker_naam: params.medewerkerNaam,
      veld: params.veld,
      oude_waarde: params.oudeWaarde,
      nieuwe_waarde: params.nieuweWaarde,
      omschrijving: params.omschrijving,
    })
  } catch (err) {
    console.warn('Audit log schrijven mislukt:', err)
    // NOOIT gooien — de hoofdoperatie gaat gewoon door
  }
}

// Diff helper: vergelijk twee objecten en log per gewijzigd veld
export async function logObjectWijziging<T extends Record<string, unknown>>(params: {
  userId: string
  entityType: AuditLogEntry['entity_type']
  entityId: string
  medewerkerNaam: string
  oudeData: Partial<T>
  nieuweData: Partial<T>
  veldenOmTeLoggen: (keyof T)[]
}): Promise<void> {
  for (const veld of params.veldenOmTeLoggen) {
    const oud = params.oudeData[veld]
    const nieuw = params.nieuweData[veld]
    if (JSON.stringify(oud) !== JSON.stringify(nieuw)) {
      await logWijziging({
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        actie: 'gewijzigd',
        medewerkerNaam: params.medewerkerNaam,
        veld: String(veld),
        oudeWaarde: oud != null ? String(oud) : undefined,
        nieuweWaarde: nieuw != null ? String(nieuw) : undefined,
      })
    }
  }
}

export async function logCreate(params: {
  user: ActorUser | null | undefined
  medewerkers?: Medewerker[]
  entityType: AuditLogEntry['entity_type']
  entityId: string
  omschrijving?: string
}): Promise<void> {
  if (!params.user?.id) return
  return logWijziging({
    userId: params.user.id,
    entityType: params.entityType,
    entityId: params.entityId,
    actie: 'aangemaakt',
    medewerkerNaam: resolveMedewerkerNaam(params.user, params.medewerkers ?? medewerkersSnapshot),
    omschrijving: params.omschrijving,
  })
}
