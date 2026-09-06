import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import type { IngeplandBericht } from '@/types'
import { getOutboxRijen, markeerOutboxWeg, verstuurOutboxOpnieuw, heeftBijlagenZonderInhoud } from './outboxService'
import { ontvangerLabel } from '../emailHelpers'

/**
 * Bovenin Verzonden: wat nog onderweg is en wat is blijven hangen. Geen
 * poll; ververst bij focus en na een actie. Verdwijnt zodra er niets is.
 */
export function OutboxRijen({ actief }: { actief: boolean }) {
  const [rijen, zetRijen] = useState<IngeplandBericht[]>([])
  const [bezig, zetBezig] = useState<string | null>(null)

  const laad = useCallback(() => {
    getOutboxRijen().then(zetRijen).catch(() => {})
  }, [])

  useEffect(() => {
    if (!actief) return
    laad()
    const onFocus = () => { if (document.visibilityState === 'visible') laad() }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [actief, laad])

  if (!actief || rijen.length === 0) return null

  const opnieuw = async (b: IngeplandBericht) => {
    zetBezig(b.id)
    try {
      await verstuurOutboxOpnieuw(b)
      toast.success('Opnieuw verzonden')
      laad()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Opnieuw verzenden mislukt')
    } finally {
      zetBezig(null)
    }
  }

  const weg = async (b: IngeplandBericht) => {
    await markeerOutboxWeg(b.id).catch(() => {})
    laad()
  }

  return (
    <div className="border-b border-border/70">
      {rijen.map((b) => {
        const mislukt = b.status === 'mislukt'
        return (
          <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
            {mislukt ? <AlertCircle className="h-3.5 w-3.5 text-[#C0451A] flex-shrink-0" /> : <Loader2 className="h-3.5 w-3.5 text-petrol animate-spin flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="truncate text-foreground">
                <span className="font-medium">{b.onderwerp || '(geen onderwerp)'}</span>
                <span className="text-muted-foreground"> · aan {ontvangerLabel(b.ontvanger)}</span>
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {mislukt ? `Mislukt${b.foutmelding ? ` · ${b.foutmelding}` : ''}` : 'Wordt verzonden'}
                {mislukt && heeftBijlagenZonderInhoud(b) ? ' · bijlagen gaan niet mee bij opnieuw' : ''}
              </p>
            </div>
            {mislukt && (
              <>
                <button type="button" onClick={() => opnieuw(b)} disabled={bezig === b.id} className="inline-flex items-center gap-1 text-[12px] font-medium text-petrol hover:underline disabled:opacity-50">
                  <RotateCcw className="h-3 w-3" /> Opnieuw
                </button>
                <button type="button" onClick={() => weg(b)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Weghalen">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
