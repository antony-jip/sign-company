import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import {
  installeerFakeIndexedDB, verwijderFakeIndexedDB, resetFakeIndexedDB,
} from '../helpers/fakeIndexedDB'

const nepWerkbon = vi.fn()
const nepFotos = vi.fn()
const nepCreate = vi.fn()
const nepUpload = vi.fn()

vi.mock('@/services/werkbonService', () => ({
  getWerkbon: (...args: unknown[]) => nepWerkbon(...args),
  getWerkbonFotos: (...args: unknown[]) => nepFotos(...args),
  createWerkbonFoto: (...args: unknown[]) => nepCreate(...args),
}))
vi.mock('@/services/storageService', () => ({
  uploadFile: (...args: unknown[]) => nepUpload(...args),
}))

const {
  fotoInWachtrij, flushFotoWachtrij, fotoMutaties, fotoOpnieuwProberen, fotoUitWachtrij,
  bouwStoragePad,
} = await import('@/utils/werkbonFotoWachtrij')
const { MAX_POGINGEN } = await import('@/utils/offlineWachtrijRegels')

installeerFakeIndexedDB()
afterAll(() => verwijderFakeIndexedDB())

const eigenaar = 'gebruiker-1:org-1'
const nepBlob = { size: 999, type: 'image/jpeg' } as unknown as Blob

function postgrestNetwerkfout() {
  return { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' }
}

function storageFout(status: number) {
  const fout = new Error(`HTTP ${status}`) as Error & { __isStorageError: boolean; status: number }
  fout.__isStorageError = true
  fout.name = 'StorageApiError'
  fout.status = status
  return fout
}

async function zetFotoInWachtrij() {
  return fotoInWachtrij({
    werkbonId: 'wb-1',
    eigenaar,
    type: 'na',
    bestandsnaam: 'dak.jpg',
    bestand: nepBlob,
    verkleind: true,
  })
}

beforeEach(() => {
  resetFakeIndexedDB()
  nepWerkbon.mockReset().mockResolvedValue({ id: 'wb-1', status: 'definitief' })
  nepFotos.mockReset().mockResolvedValue([])
  nepCreate.mockReset().mockResolvedValue({ id: 'foto-1' })
  nepUpload.mockReset().mockImplementation(async (_bestand: unknown, pad: string) => pad)
})

describe('werkbonFotoWachtrij · versturen', () => {
  it('doet geen enkel verzoek bij een lege wachtrij', async () => {
    const resultaat = await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(resultaat).toEqual({ verstuurd: 0, vast: 0, wachtend: 0 })
    expect(nepWerkbon).not.toHaveBeenCalled()
    expect(nepUpload).not.toHaveBeenCalled()
  })

  it('uploadt, inserteert en ruimt de mutatie daarna op', async () => {
    const mutatie = await zetFotoInWachtrij()
    const resultaat = await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(resultaat.verstuurd).toBe(1)
    expect(nepUpload).toHaveBeenCalledTimes(1)
    expect(nepCreate).toHaveBeenCalledWith(expect.objectContaining({
      werkbon_id: 'wb-1', type: 'na', url: mutatie.payload.storagePad,
    }))
    // Pas ná bevestiging verdwijnt hij uit de wachtrij.
    expect(await fotoMutaties(eigenaar)).toEqual([])
  })

  it('gebruikt een pad dat over pogingen heen gelijk blijft', async () => {
    const mutatie = await zetFotoInWachtrij()
    expect(mutatie.payload.storagePad).toBe(bouwStoragePad('wb-1', mutatie.id, 'dak.jpg'))
    nepUpload.mockRejectedValueOnce(postgrestNetwerkfout())
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    const paden = nepUpload.mock.calls.map((c) => c[1])
    expect(paden[0]).toBe(paden[1])
  })

  it('ziet een dubbele upload als "al aangekomen" en inserteert niet twee keer', async () => {
    await zetFotoInWachtrij()
    // Het pad bestaat al in storage (409) en de rij staat er ook al: dit is de
    // tweede poging nadat de bevestiging van de eerste verloren ging.
    nepUpload.mockRejectedValue(storageFout(409))
    nepFotos.mockImplementation(async () => [{ url: (await fotoMutaties(eigenaar))[0]?.payload.storagePad }])
    const resultaat = await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(resultaat.verstuurd).toBe(1)
    expect(nepCreate).not.toHaveBeenCalled()
    expect(await fotoMutaties(eigenaar)).toEqual([])
  })
})

describe('werkbonFotoWachtrij · permanent falen', () => {
  it('houdt een netwerkfout in de wachtrij en telt de poging', async () => {
    await zetFotoInWachtrij()
    nepUpload.mockRejectedValue(postgrestNetwerkfout())
    const resultaat = await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(resultaat.wachtend).toBe(1)
    const [mutatie] = await fotoMutaties(eigenaar)
    expect(mutatie.status).toBe('wachtend')
    expect(mutatie.pogingen).toBe(1)
    expect(mutatie.foutSoort).toBe('netwerk')
  })

  it('loopt na het maximum aantal pogingen vast, met de foto nog op het toestel', async () => {
    await zetFotoInWachtrij()
    nepUpload.mockRejectedValue(postgrestNetwerkfout())
    for (let i = 0; i < MAX_POGINGEN; i++) await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    const [mutatie] = await fotoMutaties(eigenaar)
    expect(mutatie.status).toBe('vast')
    expect(mutatie.pogingen).toBe(MAX_POGINGEN)
    // Nooit automatisch weggooien: de telefoon heeft de enige kopie.
    expect(await fotoMutaties(eigenaar)).toHaveLength(1)
  })

  it('slaat een vastgelopen mutatie in volgende rondes over', async () => {
    await zetFotoInWachtrij()
    nepUpload.mockRejectedValue(storageFout(403))
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect((await fotoMutaties(eigenaar))[0].status).toBe('vast')
    nepUpload.mockClear()
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(nepUpload).not.toHaveBeenCalled()
  })

  it('loopt bij een RLS-weigering direct vast, zonder tweede poging', async () => {
    await zetFotoInWachtrij()
    nepCreate.mockRejectedValue({ message: 'new row violates row-level security policy', code: '42501' })
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    const [mutatie] = await fotoMutaties(eigenaar)
    expect(mutatie.status).toBe('vast')
    expect(mutatie.foutSoort).toBe('rechten')
    expect(mutatie.pogingen).toBe(1)
  })

  it('geeft de gebruiker een uitweg: opnieuw proberen zet de teller terug', async () => {
    await zetFotoInWachtrij()
    nepUpload.mockRejectedValue(storageFout(413))
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    const [vast] = await fotoMutaties(eigenaar)
    expect(vast.status).toBe('vast')

    await fotoOpnieuwProberen(vast.id)
    const [opnieuw] = await fotoMutaties(eigenaar)
    expect(opnieuw.status).toBe('wachtend')
    expect(opnieuw.pogingen).toBe(0)
    expect(opnieuw.foutSoort).toBeNull()

    nepUpload.mockImplementation(async (_b: unknown, pad: string) => pad)
    expect((await flushFotoWachtrij(eigenaar, 'gebruiker-1')).verstuurd).toBe(1)
  })

  it('geeft de gebruiker de andere uitweg: zelf weggooien', async () => {
    const mutatie = await zetFotoInWachtrij()
    await fotoUitWachtrij(mutatie.id)
    expect(await fotoMutaties(eigenaar)).toEqual([])
  })

  it('breekt de ronde af bij een netwerkfout maar houdt de rest wachtend', async () => {
    await zetFotoInWachtrij()
    await zetFotoInWachtrij()
    nepUpload.mockRejectedValue(postgrestNetwerkfout())
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(nepUpload).toHaveBeenCalledTimes(1)
    const mutaties = await fotoMutaties(eigenaar)
    expect(mutaties).toHaveLength(2)
    expect(mutaties.every((m) => m.status === 'wachtend')).toBe(true)
  })

  it('laat één rot item de rest niet blokkeren', async () => {
    // Dit is precies wat de `break` in MaatjeKladblok.tsx:126 vandaag fout doet.
    const eerste = await zetFotoInWachtrij()
    await zetFotoInWachtrij()
    nepUpload.mockImplementation(async (_b: unknown, pad: string) => {
      if (pad === eerste.payload.storagePad) throw storageFout(413)
      return pad
    })
    const resultaat = await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(resultaat.vast).toBe(1)
    expect(resultaat.verstuurd).toBe(1)
    expect(await fotoMutaties(eigenaar)).toHaveLength(1)
  })
})

describe('werkbonFotoWachtrij · conflict', () => {
  it('laat een foto op een afgeronde werkbon door', async () => {
    await zetFotoInWachtrij()
    nepWerkbon.mockResolvedValue({ id: 'wb-1', status: 'afgerond' })
    expect((await flushFotoWachtrij(eigenaar, 'gebruiker-1')).verstuurd).toBe(1)
  })

  it('houdt een foto tegen zodra de werkbon gefactureerd is, en bewaart hem', async () => {
    await zetFotoInWachtrij()
    nepWerkbon.mockResolvedValue({ id: 'wb-1', status: 'gefactureerd' })
    const resultaat = await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    expect(resultaat.vast).toBe(1)
    expect(nepUpload).not.toHaveBeenCalled()
    const [mutatie] = await fotoMutaties(eigenaar)
    expect(mutatie.status).toBe('vast')
    expect(mutatie.foutSoort).toBe('conflict')
    expect(mutatie.laatsteFout).toContain('gefactureerd')
  })

  it('loopt vast als de werkbon niet meer bestaat', async () => {
    await zetFotoInWachtrij()
    nepWerkbon.mockResolvedValue(null)
    await flushFotoWachtrij(eigenaar, 'gebruiker-1')
    const [mutatie] = await fotoMutaties(eigenaar)
    expect(mutatie.foutSoort).toBe('weg')
    expect(mutatie.status).toBe('vast')
  })
})
