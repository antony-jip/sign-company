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
    <div className="flex items-center bg-[#FFFFFE] border-b border-sand overflow-x-auto">
      <PulseItem
        value={formatCurrency(metrics.waarde)}
        label="waarde"
        colorClass="text-mod-email-text"
      />
      <PulseItem
        value={`${metrics.urenGebruikt.toFixed(1)} / ${metrics.urenGepland > 0 ? metrics.urenGepland.toFixed(0) : '—'}`}
        label="uren"
        colorClass="text-mod-klanten-text"
      />
      <PulseItem
        value={metrics.dagenTotDeadline !== null ? `${metrics.dagenTotDeadline}d` : '—'}
        label="deadline"
        colorClass={metrics.dagenTotDeadline !== null && metrics.dagenTotDeadline < 0 ? 'text-destructive' : 'text-flame-text'}
      />
      <PulseItem
        value={metrics.openstaand > 0 ? formatCurrency(metrics.openstaand) : '—'}
        label="openstaand"
        colorClass="text-mod-taken-text"
      />

      {/* Progress indicator — refined inline version */}
      <div className="flex items-center gap-0 py-2.5 px-5 ml-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isCompleted = i < activeStep
          const isCurrent = i === activeStep
          const isLast = i === STEPS.length - 1

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1 group cursor-default">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0',
                    isCompleted && 'bg-mod-projecten text-white shadow-sm',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-sm',
                    !isCompleted && !isCurrent && 'bg-[hsl(35,15%,92%)] text-muted-foreground/40',
                  )}
                >
                  <Icon className="h-3 w-3" />
                </div>
                <span className={cn(
                  'text-[9px] font-medium leading-none text-center whitespace-nowrap transition-colors duration-200',
                  isCompleted && 'text-mod-projecten-text',
                  isCurrent && 'text-primary font-bold',
                  !isCompleted && !isCurrent && 'text-muted-foreground/40',
                )}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className={cn(
                  'h-[2px] w-4 mx-0.5 rounded-full mt-[-12px] transition-colors duration-500',
                  i < activeStep ? 'bg-mod-projecten-light' : 'bg-sand',
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
