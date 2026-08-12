import type { WerkbonFoto } from '@/types'
import { getWerkbon, getWerkbonFotos, createWerkbonFoto } from '@/services/werkbonService'
import { uploadFile } from '@/services/storageService'
import { resizeWerkbonImage } from './werkbonMedia'
import { sanitizeStorageFilename } from './storageHelpers'
import { classificeerFout, foutOmschrijving } from './offlineFoutClassificatie'
import { beoordeelWerkbonMutatie, volgendeMutatieStatus } from './offlineWachtrijRegels'
import {
  alleMutaties, blobVan, mutatieBijwerken, mutatieOpslaan, mutatieVerwijderen,
  type Mutatie,
} from './offlineMutatieStore'
import { logger } from './logger'

/**
 * De wachtrij voor werkbonfoto's: de enige mutatiesoort die vandaag persistent
 * is. Optellend (een nieuwe rij in `werkbon_fotos`), geen nummeruitgifte, en
 * de foto op de telefoon is de enige kopie — met `capture="environment"` staat
 * een opname op iOS niet in de camerarol.
 *
 * Het hele bestand hangt achter de vlag `offline_queue`; zonder rij in
 * `feature_flags` roept niets hier iets aan.
 */

export const WACHTRIJ_GEWIJZIGD = 'doen-offline-wachtrij-gewijzigd'

function meldWijziging(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WACHTRIJ_GEWIJZIGD))
}

export interface FotoPayload extends Record<string, unknown> {
  type: WerkbonFoto['type']
  bestandsnaam: string
  storagePad: string
  verkleind: boolean
}

export function isFotoPayload(payload: Record<string, unknown>): payload is FotoPayload {
  return typeof payload.storagePad === 'string' && typeof payload.bestandsnaam === 'string'
}

/**
 * Het storagepad wordt hier bepaald en niet bij het versturen. Dat is wat de
 * mutatie idempotent maakt: het bestaande pad bevat `Date.now()` plus een
 * random deel (`WerkbonMonteurView.tsx:248`), dus een tweede poging zou naar
 * een tweede pad uploaden en een tweede rij inserten. Met de mutatie-id in het
 * pad is elke poging hetzelfde verzoek.
 */
export function bouwStoragePad(werkbonId: string, mutatieId: string, bestandsnaam: string): string {
  return `werkbon-fotos/${werkbonId}/${mutatieId}-${sanitizeStorageFilename(bestandsnaam)}`
}

export async function fotoInWachtrij(opties: {
  werkbonId: string
  eigenaar: string
  type: WerkbonFoto['type']
  bestandsnaam: string
  bestand: Blob
  verkleind: boolean
}): Promise<Mutatie> {
  const id = crypto.randomUUID()
  const mutatie: Mutatie = {
    id,
    soort: 'werkbon_foto',
    entiteitId: opties.werkbonId,
    eigenaar: opties.eigenaar,
    payload: {
      type: opties.type,
      bestandsnaam: opties.bestandsnaam,
      storagePad: bouwStoragePad(opties.werkbonId, id, opties.bestandsnaam),
      verkleind: opties.verkleind,
    } satisfies FotoPayload,
    gewijzigdeVelden: [],
    basisVersie: null,
    heeftBlob: true,
    aangemaakt: Date.now(),
    pogingen: 0,
    laatsteFout: null,
    foutSoort: null,
    status: 'wachtend',
  }
  await mutatieOpslaan(mutatie, opties.bestand)
  meldWijziging()
  return mutatie
}

export async function fotoUitWachtrij(id: string): Promise<void> {
  await mutatieVerwijderen(id)
  meldWijziging()
}

export async function fotoMutaties(eigenaar: string, werkbonId?: string): Promise<Mutatie[]> {
  const alles = await alleMutaties(eigenaar)
  return alles.filter(
    (m) => m.soort === 'werkbon_foto' && (!werkbonId || m.entiteitId === werkbonId),
  )
}

/** Een vastgelopen mutatie handmatig opnieuw aanbieden. */
export async function fotoOpnieuwProberen(id: string): Promise<void> {
  await mutatieBijwerken(id, { status: 'wachtend', pogingen: 0, laatsteFout: null, foutSoort: null })
  meldWijziging()
}

async function bestaatAl(werkbonId: string, storagePad: string): Promise<boolean> {
  const bestaande = await getWerkbonFotos(werkbonId)
  return bestaande.some((f) => f.url === storagePad)
}

type VerstuurUitkomst = 'verstuurd' | 'vast'

async function verstuurEen(mutatie: Mutatie, userId: string): Promise<VerstuurUitkomst> {
  const payload = mutatie.payload
  if (!isFotoPayload(payload)) throw new Error('Onbruikbare foto-mutatie')

  const werkbon = await getWerkbon(mutatie.entiteitId)
  const oordeel = beoordeelWerkbonMutatie('werkbon_foto', werkbon?.status ?? null)
  if (!oordeel.toegestaan) {
    await mutatieBijwerken(mutatie.id, {
      status: 'vast',
      foutSoort: oordeel.foutSoort,
      laatsteFout: oordeel.uitleg,
    })
    return 'vast'
  }

  const bestand = await blobVan(mutatie.id)
  if (!bestand) {
    await mutatieBijwerken(mutatie.id, {
      status: 'vast',
      foutSoort: 'weg',
      laatsteFout: 'Het bestand is niet meer op dit toestel te vinden',
    })
    return 'vast'
  }

  const teVersturen = payload.verkleind
    ? bestand
    : await resizeWerkbonImage(new File([bestand], payload.bestandsnaam, { type: bestand.type }), 1200)

  try {
    await uploadFile(
      new File([teVersturen], payload.bestandsnaam, { type: 'image/jpeg' }),
      payload.storagePad,
    )
  } catch (fout) {
    // Hetzelfde pad bestaat al: een eerdere poging is aangekomen maar de
    // bevestiging ging verloren. Dat is precies waarom het pad stabiel is.
    if (classificeerFout(fout) !== 'conflict') throw fout
  }

  if (!(await bestaatAl(mutatie.entiteitId, payload.storagePad))) {
    await createWerkbonFoto({
      user_id: userId,
      werkbon_id: mutatie.entiteitId,
      type: payload.type,
      url: payload.storagePad,
      omschrijving: payload.bestandsnaam,
    })
  }

  await mutatieVerwijderen(mutatie.id)
  return 'verstuurd'
}

export interface FlushResultaat {
  verstuurd: number
  vast: number
  wachtend: number
}

let flushBezig = false

/**
 * Eén ronde over de wachtrij. Serieel, en niet stoppen bij de eerste fout:
 * `MaatjeKladblok.tsx` doet daar een `break` waardoor één rot item alles
 * achter zich vasthoudt. Alleen bij een echte netwerkfout heeft doorgaan geen
 * zin en breken we de ronde af — de rest is dan toch kansloos.
 */
export async function flushFotoWachtrij(eigenaar: string, userId: string): Promise<FlushResultaat> {
  const resultaat: FlushResultaat = { verstuurd: 0, vast: 0, wachtend: 0 }
  if (flushBezig) return resultaat
  flushBezig = true
  try {
    const items = (await fotoMutaties(eigenaar)).filter((m) => m.status !== 'vast')
    if (items.length === 0) return resultaat

    for (const mutatie of items) {
      // Ophogen vóór de poging: een crash tussen poging en teller moet als
      // poging tellen, anders loopt een item dat de app laat crashen eeuwig.
      const pogingen = mutatie.pogingen + 1
      await mutatieBijwerken(mutatie.id, { pogingen, status: 'bezig' })
      try {
        const uitkomst = await verstuurEen({ ...mutatie, pogingen }, userId)
        if (uitkomst === 'verstuurd') resultaat.verstuurd++
        else resultaat.vast++
      } catch (fout) {
        const soort = classificeerFout(fout)
        const status = volgendeMutatieStatus(pogingen, soort)
        await mutatieBijwerken(mutatie.id, {
          status,
          foutSoort: soort,
          laatsteFout: foutOmschrijving(soort),
        })
        if (status === 'vast') resultaat.vast++
        else resultaat.wachtend++
        logger.warn('Foto uit wachtrij niet verstuurd:', mutatie.id, soort, fout)
        if (soort === 'netwerk') break
      }
    }
    // Een 'bezig' die na een crash is blijven staan hoort weer wachtend te
    // zijn; zonder dit blijft hij buiten elke volgende ronde.
    for (const m of await fotoMutaties(eigenaar)) {
      if (m.status === 'bezig') await mutatieBijwerken(m.id, { status: 'wachtend' })
    }
    meldWijziging()
    return resultaat
  } finally {
    flushBezig = false
  }
}
