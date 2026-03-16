import { cn } from '@/lib/utils'
import { FileText, ThumbsUp, Hammer, ClipboardCheck, Receipt, Banknote } from 'lucide-react'
import type { Offerte, Werkbon, Factuur } from '@/types'

interface ProjectProgressIndicatorProps {
  projectStatus: string
  offertes: Offerte[]
  werkbonnen: Werkbon[]
  facturen: Factuur[]
}

const STEPS = [
  { key: 'offerte', label: 'Offerte', icon: FileText },
  { key: 'goedgekeurd', label: 'Akkoord', icon: ThumbsUp },
  { key: 'uitvoering', label: 'Uitvoering', icon: Hammer },
  { key: 'werkbon', label: 'Werkbon', icon: ClipboardCheck },
  { key: 'gefactureerd', label: 'Factuur', icon: Receipt },
  { key: 'betaald', label: 'Betaald', icon: Banknote },
] as const

function getActiveStep(
  offertes: Offerte[],
  werkbonnen: Werkbon[],
  facturen: Factuur[],
  projectStatus: string,
): number {
  // Determine how far the project has progressed
  if (facturen.some(f => f.status === 'betaald')) return 6
  if (facturen.length > 0) return 5
  if (werkbonnen.length > 0) return 4
  if (projectStatus === 'actief' || projectStatus === 'in-review') return 3
  if (offertes.some(o => o.status === 'goedgekeurd' || o.status === 'gefactureerd')) return 2
  if (offertes.length > 0) return 1
  return 0
}

export function ProjectProgressIndicator({ projectStatus, offertes, werkbonnen, facturen }: ProjectProgressIndicatorProps) {
  const activeStep = getActiveStep(offertes, werkbonnen, facturen, projectStatus)

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isCompleted = i < activeStep
        const isCurrent = i === activeStep
        const isLast = i === STEPS.length - 1

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                  isCompleted && 'bg-emerald-500 text-white',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground/50',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={cn(
                'text-[9px] font-medium leading-none text-center whitespace-nowrap',
                isCompleted && 'text-emerald-600 dark:text-emerald-400',
                isCurrent && 'text-primary font-bold',
                !isCompleted && !isCurrent && 'text-muted-foreground/50',
              )}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={cn(
                'h-0.5 flex-1 mx-0.5 rounded-full mt-[-14px]',
                isCompleted ? 'bg-emerald-500' : 'bg-muted',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
