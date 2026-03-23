import { Check } from 'lucide-react'
import { getSpectrumColor } from '@/utils/spectrumUtils'
import type { Project, Offerte, MontageAfspraak, Factuur } from '@/types'
import { getPipelineStep } from './PipelineBar'

const FASES = [
  { label: 'Offerte', percentage: 10 },
  { label: 'Akkoord', percentage: 20 },
  { label: 'Productie', percentage: 45 },
  { label: 'Montage', percentage: 70 },
  { label: 'Klaar', percentage: 100 },
] as const

/** Maps a fase index (0-4) to the DB status to set */
const FASE_TO_STATUS: Record<number, string> = {
  0: 'gepland',
  1: 'actief',
  2: 'actief',
  3: 'in-review',
  4: 'afgerond',
}

interface FaseNavigatorProps {
  project: Project
  offertes: Offerte[]
  montageAfspraken: MontageAfspraak[]
  facturen: Factuur[]
  onStatusChange?: (status: string) => void
}

export function FaseNavigator({
  project,
  offertes,
  montageAfspraken,
  facturen,
  onStatusChange,
}: FaseNavigatorProps) {
  const currentStep = getPipelineStep(project, offertes, montageAfspraken, facturen)

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl"
      style={{ backgroundColor: '#F4F2EE' }}
    >
      {FASES.map((fase, i) => {
        const stepIndex = i + 1
        const isCompleted = stepIndex < currentStep
        const isCurrent = stepIndex === currentStep || (currentStep >= 5 && i === 4)
        const isFuture = stepIndex > currentStep
        const spectrumColor = getSpectrumColor(fase.percentage)

        return (
          <button
            key={fase.label}
            onClick={() => {
              if (onStatusChange && !isCurrent) {
                onStatusChange(FASE_TO_STATUS[i] || 'actief')
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-[10px] transition-all duration-200"
            style={{
              padding: '9px 8px',
              backgroundColor: isCurrent ? '#FFFFFF' : 'transparent',
              boxShadow: isCurrent ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: onStatusChange ? 'pointer' : 'default',
            }}
          >
            {/* Indicator dot/checkmark */}
            {isCompleted ? (
              <div
                className="h-[14px] w-[14px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: spectrumColor }}
              >
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </div>
            ) : isCurrent ? (
              <div
                className="h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: spectrumColor }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
            ) : (
              <div
                className="h-[14px] w-[14px] rounded-full flex-shrink-0"
                style={{ border: '1.5px solid #D0D0C8' }}
              />
            )}

            {/* Label */}
            <span
              className="text-[12px] whitespace-nowrap"
              style={{
                fontWeight: isCurrent ? 700 : isCompleted ? 500 : 500,
                color: isCurrent ? '#191919' : isCompleted ? spectrumColor : '#C0C0B8',
              }}
            >
              {fase.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
