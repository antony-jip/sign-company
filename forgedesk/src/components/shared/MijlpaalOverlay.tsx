import { useEffect, useState } from 'react'
import { opMijlpaal, type Mijlpaal } from '@/lib/mijlpaal'
import { SuccesMoment } from './SuccesMoment'

/**
 * Eén keer gemount in de app. Luistert op de mijlpaal-bus zodat elk scherm een
 * felicitatie kan afvuren zonder zelf gemount te blijven.
 */
export function MijlpaalOverlay() {
  const [mijlpaal, setMijlpaal] = useState<Mijlpaal | null>(null)

  useEffect(() => opMijlpaal(setMijlpaal), [])

  if (!mijlpaal) return null

  return (
    <SuccesMoment
      titel={mijlpaal.titel}
      tekst={mijlpaal.tekst}
      onKlaar={() => setMijlpaal(null)}
    />
  )
}
