import { StatusWoord, STATUS_KLEUR } from '@/components/klantpagina/Klantstijl'

interface PortaalKlantReactieProps {
  type: 'goedkeuring' | 'revisie' | 'bericht'
  bericht?: string | null
  klantNaam?: string | null
  fotoUrl?: string | null
  createdAt: string
  onImageClick?: (url: string) => void
}

function formatTijd(dateStr: string): string {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function PortaalKlantReactie({
  type,
  bericht,
  klantNaam,
  fotoUrl,
  createdAt,
  onImageClick,
}: PortaalKlantReactieProps) {
  return (
    <div className="ml-4 rounded-xl bg-[#F1F0EC] px-4 py-3 md:ml-6">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {type === 'goedkeuring' ? (
          <StatusWoord kleur={STATUS_KLEUR.goed}>Goedgekeurd</StatusWoord>
        ) : type === 'revisie' ? (
          <StatusWoord kleur={STATUS_KLEUR.wacht}>Revisie gevraagd</StatusWoord>
        ) : (
          <span className="text-xs font-semibold text-[#6B6B66]">Reactie</span>
        )}
        {klantNaam && <span className="text-xs text-[#6B6B66]">{klantNaam}</span>}
        <span className="ml-auto font-mono text-xs text-[#9B9B95]">{formatTijd(createdAt)}</span>
      </div>

      {bericht && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#3A3A35]">{bericht}</p>
      )}

      {fotoUrl && (
        <button
          type="button"
          onClick={() => onImageClick?.(fotoUrl)}
          className="mt-2 block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]"
          aria-label="Bijlage groter bekijken"
        >
          <img
            src={fotoUrl}
            alt="Bijlage bij reactie"
            className="max-h-[200px] max-w-[280px] rounded-lg object-cover transition-opacity hover:opacity-90"
          />
        </button>
      )}
    </div>
  )
}
