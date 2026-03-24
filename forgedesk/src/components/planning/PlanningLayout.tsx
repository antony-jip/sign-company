import { useSearchParams } from 'react-router-dom'
import { Calendar, Wrench } from 'lucide-react'
import { CalendarLayout } from '@/components/planning/CalendarLayout'
import { MontagePlanningLayout } from '@/components/planning/MontagePlanningLayout'

type PlanningModus = 'kalender' | 'montage'

export function PlanningLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const modus: PlanningModus = searchParams.get('modus') === 'montage' ? 'montage' : 'kalender'

  const setModus = (m: PlanningModus) => {
    if (m === 'kalender') {
      setSearchParams({})
    } else {
      setSearchParams({ modus: m })
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F7F5] -m-3 sm:-m-4 md:-m-6">
      {/* DOEN Header */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="text-[32px] font-extrabold tracking-[-0.5px] text-[#1A1A1A]">
              Planning<span className="text-[#F15025]">.</span>
            </h1>
          </div>

          {/* DOEN modus toggle */}
          <div className="inline-flex rounded-xl bg-[#F0EFEC] p-0.5">
            <button
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                modus === 'kalender'
                  ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-[#9B9B95] hover:text-[#6B6B66]'
              }`}
              onClick={() => setModus('kalender')}
            >
              <Calendar className="w-3.5 h-3.5" />
              Kalender
            </button>
            <button
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                modus === 'montage'
                  ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                  : 'text-[#9B9B95] hover:text-[#6B6B66]'
              }`}
              onClick={() => setModus('montage')}
            >
              <Wrench className="w-3.5 h-3.5" />
              Montage
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {modus === 'kalender' ? <CalendarLayout /> : <MontagePlanningLayout />}
      </div>
    </div>
  )
}
