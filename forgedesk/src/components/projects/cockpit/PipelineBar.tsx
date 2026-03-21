import { getFase } from '@/utils/projectFases'
import { SpectrumBar } from '@/components/ui/SpectrumBar'
import type { Project, Offerte, MontageAfspraak, Factuur } from '@/types'

const PHASE_LABELS = ['Offerte', 'Akkoord', 'Productie', 'Montage', 'Klaar'] as const

export function getPipelineStep(
  project: Project,
  offertes: Offerte[],
  montageAfspraken: MontageAfspraak[],
  facturen: Factuur[],
): number {
  const fase = getFase(project.status)
  if (fase.percentage >= 100) return 5
  if (fase.percentage >= 70) return 4
  if (fase.percentage >= 45) return 3
  if (fase.percentage >= 20) return 2
  if (offertes.some(o => o.status === 'goedgekeurd')) return 2
  if (offertes.length > 0) return 1
  return 0
}

export function getPipelineStepColor(stepIndex: number): string {
  const fase = getFase(
    stepIndex >= 5 ? 'afgerond' :
    stepIndex >= 4 ? 'montage' :
    stepIndex >= 3 ? 'actief' :
    stepIndex >= 2 ? 'goedgekeurd' :
    'gepland'
  )
  return fase.color
}

interface PipelineBarProps {
  project: Project
  offertes: Offerte[]
  montageAfspraken: MontageAfspraak[]
  facturen: Factuur[]
}

export function PipelineBar({ project, offertes, montageAfspraken, facturen }: PipelineBarProps) {
  const currentStep = getPipelineStep(project, offertes, montageAfspraken, facturen)
  const fase = getFase(project.status)

  return (
    <div className="space-y-1.5">
      <SpectrumBar percentage={fase.percentage} height={6} className="w-full" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0">
          {PHASE_LABELS.map((label, i) => {
            const isActive = i + 1 === currentStep || (currentStep >= 5 && i === 4)
            return (
              <span key={label} className="flex items-center">
                {i > 0 && <span className="text-[10px] mx-1" style={{ color: '#A0A098' }}>|</span>}
                <span
                  className="text-[11px]"
                  style={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#191919' : '#A0A098',
                  }}
                >
                  {label}
                </span>
              </span>
            )
          })}
        </div>
        <span className="text-[12px] font-semibold" style={{ color: fase.color }}>
          {PHASE_LABELS[currentStep - 1] || fase.label}
        </span>
      </div>
    </div>
  )
}
