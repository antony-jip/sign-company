import type { Werkbon } from '@/types'
import { updateWerkbon } from '@/services/werkbonService'
import { safeSetItem } from './localStorageUtils'
import { logger } from './logger'

// Minimale offline-buffer voor monteur-feedback op locatie: mislukt een save
// (geen dekking), dan bewaren we de laatste payload per werkbon in localStorage
// en spelen die opnieuw af zodra er weer verbinding is. Eén entry per werkbon
// (laatste wint) — één monteur op één toestel, dus last-write is prima.

const KEY = 'doen_werkbon_feedback_queue'
type Payload = Partial<Werkbon>
type Queue = Record<string, { payload: Payload; ts: number }>

function lees(): Queue {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as Queue
  } catch {
    return {}
  }
}

function schrijf(q: Queue): void {
  safeSetItem(KEY, JSON.stringify(q))
}

/** Zet (of vervang) de laatste feedback-payload voor een werkbon in de buffer. */
export function bufferWerkbonFeedback(werkbonId: string, payload: Payload, ts: number): void {
  const q = lees()
  q[werkbonId] = { payload, ts }
  schrijf(q)
}

/** Haal een werkbon uit de buffer (na een geslaagde save). */
export function clearWerkbonFeedback(werkbonId: string): void {
  const q = lees()
  if (q[werkbonId]) {
    delete q[werkbonId]
    schrijf(q)
  }
}

/** Speel alle gebufferde feedback opnieuw af. Geslaagde entries worden gewist. */
export async function flushWerkbonFeedbackQueue(): Promise<void> {
  const q = lees()
  const ids = Object.keys(q)
  if (ids.length === 0) return
  for (const id of ids) {
    try {
      await updateWerkbon(id, q[id].payload)
      clearWerkbonFeedback(id)
    } catch (err) {
      // Nog steeds geen verbinding — laat in de buffer voor de volgende poging.
      logger.warn('Offline werkbon-feedback nog niet gesynct:', id, err)
    }
  }
}
