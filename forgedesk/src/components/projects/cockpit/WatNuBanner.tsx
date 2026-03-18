import { Button } from '@/components/ui/button'
import { getPipelineStep, getPipelineStepColor } from './PipelineBar'
import type { Project, Offerte, MontageAfspraak, Factuur } from '@/types'

interface WatNuAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline'
}

interface WatNuConfig {
  tekst: string
  acties: WatNuAction[]
  kleur: string
}

function getWatNuConfig(
  project: Project,
  offertes: Offerte[],
  montageAfspraken: MontageAfspraak[],
  facturen: Factuur[],
  callbacks: {
    onCreateOfferte: () => void
    onCreateWerkbon: () => void
    onCreateMontage: () => void
    onViewPortaal: () => void
    onViewPlanning: () => void
    onCreateFactuur: () => void
    onArchive: () => void
  },
): WatNuConfig | null {
  const step = getPipelineStep(project, offertes, montageAfspraken, facturen)
  const kleur = getPipelineStepColor(step)

  const takenKlaar = 0 // will be passed separately if needed

  switch (step) {
    case 0:
      return {
        tekst: 'Offerte nog niet aangemaakt',
        acties: [{ label: '+ Offerte maken', onClick: callbacks.onCreateOfferte }],
        kleur,
      }
    case 1: {
      const verzonden = offertes.some(o => ['verzonden', 'bekeken'].includes(o.status))
      return {
        tekst: verzonden
          ? 'Wacht op akkoord — offerte verzonden via portaal'
          : 'Offerte in concept — verstuur naar klant',
        acties: [
          ...(verzonden ? [{ label: 'Portaal bekijken', onClick: callbacks.onViewPortaal, variant: 'outline' as const }] : []),
        ],
        kleur,
      }
    }
    case 2:
      return {
        tekst: 'Klant akkoord — start met uitvoering',
        acties: [
          { label: 'Werkbon maken', onClick: callbacks.onCreateWerkbon },
        ],
        kleur,
      }
    case 3:
      return {
        tekst: 'In uitvoering',
        acties: [
          { label: 'Planning bekijken', onClick: callbacks.onViewPlanning, variant: 'outline' },
        ],
        kleur,
      }
    case 4:
      return {
        tekst: `Montage gepland — ${montageAfspraken.find(m => m.status === 'gepland')?.monteurs?.[0] || 'monteur'} gaat erheen`,
        acties: [
          { label: 'Details bekijken', onClick: callbacks.onViewPlanning, variant: 'outline' },
        ],
        kleur,
      }
    case 5: {
      const hasFactuur = facturen.length > 0
      if (hasFactuur) {
        const openBedrag = facturen.reduce((sum, f) => sum + (f.totaal - (f.betaald_bedrag || 0)), 0)
        return {
          tekst: `Factuur verstuurd — € ${openBedrag.toFixed(2).replace('.', ',')} open`,
          acties: [],
          kleur,
        }
      }
      return {
        tekst: 'Montage afgerond — maak factuur',
        acties: [{ label: 'Factuur maken', onClick: callbacks.onCreateFactuur }],
        kleur,
      }
    }
    case 6:
      return {
        tekst: 'Project afgerond ✓',
        acties: [{ label: 'Archiveren', onClick: callbacks.onArchive, variant: 'outline' }],
        kleur,
      }
    default:
      return null
  }
}

interface WatNuBannerProps {
  project: Project
  offertes: Offerte[]
  montageAfspraken: MontageAfspraak[]
  facturen: Factuur[]
  onCreateOfferte: () => void
  onCreateWerkbon: () => void
  onCreateMontage: () => void
  onViewPortaal: () => void
  onViewPlanning: () => void
  onCreateFactuur: () => void
  onArchive: () => void
}

export function WatNuBanner({
  project,
  offertes,
  montageAfspraken,
  facturen,
  ...callbacks
}: WatNuBannerProps) {
  const config = getWatNuConfig(project, offertes, montageAfspraken, facturen, callbacks)
  if (!config) return null

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors duration-200"
      style={{
        backgroundColor: `${config.kleur}0F`,
        borderTop: `1px solid ${config.kleur}33`,
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: config.kleur }}
        />
        <span className="text-sm text-foreground">{config.tekst}</span>
      </div>
      {config.acties.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {config.acties.map((actie) => (
            <Button
              key={actie.label}
              variant={actie.variant || 'default'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={actie.onClick}
            >
              {actie.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
