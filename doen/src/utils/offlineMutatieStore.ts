import type { MutatieSoort, MutatieStatus } from './offlineWachtrijRegels'
import type { FoutSoort } from './offlineFoutClassificatie'

/**
 * Persistente mutatiewachtrij. Zelfde vorm als `maatjeOfflineQueue.ts`: kale
 * `indexedDB.open`, verbinding per aanroep openen en in `finally` sluiten,
 * lezen faalt zacht, schrijven gooit. Geen npm-package.
 *
 * Twee stores in plaats van één, en dat is de enige bewuste afwijking van het
 * bestaande patroon. `mutaties` is klein JSON en mag in zijn geheel gelezen
 * worden; de foto's staan in `blobs`. Zonder die splitsing deserialiseert een
 * `getAll()` elke foto in het geheugen, ook als je alleen wil weten hoevéél
 * items er wachten — precies wat `MaatjeKladblok.tsx:110-112` vandaag doet
 * voor een `.length`.
 *
 * Wat er niet in zit: verwijderen bij uitloggen. Een openstaande foto is de
 * enige kopie; die weggooien omdat iemand uitlogt is dataverlies. De
 * `eigenaar`-sleutel zorgt dat een volgende gebruiker hem niet ziet.
 */

const DB_NAAM = 'doen_offline'
const DB_VERSIE = 1
const STORE_MUTATIES = 'mutaties'
const STORE_BLOBS = 'blobs'

export interface Mutatie {
  id: string
  soort: MutatieSoort
  entiteitId: string
  eigenaar: string
  payload: Record<string, unknown>
  gewijzigdeVelden: string[]
  basisVersie: string | null
  heeftBlob: boolean
  aangemaakt: number
  pogingen: number
  laatsteFout: string | null
  foutSoort: FoutSoort | null
  status: MutatieStatus
}

export class WachtrijVolFout extends Error {
  constructor() {
    super('Opslag van de telefoon is vol')
    this.name = 'WachtrijVolFout'
  }
}

export function maakEigenaarSleutel(userId: string | null, organisatieId: string | null): string {
  return `${userId ?? 'geen'}:${organisatieId ?? 'geen'}`
}

function ondersteund(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAAM, DB_VERSIE)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_MUTATIES)) {
        const store = db.createObjectStore(STORE_MUTATIES, { keyPath: 'id' })
        // Indexen zoals het ontwerp ze voorschrijft. De coalescing-index wordt
        // gebruikt; op status/tijd sorteren we in JS, want deze store bevat
        // geen blobs en is daarmee goedkoop om helemaal te lezen.
        store.createIndex('op_status_tijd', ['status', 'aangemaakt'])
        store.createIndex('op_entiteit', ['soort', 'entiteitId'])
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function isQuotaFout(fout: unknown): boolean {
  if (!fout || typeof fout !== 'object') return false
  const naam = (fout as { name?: unknown }).name
  return naam === 'QuotaExceededError' || naam === 'NS_ERROR_DOM_QUOTA_REACHED'
}

async function metDb<T>(werk: (db: IDBDatabase) => Promise<T>, bijFout: () => T): Promise<T> {
  if (!ondersteund()) return bijFout()
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    return bijFout()
  }
  try {
    return await werk(db)
  } catch {
    return bijFout()
  } finally {
    db.close()
  }
}

function verzoek<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Mutatie plus bestand in één transactie. Eén transactie omdat een mutatie
 * zonder zijn foto niets waard is: half opslaan zou een rij opleveren die
 * eeuwig faalt.
 */
export async function mutatieOpslaan(mutatie: Mutatie, bestand: Blob | null): Promise<void> {
  if (!ondersteund()) throw new WachtrijVolFout()
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_MUTATIES, STORE_BLOBS], 'readwrite')
      tx.objectStore(STORE_MUTATIES).put(mutatie)
      if (bestand) tx.objectStore(STORE_BLOBS).put({ id: mutatie.id, bestand })
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
      tx.onerror = () => reject(tx.error)
    })
  } catch (fout) {
    // Een volle telefoon mag niet stil mislukken: beter een monteur die weet
    // dat het niet gelukt is dan een monteur die denkt van wel.
    if (isQuotaFout(fout)) throw new WachtrijVolFout()
    throw fout
  } finally {
    db.close()
  }
}

export async function mutatieBijwerken(
  id: string,
  wijziging: Partial<Mutatie>,
): Promise<Mutatie | null> {
  return metDb(async (db) => {
    return await new Promise<Mutatie | null>((resolve, reject) => {
      const tx = db.transaction(STORE_MUTATIES, 'readwrite')
      const store = tx.objectStore(STORE_MUTATIES)
      const lees = store.get(id)
      let bijgewerkt: Mutatie | null = null
      lees.onsuccess = () => {
        const huidig = lees.result as Mutatie | undefined
        if (!huidig) return
        bijgewerkt = { ...huidig, ...wijziging, id: huidig.id }
        store.put(bijgewerkt)
      }
      tx.oncomplete = () => resolve(bijgewerkt)
      tx.onabort = () => reject(tx.error)
      tx.onerror = () => reject(tx.error)
    })
  }, () => null)
}

export async function alleMutaties(eigenaar?: string): Promise<Mutatie[]> {
  const rijen = await metDb<Mutatie[]>(
    async (db) => {
      const tx = db.transaction(STORE_MUTATIES, 'readonly')
      const alles = await verzoek(tx.objectStore(STORE_MUTATIES).getAll())
      return (alles as Mutatie[]) || []
    },
    () => [],
  )
  const gefilterd = eigenaar ? rijen.filter((m) => m.eigenaar === eigenaar) : rijen
  return gefilterd.sort((a, b) => a.aangemaakt - b.aangemaakt)
}

export async function mutatiesVoor(soort: MutatieSoort, entiteitId: string): Promise<Mutatie[]> {
  return metDb<Mutatie[]>(
    async (db) => {
      const tx = db.transaction(STORE_MUTATIES, 'readonly')
      const index = tx.objectStore(STORE_MUTATIES).index('op_entiteit')
      const rijen = await verzoek(index.getAll([soort, entiteitId]))
      return ((rijen as Mutatie[]) || []).sort((a, b) => a.aangemaakt - b.aangemaakt)
    },
    () => [],
  )
}

export async function blobVan(id: string): Promise<Blob | null> {
  return metDb<Blob | null>(
    async (db) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly')
      const rij = await verzoek(tx.objectStore(STORE_BLOBS).get(id))
      return (rij as { bestand?: Blob } | undefined)?.bestand ?? null
    },
    () => null,
  )
}

export async function mutatieVerwijderen(id: string): Promise<void> {
  await metDb<void>(
    async (db) => {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_MUTATIES, STORE_BLOBS], 'readwrite')
        tx.objectStore(STORE_MUTATIES).delete(id)
        tx.objectStore(STORE_BLOBS).delete(id)
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error)
        tx.onerror = () => reject(tx.error)
      })
    },
    () => undefined,
  )
}

export async function mutatiesTellen(eigenaar?: string): Promise<number> {
  return (await alleMutaties(eigenaar)).length
}
