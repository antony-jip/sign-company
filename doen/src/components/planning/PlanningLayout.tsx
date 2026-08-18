import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { MontagePlanningLayout } from '@/components/planning/MontagePlanningLayout'
import { getMontageAfspraken } from '@/services/planningService'
import { logger } from '@/utils/logger'

/**
 * Een lege maandkalender legt zichzelf niet uit. Deze hint staat bewust boven
 * MontagePlanningLayout in plaats van erin, zodat de drag-and-drop-logica daar
 * ongemoeid blijft.
 */
function LegePlanningHint() {
  const navigate = useNavigate()
  return (
    <div className="mx-4 mt-4 rounded-xl border border-border bg-card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-petrol/10 flex-shrink-0">
        <CalendarPlus className="w-4 h-4 text-petrol" strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground">
          Nog niets ingepland<span className="text-flame">.</span>
        </p>
        <p className="text-[13px] text-muted-foreground mt-0.5 leading-[1.5]">
          Planning is alleen voor montage. Plan een montage vanuit een project, of klik in de kalender.
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/projecten')}
        className="self-start sm:self-auto px-4 py-2 rounded-lg bg-flame text-white text-sm font-semibold hover:bg-[#E04520] transition-colors whitespace-nowrap"
      >
        Naar projecten
      </button>
    </div>
  )
}

export function PlanningLayout() {
  const [isLeeg, setIsLeeg] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMontageAfspraken()
      .then(afspraken => { if (!cancelled) setIsLeeg(afspraken.length === 0) })
      .catch(err => logger.warn('[planning] afspraken tellen mislukt:', err))
    return () => { cancelled = true }
  }, [])

  return (
    <div className="h-full flex flex-col bg-background">
      {isLeeg && <LegePlanningHint />}
      <MontagePlanningLayout />
    </div>
  )
}
