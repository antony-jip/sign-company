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
const DB_VERSIE = 2
const STORE = 'lijsten'
// Berichtteksten, los van de lijst. Zonder deze store begon de body-cache leeg
// zodra de telefoon het tabblad weggooide, en kostte élke mail opnieuw een
// netwerkronde. Nu is een eerder geziene of voorgeladen mail meteen open.
const STORE_BODIES = 'bodies'
// Ouder dan dit tonen we niet meer: dan is het sneller om te wachten dan om
// eerst een verouderde inbox te tonen die meteen omspringt.
const MAX_LEEFTIJD_MS = 7 * 24 * 60 * 60 * 1000
// Bovengrenzen tegen een cache die het toestel volloopt. Eén mail met inline
// beeld kan megabytes zijn; die slaan we over, want hem opnieuw ophalen is
// goedkoper dan er de rest van de inbox voor weg te gooien.
const MAX_BODIES = 250
const MAX_BODY_BYTES = 500 * 1024

interface CacheRij<T> {
  sleutel: string
  eigenaar: string
  opgeslagenOp: number
  waarde: T
}

export interface BewaardeBody {
  id: string
  eigenaar: string
  opgeslagenOp: number
  html: string
  bijlagen?: unknown[]
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
        if (!db.objectStoreNames.contains(STORE_BODIES)) {
          const store = db.createObjectStore(STORE_BODIES, { keyPath: 'id' })
          // Snoeien loopt over deze index, oudste eerst.
          store.createIndex('opgeslagenOp', 'opgeslagenOp')
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

/**
 * Haalt bewaarde berichtteksten op voor een reeks id's. Eén transactie voor de
 * hele set · dat is het verschil tussen een mail die openklapt en een mail die
 * eerst nog even naar de server moet.
 */
export async function leesBodies(
  ids: string[],
  eigenaar: string,
): Promise<Map<string, BewaardeBody>> {
  const gevonden = new Map<string, BewaardeBody>()
  if (ids.length === 0) return gevonden
  const db = await openDb()
  if (!db) return gevonden
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_BODIES, 'readonly')
      const store = tx.objectStore(STORE_BODIES)
      const grens = Date.now() - MAX_LEEFTIJD_MS
      for (const id of ids) {
        const verzoek = store.get(id)
        verzoek.onsuccess = () => {
          const rij = verzoek.result as BewaardeBody | undefined
          if (!rij || rij.eigenaar !== eigenaar) return
          if (rij.opgeslagenOp < grens) return
          gevonden.set(id, rij)
        }
      }
      tx.oncomplete = () => resolve(gevonden)
      tx.onerror = () => resolve(gevonden)
      tx.onabort = () => resolve(gevonden)
    } catch {
      resolve(gevonden)
    }
  })
}

export async function bewaarBodies(
  rijen: Array<{ id: string; html: string; bijlagen?: unknown[] }>,
  eigenaar: string,
): Promise<void> {
  if (rijen.length === 0) return
  const db = await openDb()
  if (!db) return
  const opgeslagenOp = Date.now()
  try {
    const tx = db.transaction(STORE_BODIES, 'readwrite')
    const store = tx.objectStore(STORE_BODIES)
    for (const rij of rijen) {
      if (!rij.html || rij.html.length > MAX_BODY_BYTES) continue
      store.put({ id: rij.id, eigenaar, opgeslagenOp, html: rij.html, bijlagen: rij.bijlagen } satisfies BewaardeBody)
    }
    tx.oncomplete = () => { void snoeiBodies() }
  } catch {
    // Quota vol of store weg: de app draait door, alleen zonder voorsprong.
  }
}

/** Houdt de store onder MAX_BODIES door de oudste rijen te laten vallen. */
async function snoeiBodies(): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE_BODIES, 'readwrite')
    const store = tx.objectStore(STORE_BODIES)
    const telling = store.count()
    telling.onsuccess = () => {
      let teveel = telling.result - MAX_BODIES
      if (teveel <= 0) return
      const cursor = store.index('opgeslagenOp').openCursor()
      cursor.onsuccess = () => {
        const c = cursor.result
        if (!c || teveel <= 0) return
        c.delete()
        teveel -= 1
        c.continue()
      }
    }
  } catch {
    // Niet kunnen snoeien is geen fout die de gebruiker mag merken.
  }
}

/** Aanroepen bij logout en bij org-wissel, samen met clearQueryCache(). */
export async function wisMailCache(): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction([STORE, STORE_BODIES], 'readwrite')
    tx.objectStore(STORE).clear()
    tx.objectStore(STORE_BODIES).clear()
  } catch {
    // Niets te wissen of geen toegang; dan valt er ook niets te lekken.
  }
}
