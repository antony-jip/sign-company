import type { AuditLogEntry } from '@/types'
import { createAuditLogEntry } from '@/services/supabaseService'

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
