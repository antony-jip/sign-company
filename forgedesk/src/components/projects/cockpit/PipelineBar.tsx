import { cn } from '@/lib/utils'
import type { Project, Offerte, MontageAfspraak, Factuur } from '@/types'

const PIPELINE_STEPS = [
  { key: 'offerte', label: 'Offerte' },
  { key: 'akkoord', label: 'Akkoord' },
  { key: 'uitvoering', label: 'Uitvoering' },
  { key: 'montage', label: 'Montage' },
  { key: 'factuur', label: 'Factuur' },
  { key: 'betaald', label: 'Betaald' },
] as const

const STEP_COLORS: Record<string, string> = {
  offerte: '#9B8EC4',
  akkoord: '#C9A96E',
  uitvoering: '#8BA88B',
  montage: '#E8946A',
  factuur: '#9B8EC4',
  betaald: '#4CAF50',
}

export function getPipelineStep(
  project: Project,
  offertes: Offerte[],
  montageAfspraken: MontageAfspraak[],
  facturen: Factuur[],
): number {
  if (facturen.some(f => f.status === 'betaald')) return 6
  if (facturen.length > 0) return 5
  if (montageAfspraken.some(m => m.status === 'afgerond')) return 5
  if (montageAfspraken.some(m => ['gepland', 'onderweg', 'bezig'].includes(m.status))) return 4
  if (['actief', 'in-review', 'te-factureren'].includes(project.status)) return 3
  if (offertes.some(o => o.status === 'goedgekeurd')) return 2
  if (offertes.length > 0) return 1
  return 0
}

export function getPipelineStepColor(stepIndex: number): string {
  return STEP_COLORS[PIPELINE_STEPS[stepIndex]?.key ?? 'offerte'] ?? '#9B8EC4'
}

interface PipelineBarProps {
  project: Project
  offertes: Offerte[]
  montageAfspraken: MontageAfspraak[]
  facturen: Factuur[]
}

export function PipelineBar({ project, offertes, montageAfspraken, facturen }: PipelineBarProps) {
  const currentStep = getPipelineStep(project, offertes, montageAfspraken, facturen)

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 flex-1">
        {PIPELINE_STEPS.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const color = STEP_COLORS[step.key]

          return (
            <div
              key={step.key}
              className="flex-1 h-[6px] rounded-full transition-colors duration-300"
              style={{
                backgroundColor: isCompleted
                  ? '#9B8EC4'
                  : isCurrent
                    ? '#C9A96E'
                    : 'hsl(33, 15%, 87%)',
              }}
              title={`${step.label}${isCurrent ? ' (huidig)' : isCompleted ? ' (voltooid)' : ''}`}
            />
          )
        })}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Stap {currentStep}/{PIPELINE_STEPS.length} · {PIPELINE_STEPS[Math.max(0, currentStep - 1)]?.label ?? 'Concept'}
      </span>
    </div>
  )
}
