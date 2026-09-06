import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComposerBijlage, ComposerDocument } from '@/lib/mail/types'
import { slaConceptOp } from '@/services/conceptService'
import { uploadEmailBijlage } from '@/services/storageService'
import { logger } from '@/utils/logger'
import { bestandSleutel, isLeegDocument } from './document'

const AUTOSAVE_MS = 2000

/**
 * Een bijlage met bron 'upload' bestaat alleen als File in het geheugen van
 * deze composer. Bewaarden we hem zo in het concept, dan kwam hij bij het
 * heropenen terug zonder bestand en weigerde verzenden fail-closed: een
 * concept met een bijlage was daardoor onverzendbaar. Daarom gaat hij bij het
 * opslaan naar Storage, hetzelfde tijdelijke pad dat verzenden ook gebruikt,
 * en bewaart het concept hem als bron 'storage'. `padCache` (op naam::grootte)
 * zorgt dat elk bestand hooguit één keer geüpload wordt, hoe vaak de autosave
 * ook draait. Lukt de upload niet, dan gaat de bijlage als ontbrekend het
 * concept in: dat is zichtbaar in de composer, in plaats van pas op te vallen
 * bij het verzenden.
 */
async function bijlagenVoorConcept(
  bijlagen: ComposerBijlage[],
  bestanden: Map<string, File>,
  padCache: Map<string, string>,
): Promise<ComposerBijlage[]> {
  const uit: ComposerBijlage[] = []
  for (const b of bijlagen) {
    if (b.bron !== 'upload') { uit.push(b); continue }
    const sleutel = bestandSleutel(b.naam, b.grootte)
    let pad = padCache.get(sleutel)
    if (!pad) {
      const file = bestanden.get(sleutel)
      if (!file) { uit.push({ ...b, ontbreekt: true }); continue }
      try {
        pad = (await uploadEmailBijlage(file)).storagePath
        padCache.set(sleutel, pad)
      } catch (err) {
        logger.warn(`Bijlage "${b.naam}" bij het concept bewaren mislukt:`, err)
        uit.push({ ...b, ontbreekt: true })
        continue
      }
    }
    uit.push({ naam: b.naam, grootte: b.grootte, type: b.type, bron: 'storage', pad })
  }
  return uit
}

function sleutelVan(doc: ComposerDocument): string {
  return JSON.stringify({ ...doc, id: undefined })
}

/**
 * Bewaart het document als concept: twee seconden na de laatste wijziging en
 * bij unmount. Het eerste document telt niet als wijziging, anders liet elk
 * geopend antwoordvenster een concept achter. Zodra `gepauzeerd` staat
 * (verzenden, concept verwijderd) wordt er niets meer weggeschreven.
 */
export function useAutosave(
  doc: ComposerDocument,
  opties: {
    onId: (id: string) => void
    gepauzeerdRef: React.MutableRefObject<boolean>
    /** De File-objecten achter de upload-bijlagen, op naam::grootte. */
    bestandenRef: React.MutableRefObject<Map<string, File>>
  },
) {
  const [opgeslagenOm, setOpgeslagenOm] = useState<Date | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc
  const onIdRef = useRef(opties.onId)
  onIdRef.current = opties.onId
  const gepauzeerdRef = opties.gepauzeerdRef
  const bestandenRef = opties.bestandenRef
  const padCacheRef = useRef(new Map<string, string>())

  const idRef = useRef<string | undefined>(doc.id)
  const laatsteRef = useRef<string>(sleutelVan(doc))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bezigRef = useRef(false)
  const opnieuwRef = useRef(false)
  const gemountRef = useRef(true)

  const wisTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const bewaar = useCallback(async (): Promise<string | undefined> => {
    if (gepauzeerdRef.current) return idRef.current
    const huidig: ComposerDocument = { ...docRef.current, id: docRef.current.id ?? idRef.current }
    if (isLeegDocument(huidig)) return idRef.current
    const sleutel = sleutelVan(huidig)
    if (sleutel === laatsteRef.current) return idRef.current
    if (bezigRef.current) { opnieuwRef.current = true; return idRef.current }
    bezigRef.current = true
    try {
      const teBewaren: ComposerDocument = huidig.bijlagen.length
        ? { ...huidig, bijlagen: await bijlagenVoorConcept(huidig.bijlagen, bestandenRef.current, padCacheRef.current) }
        : huidig
      const id = await slaConceptOp(teBewaren)
      laatsteRef.current = sleutel
      idRef.current = id
      if (gemountRef.current && !gepauzeerdRef.current) {
        onIdRef.current(id)
        setOpgeslagenOm(new Date())
      }
    } catch (err) {
      logger.warn('Concept opslaan mislukt:', err)
    } finally {
      bezigRef.current = false
      if (opnieuwRef.current) {
        opnieuwRef.current = false
        void bewaar()
      }
    }
    return idRef.current
  }, [gepauzeerdRef, bestandenRef])

  useEffect(() => {
    if (sleutelVan(doc) === laatsteRef.current) return
    wisTimer()
    timerRef.current = setTimeout(() => { void bewaar() }, AUTOSAVE_MS)
    return wisTimer
  }, [doc, bewaar])

  useEffect(() => {
    gemountRef.current = true
    return () => {
      gemountRef.current = false
      wisTimer()
      void bewaar()
    }
  }, [bewaar])

  const flush = useCallback(() => {
    wisTimer()
    return bewaar()
  }, [bewaar])

  return { opgeslagenOm, flush, conceptId: () => docRef.current.id ?? idRef.current }
}
