// Persistente maillijst-cache in IndexedDB, zodat de lijst er meteen staat.
//
// De in-memory cache (queryCache) blijft leeg zodra de telefoon het tabblad
// weggooit, en dat is op mobiel de regel. De eerste lijstquery kost koud vier
// tot zes seconden — precies de tijd dat je naar een skeleton kijkt. Hier
// bewaren we het laatste antwoord op het toestel en tonen dat direct, terwijl
// de verse lijst op de achtergrond binnenkomt.
//
// Wat queryCache bewust niet doet — data van schijf laten lekken tussen
// gebruikers of organisaties — geldt hier onverkort. Vandaar:
//   · elke rij hoort bij een eigenaar-sleutel (user-id + organisatie-id)
//   · een andere eigenaar leest niets: de sleutel matcht niet
//   · wisMailCache() gooit alles weg bij logout en bij org-wissel
//
// Faalt IndexedDB (privémodus, quota vol), dan gedraagt alles zich als
// voorheen: geen cache, gewoon wachten op het netwerk.

const DB_NAAM = 'doen-mail'
const DB_VERSIE = 1
const STORE = 'lijsten'
// Ouder dan dit tonen we niet meer: dan is het sneller om te wachten dan om
// eerst een verouderde inbox te tonen die meteen omspringt.
const MAX_LEEFTIJD_MS = 7 * 24 * 60 * 60 * 1000

interface CacheRij<T> {
  sleutel: string
  eigenaar: string
  opgeslagenOp: number
  waarde: T
}

let dbBelofte: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbBelofte) return dbBelofte
  dbBelofte = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const verzoek = indexedDB.open(DB_NAAM, DB_VERSIE)
      verzoek.onupgradeneeded = () => {
        const db = verzoek.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'sleutel' })
        }
      }
      verzoek.onsuccess = () => resolve(verzoek.result)
      verzoek.onerror = () => resolve(null)
      verzoek.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbBelofte
}

/** user-id + organisatie-id samen: wisselt er één, dan matcht de rij niet meer. */
export function maakEigenaarSleutel(userId?: string | null, organisatieId?: string | null): string {
  return `${userId || 'anoniem'}:${organisatieId || 'geen-org'}`
}

export async function leesMailCache<T>(sleutel: string, eigenaar: string): Promise<T | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const verzoek = tx.objectStore(STORE).get(sleutel)
      verzoek.onsuccess = () => {
        const rij = verzoek.result as CacheRij<T> | undefined
        if (!rij || rij.eigenaar !== eigenaar) return resolve(null)
        if (Date.now() - rij.opgeslagenOp > MAX_LEEFTIJD_MS) return resolve(null)
        resolve(rij.waarde)
      }
      verzoek.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function schrijfMailCache<T>(sleutel: string, eigenaar: string, waarde: T): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ sleutel, eigenaar, opgeslagenOp: Date.now(), waarde } satisfies CacheRij<T>)
  } catch {
    // Quota vol of store weg: de app draait gewoon door zonder cache.
  }
}

/** Aanroepen bij logout en bij org-wissel, samen met clearQueryCache(). */
export async function wisMailCache(): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
  } catch {
    // Niets te wissen of geen toegang; dan valt er ook niets te lekken.
  }
}
