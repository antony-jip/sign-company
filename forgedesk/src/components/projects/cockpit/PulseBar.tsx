import { useMemo } from 'react'
import { PulseItem } from './PulseItem'
import { cn, formatCurrency } from '@/lib/utils'
import { FileText, ThumbsUp, Hammer, ClipboardCheck, Receipt, Banknote } from 'lucide-react'
import type { Offerte, Factuur, Taak, Tijdregistratie, Project, Werkbon } from '@/types'

interface PulseBarProps {
  project: Project
  offertes: Offerte[]
  facturen: Factuur[]
  taken: Taak[]
  tijdregistraties: Tijdregistratie[]
  werkbonnen: Werkbon[]
}

const STEPS = [
  { key: 'offerte', label: 'Offerte', icon: FileText },
  { key: 'goedgekeurd', label: 'Akkoord', icon: ThumbsUp },
  { key: 'uitvoering', label: 'Uitvoering', icon: Hammer },
  { key: 'werkbon', label: 'Werkbon', icon: ClipboardCheck },
  { key: 'gefactureerd', label: 'Factuur', icon: Receipt },
  { key: 'betaald', label: 'Betaald', icon: Banknote },
] as const

function getActiveStep(offertes: Offerte[], werkbonnen: Werkbon[], facturen: Factuur[], projectStatus: string): number {
  if (facturen.some(f => f.status === 'betaald')) return 6
  if (facturen.length > 0) return 5
  if (werkbonnen.length > 0) return 4
  if (projectStatus === 'actief' || projectStatus === 'in-review') return 3
  if (offertes.some(o => o.status === 'goedgekeurd' || o.status === 'gefactureerd')) return 2
  if (offertes.length > 0) return 1
  return 0
}

export function PulseBar({ project, offertes, facturen, taken, tijdregistraties, werkbonnen }: PulseBarProps) {
  const activeStep = getActiveStep(offertes, werkbonnen, facturen, project.status)
  const metrics = useMemo(() => {
    // Waarde: sum of goedgekeurde offertes, or first offerte
    const goedgekeurde = offertes.filter(o => o.status === 'goedgekeurd' || o.status === 'gefactureerd')
    const waarde = goedgekeurde.length > 0
      ? goedgekeurde.reduce((sum, o) => sum + (o.totaal || 0), 0)
      : offertes.length > 0 ? offertes[0].totaal || 0 : 0

    // Uren
    const urenGebruikt = tijdregistraties.reduce((sum, t) => sum + ((t as Record<string, unknown>).uren as number || 0), 0)
    const urenGepland = taken.reduce((sum, t) => sum + (t.geschatte_tijd || 0), 0)

    // Deadline
    const eindDatum = project.eind_datum ? new Date(project.eind_datum) : null
    const isValidDate = eindDatum && !isNaN(eindDatum.getTime())
    const dagenTotDeadline = isValidDate
      ? Math.ceil((eindDatum.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    // Openstaand
    const openstaand = facturen
      .filter(f => f.status !== 'betaald' && f.status !== 'gecrediteerd')
      .reduce((sum, f) => sum + (f.totaal || 0) - (f.betaald_bedrag || 0), 0)

    return { waarde, urenGebruikt, urenGepland, dagenTotDeadline, openstaand }
  }, [project, offertes, facturen, taken, tijdregistraties])

  return (
    <div className="flex items-center bg-[#FFFFFE] border-b border-[hsl(35,15%,87%)] overflow-x-auto">
      <PulseItem
        value={formatCurrency(metrics.waarde)}
        label="waarde"
        colorClass="text-lavender-deep"
      />
      <PulseItem
        value={`${metrics.urenGebruikt.toFixed(1)} / ${metrics.urenGepland > 0 ? metrics.urenGepland.toFixed(0) : '—'}`}
        label="uren"
        colorClass="text-mist-deep"
      />
      <PulseItem
        value={metrics.dagenTotDeadline !== null ? `${metrics.dagenTotDeadline}d` : '—'}
        label="deadline"
        colorClass={metrics.dagenTotDeadline !== null && metrics.dagenTotDeadline < 0 ? 'text-red-500' : 'text-blush-deep'}
      />
      <PulseItem
        value={metrics.openstaand > 0 ? formatCurrency(metrics.openstaand) : '—'}
        label="openstaand"
        colorClass="text-cream-deep"
      />

      {/* Progress indicator — compact inline version */}
      <div className="flex items-center gap-0 py-2 px-4 ml-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isCompleted = i < activeStep
          const isCurrent = i === activeStep
          const isLast = i === STEPS.length - 1

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                    isCompleted && 'bg-emerald-500 text-white',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground/50',
                  )}
                >
                  <Icon className="h-3 w-3" />
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
                  'h-0.5 w-3 mx-0.5 rounded-full mt-[-10px]',
                  isCompleted ? 'bg-emerald-500' : 'bg-muted',
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
