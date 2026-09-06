import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComposerDocument } from '@/lib/mail/types'
import { slaConceptOp } from '@/services/conceptService'
import { logger } from '@/utils/logger'
import { isLeegDocument } from './document'

const AUTOSAVE_MS = 2000

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
  opties: { onId: (id: string) => void; gepauzeerdRef: React.MutableRefObject<boolean> },
) {
  const [opgeslagenOm, setOpgeslagenOm] = useState<Date | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc
  const onIdRef = useRef(opties.onId)
  onIdRef.current = opties.onId
  const gepauzeerdRef = opties.gepauzeerdRef

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
      const id = await slaConceptOp(huidig)
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
  }, [gepauzeerdRef])

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
