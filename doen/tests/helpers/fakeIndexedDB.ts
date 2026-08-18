/**
 * Minimale IndexedDB in het geheugen. Genoeg om `offlineMutatieStore.ts` echt
 * te draaien: open + upgrade, twee stores met keyPath, samengestelde index,
 * put/get/getAll/delete en een transactie die zijn `oncomplete` pas na alle
 * verzoeken vuurt.
 *
 * Met de hand geschreven omdat er geen npm-packages bij mogen (`fake-indexeddb`
 * zou dit werk doen). Alleen wat de store gebruikt zit erin; alles daarbuiten
 * gooit expres, zodat een test niet stil langs een gat heen loopt.
 */

type Sleutel = string
type Rij = Record<string, unknown>

interface IndexDefinitie {
  naam: string
  keyPath: string[]
}

class FakeStore {
  rijen = new Map<Sleutel, Rij>()
  indexen: IndexDefinitie[] = []
  constructor(public naam: string, public keyPath: string) {}
}

class FakeDatabase {
  stores = new Map<string, FakeStore>()
  versie = 0
}

const databases = new Map<string, FakeDatabase>()

export function resetFakeIndexedDB(): void {
  databases.clear()
  faalVolgendeSchrijf = null
}

let faalVolgendeSchrijf: 'quota' | 'onbekend' | null = null

/** Laat de eerstvolgende schrijftransactie afbreken, zoals een volle telefoon. */
export function laatSchrijvenFalen(soort: 'quota' | 'onbekend' = 'quota'): void {
  faalVolgendeSchrijf = soort
}

function later(fn: () => void): void {
  queueMicrotask(fn)
}

function maakVerzoek<T>(): { req: Record<string, unknown>; klaar: (waarde: T) => void } {
  const req: Record<string, unknown> = { onsuccess: null, onerror: null, result: undefined }
  return {
    req,
    klaar: (waarde: T) => {
      req.result = waarde
      const cb = req.onsuccess as ((e: unknown) => void) | null
      if (cb) cb({ target: req })
    },
  }
}

function sleutelVan(rij: Rij, keyPath: string): Sleutel {
  return String(rij[keyPath])
}

function indexSleutel(waarden: unknown[]): string {
  return JSON.stringify(waarden)
}

class FakeTransactie {
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  error: unknown = null
  private openstaand = 0
  private afgebroken = false
  private afgerond = false

  constructor(private db: FakeDatabase, private modus: string) {
    // Een lege transactie moet ook afronden.
    later(() => this.probeerAfronden())
  }

  private probeerAfronden(): void {
    if (this.afgerond || this.afgebroken) return
    if (this.openstaand > 0) return
    this.afgerond = true
    this.oncomplete?.()
  }

  private breekAf(fout: unknown): void {
    if (this.afgebroken) return
    this.afgebroken = true
    this.error = fout
    this.onerror?.()
    this.onabort?.()
  }

  objectStore(naam: string): Record<string, unknown> {
    const store = this.db.stores.get(naam)
    if (!store) throw new Error(`Onbekende store ${naam}`)
    const tx = this

    const werk = <T>(fn: () => T) => {
      const { req, klaar } = maakVerzoek<T>()
      tx.openstaand++
      later(() => {
        tx.openstaand--
        if (tx.afgebroken) return
        try {
          const waarde = fn()
          klaar(waarde)
        } catch (fout) {
          const cb = req.onerror as ((e: unknown) => void) | null
          if (cb) cb({ target: req })
          tx.breekAf(fout)
          return
        }
        tx.probeerAfronden()
      })
      return req
    }

    return {
      put: (rij: Rij) => werk(() => {
        if (tx.modus !== 'readwrite') throw new Error('readonly transactie')
        if (faalVolgendeSchrijf) {
          const soort = faalVolgendeSchrijf
          faalVolgendeSchrijf = null
          const fout = new Error('opslag vol')
          fout.name = soort === 'quota' ? 'QuotaExceededError' : 'UnknownError'
          throw fout
        }
        const sleutel = sleutelVan(rij, store.keyPath)
        store.rijen.set(sleutel, structuurKopie(rij))
        return sleutel
      }),
      get: (sleutel: Sleutel) => werk(() => {
        const rij = store.rijen.get(String(sleutel))
        return rij ? structuurKopie(rij) : undefined
      }),
      getAll: () => werk(() => [...store.rijen.values()].map(structuurKopie)),
      delete: (sleutel: Sleutel) => werk(() => {
        if (tx.modus !== 'readwrite') throw new Error('readonly transactie')
        store.rijen.delete(String(sleutel))
        return undefined
      }),
      count: () => werk(() => store.rijen.size),
      index: (naam: string) => {
        const def = store.indexen.find((i) => i.naam === naam)
        if (!def) throw new Error(`Onbekende index ${naam}`)
        return {
          getAll: (sleutel: unknown[]) => werk(() => {
            const gezocht = indexSleutel(sleutel)
            return [...store.rijen.values()]
              .filter((rij) => indexSleutel(def.keyPath.map((p) => rij[p])) === gezocht)
              .map(structuurKopie)
          }),
        }
      },
    }
  }
}

// Blobs overleven een structuredClone-achtige kopie niet in Node zonder extra
// werk, dus kopiëren we ondiep: goed genoeg om te bewijzen dat de store de
// referentie bewaart en teruggeeft.
function structuurKopie(rij: Rij): Rij {
  return { ...rij }
}

class FakeDatabaseHandle {
  constructor(private naam: string, private db: FakeDatabase) {}
  get objectStoreNames() {
    const namen = [...this.db.stores.keys()]
    return { contains: (n: string) => namen.includes(n) }
  }
  createObjectStore(naam: string, opties: { keyPath: string }) {
    const store = new FakeStore(naam, opties.keyPath)
    this.db.stores.set(naam, store)
    return {
      createIndex: (indexNaam: string, keyPath: string[]) => {
        store.indexen.push({ naam: indexNaam, keyPath })
      },
    }
  }
  transaction(namen: string | string[], modus = 'readonly') {
    const lijst = Array.isArray(namen) ? namen : [namen]
    for (const n of lijst) {
      if (!this.db.stores.has(n)) throw new Error(`Onbekende store ${n}`)
    }
    return new FakeTransactie(this.db, modus)
  }
  close() { /* geen verbindingen om te sluiten */ }
}

export function installeerFakeIndexedDB(): void {
  const factory = {
    open(naam: string, versie: number) {
      const req: Record<string, unknown> = {
        onsuccess: null, onerror: null, onupgradeneeded: null, result: undefined, error: null,
      }
      later(() => {
        let db = databases.get(naam)
        if (!db) {
          db = new FakeDatabase()
          databases.set(naam, db)
        }
        const handle = new FakeDatabaseHandle(naam, db)
        req.result = handle
        if (versie > db.versie) {
          db.versie = versie
          const upgrade = req.onupgradeneeded as (() => void) | null
          if (upgrade) upgrade()
        }
        const succes = req.onsuccess as (() => void) | null
        if (succes) succes()
      })
      return req
    },
  }
  ;(globalThis as unknown as { indexedDB: unknown }).indexedDB = factory
}

export function verwijderFakeIndexedDB(): void {
  delete (globalThis as unknown as { indexedDB?: unknown }).indexedDB
}
