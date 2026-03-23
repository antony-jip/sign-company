import { getPipelineStep, getPipelineStepColor } from './PipelineBar'
import type { Project, Offerte, MontageAfspraak, Factuur } from '@/types'

interface WatNuAction {
  label: string
  onClick: () => void
  primary?: boolean
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

  switch (step) {
    case 0:
      return {
        tekst: 'Offerte nog niet aangemaakt',
        acties: [{ label: 'Offerte maken', onClick: callbacks.onCreateOfferte, primary: true }],
        kleur,
      }
    case 1: {
      const verzonden = offertes.some(o => ['verzonden', 'bekeken'].includes(o.status))
      return {
        tekst: verzonden
          ? 'Wacht op akkoord — offerte verzonden via portaal'
          : 'Offerte in concept — verstuur naar klant',
        acties: [
          ...(verzonden ? [{ label: 'Portaal bekijken', onClick: callbacks.onViewPortaal }] : []),
        ],
        kleur,
      }
    }
    case 2:
      return {
        tekst: 'Klant akkoord — start met uitvoering',
        acties: [
          { label: 'Werkbon maken', onClick: callbacks.onCreateWerkbon, primary: true },
        ],
        kleur,
      }
    case 3:
      return {
        tekst: 'In uitvoering',
        acties: [
          { label: 'Planning bekijken', onClick: callbacks.onViewPlanning },
        ],
        kleur,
      }
    case 4:
      return {
        tekst: `Montage gepland — ${montageAfspraken.find(m => m.status === 'gepland')?.monteurs?.[0] || 'monteur'} gaat erheen`,
        acties: [
          { label: 'Details bekijken', onClick: callbacks.onViewPlanning },
        ],
        kleur,
      }
    case 5: {
      const hasFactuur = facturen.length > 0
      if (hasFactuur) {
        const openBedrag = facturen.reduce((sum, f) => sum + (f.totaal - (f.betaald_bedrag || 0)), 0)
        return {
          tekst: `Factuur verstuurd — ${new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(openBedrag)} open`,
          acties: [],
          kleur,
        }
      }
      return {
        tekst: 'Montage afgerond — maak factuur',
        acties: [{ label: 'Factuur maken', onClick: callbacks.onCreateFactuur, primary: true }],
        kleur,
      }
    }
    case 6:
      return {
        tekst: 'Project afgerond',
        acties: [{ label: 'Archiveren', onClick: callbacks.onArchive }],
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
      className="flex items-center justify-between px-4 py-2.5 rounded-lg"
      style={{
        backgroundColor: `${config.kleur}0D`,
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="h-2 w-2 rounded-full flex-shrink-0 animate-pulse"
          style={{ backgroundColor: config.kleur }}
        />
        <span className="text-[13px] text-foreground/80">{config.tekst}</span>
      </div>
      {config.acties.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {config.acties.map((actie) => (
            <button
              key={actie.label}
              onClick={actie.onClick}
              className={`h-7 px-3 text-[11px] font-medium rounded-md transition-all ${
                actie.primary
                  ? 'text-white shadow-sm'
                  : 'border border-[hsl(35,15%,83%)] text-foreground hover:bg-[hsl(35,15%,96%)]'
              }`}
              style={actie.primary ? { backgroundColor: config.kleur } : undefined}
            >
              {actie.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
