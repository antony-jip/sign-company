import type { MaatjeAnnotatie } from '@/types'

/**
 * Offline-wachtrij voor maatjes. Op de bouwplaats is het signaal vaak zwak;
 * mislukt de upload, dan bewaren we de gecomprimeerde foto + render + annotaties
 * lokaal in IndexedDB (Blobs mogen daar in) en uploaden we zodra er weer
 * verbinding is. localStorage kan geen Blobs van honderden KB's aan, IndexedDB wel.
 */

const DB_NAAM = 'doen_maatjes'
const STORE = 'wachtrij'

export interface WachtrijItem {
  id: string
  titel: string | null
  annotaties: MaatjeAnnotatie[]
  origineel: Blob
  render: Blob
  aangemaakt: number
}

function ondersteund(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAAM, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function wachtrijToevoegen(item: WachtrijItem): Promise<void> {
  if (!ondersteund()) throw new Error('IndexedDB niet beschikbaar')
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function wachtrijAlles(): Promise<WachtrijItem[]> {
  if (!ondersteund()) return []
  let db: IDBDatabase
  try {
    db = await openDb()
  } catch {
    return []
  }
  try {
    return await new Promise<WachtrijItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve((req.result as WachtrijItem[]) || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  } finally {
    db.close()
  }
}

export async function wachtrijVerwijderen(id: string): Promise<void> {
  if (!ondersteund()) return
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
