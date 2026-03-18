import { useMemo } from 'react'
import { PulseItem } from './PulseItem'
import { formatCurrency } from '@/lib/utils'
import type { Offerte, Factuur, Taak, Tijdregistratie, Project, Werkbon } from '@/types'

interface PulseBarProps {
  project: Project
  offertes: Offerte[]
  facturen: Factuur[]
  taken: Taak[]
  tijdregistraties: Tijdregistratie[]
  werkbonnen: Werkbon[]
}

function getActiveStep(offertes: Offerte[], werkbonnen: Werkbon[], facturen: Factuur[], projectStatus: string): number {
  if (facturen.some(f => f.status === 'betaald')) return 6
  if (facturen.length > 0) return 5
  if (werkbonnen.length > 0) return 4
  if (projectStatus === 'actief' || projectStatus === 'in-review') return 3
  if (offertes.some(o => o.status === 'goedgekeurd' || o.status === 'gefactureerd')) return 2
  if (offertes.length > 0) return 1
  return 0
}

const faseLabels = ['Start', 'Offerte', 'Akkoord', 'Uitvoering', 'Werkbon', 'Factuur', 'Betaald']

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
      {/* Phase dots */}
      <div className="flex flex-col py-2.5 px-5">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`h-2 w-2 rounded-full transition-colors ${
                step <= activeStep
                  ? 'bg-emerald-500'
                  : step === activeStep + 1
                    ? 'bg-amber-400'
                    : 'bg-[hsl(35,15%,87%)]'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground font-medium mt-1">
          {faseLabels[activeStep] || 'Start'}
        </span>
      </div>
    </div>
  )
}
