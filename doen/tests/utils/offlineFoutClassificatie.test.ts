import { describe, it, expect } from 'vitest'
import {
  classificeerFout, magOpnieuwProberen, hoortInWachtrij, soortVoorStatus,
} from '@/utils/offlineFoutClassificatie'

// De vormen hieronder zijn overgenomen uit de geïnstalleerde clients, niet
// verzonnen:
//
//   @supabase/postgrest-js/src/PostgrestBuilder.ts — bij een mislukte fetch
//   wordt error = { message: `${name}: ${message}`, details, hint: '', code: '' }
//   met status 0. Services doen `if (error) throw error`, dus alleen dat
//   object komt bij ons aan: géén status, en een LEGE code.
//
//   @supabase/storage-js/src/lib/common/fetch.ts — een antwoord geeft
//   StorageApiError (numerieke status), een mislukte fetch geeft
//   StorageUnknownError (geen status). Beide dragen __isStorageError.

function postgrestNetwerkfout() {
  return {
    message: 'TypeError: Failed to fetch',
    details: 'TypeError: Failed to fetch\n    at eval (...)',
    hint: '',
    code: '',
  }
}

function postgrestFout(code: string, message = 'iets ging mis') {
  return { message, details: '', hint: '', code }
}

function storageFout(status?: number) {
  const fout = new Error(status ? `HTTP ${status}` : 'Failed to fetch') as Error & {
    __isStorageError: boolean
    status?: number
    statusCode?: string
  }
  fout.__isStorageError = true
  fout.name = status ? 'StorageApiError' : 'StorageUnknownError'
  if (status) {
    fout.status = status
    fout.statusCode = String(status)
  }
  return fout
}

describe('classificeerFout · netwerk versus serverweigering', () => {
  it('ziet een mislukte fetch van postgrest-js aan de lege code', () => {
    expect(classificeerFout(postgrestNetwerkfout())).toBe('netwerk')
  })

  it('ziet een kale TypeError van fetch', () => {
    expect(classificeerFout(new TypeError('Failed to fetch'))).toBe('netwerk')
    expect(classificeerFout(new TypeError('Load failed'))).toBe('netwerk')
    expect(classificeerFout(new TypeError('NetworkError when attempting to fetch resource'))).toBe('netwerk')
  })

  it('ziet een afgebroken verzoek als netwerk', () => {
    const fout = new Error('The operation was aborted')
    fout.name = 'AbortError'
    expect(classificeerFout(fout)).toBe('netwerk')
  })

  it('ziet een mislukte storage-upload zonder status als netwerk', () => {
    expect(classificeerFout(storageFout())).toBe('netwerk')
  })

  it('noemt een RLS-weigering rechten en probeert die nooit opnieuw', () => {
    const rls = postgrestFout('42501', 'new row violates row-level security policy for table "werkbon_fotos"')
    expect(classificeerFout(rls)).toBe('rechten')
    expect(magOpnieuwProberen(classificeerFout(rls))).toBe(false)
  })

  it('noemt 403 van storage rechten', () => {
    expect(classificeerFout(storageFout(403))).toBe('rechten')
  })

  it('noemt een 400 en een 413 geweigerd, niet netwerk', () => {
    expect(classificeerFout(storageFout(400))).toBe('geweigerd')
    expect(classificeerFout(storageFout(413))).toBe('geweigerd')
    expect(magOpnieuwProberen('geweigerd')).toBe(false)
  })

  it('noemt een 409 conflict · dat is het pad dat een dubbele upload opvangt', () => {
    expect(classificeerFout(storageFout(409))).toBe('conflict')
    expect(classificeerFout(postgrestFout('23505', 'duplicate key value'))).toBe('conflict')
  })

  it('noemt een verdwenen doelwit weg', () => {
    expect(classificeerFout(storageFout(404))).toBe('weg')
    expect(classificeerFout(postgrestFout('23503', 'foreign key violation'))).toBe('weg')
    expect(classificeerFout(postgrestFout('PGRST116'))).toBe('weg')
  })

  it('mag 429 en 5xx wél opnieuw · de server vraagt zelf om later', () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(classificeerFout(storageFout(status))).toBe('tijdelijk')
    }
    expect(magOpnieuwProberen('tijdelijk')).toBe(true)
  })

  it('laat een gevulde code zwaarder wegen dan een netwerk-achtig bericht', () => {
    // Een RLS-melding die toevallig het woord "network" bevat is nog steeds
    // een antwoord van de database: opnieuw proberen verandert niets.
    const fout = postgrestFout('42501', 'permission denied on network_logs')
    expect(classificeerFout(fout)).toBe('rechten')
  })

  it('behandelt een onbekende fout als definitief, niet als netwerk', () => {
    expect(classificeerFout(new Error('kon canvas niet lezen'))).toBe('onbekend')
    expect(magOpnieuwProberen('onbekend')).toBe(false)
    expect(classificeerFout(null)).toBe('onbekend')
    expect(classificeerFout(postgrestFout('', 'iets zonder code en zonder fetch-tekst'))).toBe('onbekend')
  })

  it('behandelt een onbekende SQLSTATE als weigering en niet als netwerk', () => {
    expect(classificeerFout(postgrestFout('22001', 'value too long'))).toBe('geweigerd')
  })

  it('laat status 0 niet doorgaan voor een antwoord', () => {
    const fout = { ...postgrestNetwerkfout(), status: 0 }
    expect(classificeerFout(fout)).toBe('netwerk')
  })
})

describe('soortVoorStatus', () => {
  it('deelt de statuscodes in naar behandeling', () => {
    expect(soortVoorStatus(401)).toBe('rechten')
    expect(soortVoorStatus(410)).toBe('weg')
    expect(soortVoorStatus(422)).toBe('geweigerd')
    expect(soortVoorStatus(408)).toBe('tijdelijk')
    expect(soortVoorStatus(204)).toBe('onbekend')
  })
})

describe('hoortInWachtrij', () => {
  it('bewaart bij een netwerkfout terwijl het toestel zichzelf online noemt', () => {
    // Dit is het hele punt: op een dak met één streepje staat navigator.onLine
    // op true terwijl de upload sneuvelt.
    expect(hoortInWachtrij(postgrestNetwerkfout(), false)).toBe(true)
  })

  it('bewaart niet bij een serverweigering', () => {
    expect(hoortInWachtrij(postgrestFout('42501'), false)).toBe(false)
    expect(hoortInWachtrij(storageFout(413), false)).toBe(false)
  })

  it('is een strikte uitbreiding van de oude regel', () => {
    // Zonder vlag geldt `navigator.onLine === false`. Alles wat die regel
    // bewaarde, bewaart de nieuwe ook: de vlag omzetten kan dus nooit iets
    // wegnemen dat vandaag wél bewaard wordt.
    const oudeRegel = (offline: boolean) => offline
    const gevallen: unknown[] = [
      postgrestNetwerkfout(),
      postgrestFout('42501'),
      storageFout(413),
      new Error('iets onverwachts'),
    ]
    for (const fout of gevallen) {
      for (const offline of [true, false]) {
        if (oudeRegel(offline)) expect(hoortInWachtrij(fout, offline)).toBe(true)
      }
    }
  })

  it('bewaart altijd als het toestel aantoonbaar offline is', () => {
    // Offline is op zichzelf bewijs dat er geen antwoord kan zijn geweest,
    // wat de fout ook beweert. Zo blijft het oude gedrag een deelverzameling
    // van het nieuwe.
    expect(hoortInWachtrij(new Error('onduidelijk'), true)).toBe(true)
  })
})
