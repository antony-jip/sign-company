import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import {
  installeerFakeIndexedDB, verwijderFakeIndexedDB, resetFakeIndexedDB, laatSchrijvenFalen,
} from '../helpers/fakeIndexedDB'
import {
  mutatieOpslaan, mutatieBijwerken, mutatieVerwijderen, alleMutaties, mutatiesVoor,
  mutatiesTellen, blobVan, maakEigenaarSleutel, WachtrijVolFout, type Mutatie,
} from '@/utils/offlineMutatieStore'

installeerFakeIndexedDB()
beforeEach(() => resetFakeIndexedDB())
afterAll(() => verwijderFakeIndexedDB())

const eigenaar = maakEigenaarSleutel('gebruiker-1', 'org-1')

function maakMutatie(over: Partial<Mutatie> = {}): Mutatie {
  return {
    id: 'm1',
    soort: 'werkbon_foto',
    entiteitId: 'wb-1',
    eigenaar,
    payload: { storagePad: 'werkbon-fotos/wb-1/m1-dak.jpg', bestandsnaam: 'dak.jpg' },
    gewijzigdeVelden: [],
    basisVersie: null,
    heeftBlob: true,
    aangemaakt: 1_000,
    pogingen: 0,
    laatsteFout: null,
    foutSoort: null,
    status: 'wachtend',
    ...over,
  }
}

const nepBlob = { size: 1234, type: 'image/jpeg' } as unknown as Blob

describe('offlineMutatieStore · persistentie', () => {
  it('bewaart een mutatie met bestand en geeft hem terug', async () => {
    await mutatieOpslaan(maakMutatie(), nepBlob)
    const rijen = await alleMutaties(eigenaar)
    expect(rijen).toHaveLength(1)
    expect(rijen[0].payload.storagePad).toBe('werkbon-fotos/wb-1/m1-dak.jpg')
    expect(await blobVan('m1')).toBe(nepBlob)
  })

  it('overleeft een herstart · een tweede open leest dezelfde rijen', async () => {
    await mutatieOpslaan(maakMutatie(), nepBlob)
    // Elke aanroep opent en sluit een eigen verbinding, dus dit is precies wat
    // een nieuwe paginalading doet.
    expect(await mutatiesTellen(eigenaar)).toBe(1)
    expect(await mutatiesTellen(eigenaar)).toBe(1)
  })

  it('werkt een bestaande mutatie bij zonder de rest te verliezen', async () => {
    await mutatieOpslaan(maakMutatie(), nepBlob)
    const bijgewerkt = await mutatieBijwerken('m1', { pogingen: 3, status: 'vast', foutSoort: 'rechten' })
    expect(bijgewerkt?.pogingen).toBe(3)
    const rijen = await alleMutaties(eigenaar)
    expect(rijen[0].status).toBe('vast')
    expect(rijen[0].entiteitId).toBe('wb-1')
    expect(await blobVan('m1')).toBe(nepBlob)
  })

  it('doet niets bij het bijwerken van een onbekende mutatie', async () => {
    expect(await mutatieBijwerken('bestaat-niet', { status: 'vast' })).toBeNull()
    expect(await mutatiesTellen(eigenaar)).toBe(0)
  })

  it('verwijdert mutatie én bestand', async () => {
    await mutatieOpslaan(maakMutatie(), nepBlob)
    await mutatieVerwijderen('m1')
    expect(await alleMutaties(eigenaar)).toEqual([])
    expect(await blobVan('m1')).toBeNull()
  })

  it('houdt de wachtrij van een andere eigenaar buiten beeld', async () => {
    await mutatieOpslaan(maakMutatie(), nepBlob)
    await mutatieOpslaan(maakMutatie({ id: 'm2', eigenaar: maakEigenaarSleutel('gebruiker-2', 'org-2') }), nepBlob)
    expect(await alleMutaties(eigenaar)).toHaveLength(1)
    // Wel bewaren, niet tonen: uitloggen mag geen foto's weggooien.
    expect(await alleMutaties()).toHaveLength(2)
  })

  it('geeft FIFO terug, oudste eerst', async () => {
    await mutatieOpslaan(maakMutatie({ id: 'laat', aangemaakt: 5_000 }), nepBlob)
    await mutatieOpslaan(maakMutatie({ id: 'vroeg', aangemaakt: 1_000 }), nepBlob)
    expect((await alleMutaties(eigenaar)).map((m) => m.id)).toEqual(['vroeg', 'laat'])
  })

  it('vindt mutaties per entiteit via de index', async () => {
    await mutatieOpslaan(maakMutatie({ id: 'a', entiteitId: 'wb-1' }), nepBlob)
    await mutatieOpslaan(maakMutatie({ id: 'b', entiteitId: 'wb-2' }), nepBlob)
    expect((await mutatiesVoor('werkbon_foto', 'wb-2')).map((m) => m.id)).toEqual(['b'])
  })

  it('doet geen werk bij een lege wachtrij', async () => {
    expect(await alleMutaties(eigenaar)).toEqual([])
    expect(await mutatiesTellen(eigenaar)).toBe(0)
    expect(await blobVan('wat-dan-ook')).toBeNull()
    // Verwijderen van iets dat er niet is mag geen fout geven.
    await expect(mutatieVerwijderen('niets')).resolves.toBeUndefined()
  })

  it('meldt een volle telefoon in plaats van stil te falen', async () => {
    laatSchrijvenFalen('quota')
    await expect(mutatieOpslaan(maakMutatie(), nepBlob)).rejects.toBeInstanceOf(WachtrijVolFout)
    expect(await mutatiesTellen(eigenaar)).toBe(0)
  })

  it('leest zacht als IndexedDB helemaal ontbreekt', async () => {
    verwijderFakeIndexedDB()
    expect(await alleMutaties(eigenaar)).toEqual([])
    expect(await blobVan('m1')).toBeNull()
    expect(await mutatieBijwerken('m1', { status: 'vast' })).toBeNull()
    installeerFakeIndexedDB()
  })
})

describe('maakEigenaarSleutel', () => {
  it('scheidt gebruiker en organisatie, ook als er niets is', () => {
    expect(maakEigenaarSleutel('u', 'o')).toBe('u:o')
    expect(maakEigenaarSleutel(null, null)).toBe('geen:geen')
    expect(maakEigenaarSleutel('u', 'o')).not.toBe(maakEigenaarSleutel('u', 'o2'))
  })
})

// Zonder dit zou een falende test blijven hangen op een niet-afgeronde
// transactie in plaats van te falen.
vi.setConfig({ testTimeout: 5_000 })
