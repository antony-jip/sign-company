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
  akkoord: '#C4A882',
  uitvoering: '#7EB5A6',
  montage: '#D4836A',
  factuur: '#E8866A',
  betaald: '#4E7A58',
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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 flex-1">
        {PIPELINE_STEPS.map((step, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const color = STEP_COLORS[step.key]

          return (
            <div
              key={step.key}
              className="flex-1 relative group"
            >
              <div
                className="h-[5px] rounded-full transition-all duration-500"
                style={{
                  backgroundColor: isCompleted
                    ? color
                    : isCurrent
                      ? color
                      : 'hsl(35, 15%, 90%)',
                  opacity: isCompleted ? 0.7 : isCurrent ? 1 : 1,
                }}
              />
              {/* Tooltip on hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className={`text-[9px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded ${
                  isCompleted || isCurrent ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap font-mono">
        {currentStep}/{PIPELINE_STEPS.length} · {PIPELINE_STEPS[Math.max(0, currentStep - 1)]?.label ?? 'Start'}
      </span>
    </div>
  )
}
