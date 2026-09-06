import { useEffect, useRef } from 'react'
import type { MailMap } from '@/lib/mail/types'
import { ToetsVerwerker, heeftOpenDialoog, isInvoerDoel, roepReaderActie, type ToetsActie } from './toetsen'

export interface ToetsHandlers {
  volgende: () => void
  vorige: () => void
  openen: () => void
  archiveren: () => void
  verwijderen: () => void
  antwoord: () => void
  allen: () => void
  doorsturen: () => void
  nieuw: () => void
  snooze: () => void
  pin: () => void
  label: () => void
  ongelezen: () => void
  zoeken: () => void
  kaart: () => void
  sluiten: () => void
  verzenden?: () => void
  naarMap: (map: MailMap) => void
  readerOpen: boolean
  readerActies?: unknown
}

/**
 * Altijd actief in lijst én reader, nooit in een invoerveld, editor of open
 * dialoog. De handlers zitten in een ref zodat de listener maar één keer
 * hangt en toch de laatste stand ziet.
 */
export function useMailToetsen(handlers: ToetsHandlers, actief = true): void {
  const ref = useRef(handlers)
  ref.current = handlers
  const verwerker = useRef(new ToetsVerwerker())

  useEffect(() => {
    if (!actief) return
    const onKey = (e: KeyboardEvent) => {
      if (isInvoerDoel(e.target)) return
      if (heeftOpenDialoog(document)) return
      const h = ref.current
      const uitkomst = verwerker.current.verwerk(e, { readerOpen: h.readerOpen })
      if (!uitkomst.verwerkt) return
      e.preventDefault()
      const actie = uitkomst.actie
      if (!actie) return
      if (typeof actie === 'object') { h.naarMap(actie.map); return }
      const reader: Partial<Record<ToetsActie, 'n' | 'p' | 'q' | 'i'>> = { 'reader-n': 'n', 'reader-p': 'p', 'reader-q': 'q', 'reader-i': 'i' }
      const letter = reader[actie]
      if (letter) { roepReaderActie(h.readerActies, letter); return }
      if (actie === 'verzenden') { h.verzenden?.(); return }
      const fn = h[actie as Exclude<ToetsActie, 'verzenden' | 'reader-n' | 'reader-p' | 'reader-q' | 'reader-i'>]
      if (typeof fn === 'function') fn()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [actief])
}
