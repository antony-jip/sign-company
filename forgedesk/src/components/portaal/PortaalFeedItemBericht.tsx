import { Kaart, tekstLink } from '@/components/klantpagina/Klantstijl'

interface PortaalFeedItemBerichtProps {
  item: {
    id: string
    titel: string
    bericht_tekst?: string | null
    foto_url?: string | null
    afzender?: string | null
    created_at: string
  }
  bedrijfNaam?: string
  onVragenStellen?: () => void
  onImageClick?: (url: string) => void
}

function formatTijd(dateStr: string): string {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function PortaalFeedItemBericht({
  item,
  bedrijfNaam,
  onVragenStellen,
  onImageClick,
}: PortaalFeedItemBerichtProps) {
  return (
    <Kaart
      etiket="Bericht"
      status={<span className="font-mono text-xs text-[#9B9B95]">{formatTijd(item.created_at)}</span>}
      acties={onVragenStellen ? (
        <button type="button" onClick={onVragenStellen} className={tekstLink}>
          Reageren
        </button>
      ) : undefined}
    >
      <p className="text-sm font-medium text-[#1A1A1A]">{bedrijfNaam || item.titel}</p>

      {item.bericht_tekst && (
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#3A3A35]">
          {item.bericht_tekst}
        </p>
      )}

      {item.foto_url && (
        <button
          type="button"
          onClick={() => onImageClick?.(item.foto_url!)}
          aria-label="Bijlage groter bekijken"
          className="mt-3 block overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]"
        >
          <img
            src={item.foto_url}
            alt="Bijlage bij bericht"
            loading="lazy"
            className="max-h-[300px] max-w-full object-cover transition-opacity hover:opacity-90"
          />
        </button>
      )}
    </Kaart>
  )
}
