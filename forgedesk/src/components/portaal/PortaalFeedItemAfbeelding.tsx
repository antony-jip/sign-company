import { Kaart, tekstLink } from '@/components/klantpagina/Klantstijl'

interface PortaalFeedItemAfbeeldingProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    foto_url?: string | null
    bestanden?: { id: string; url: string; bestandsnaam: string; thumbnail_url?: string | null }[]
    created_at: string
  }
  onVragenStellen?: () => void
  onImageClick?: (url: string) => void
}

export function PortaalFeedItemAfbeelding({
  item,
  onVragenStellen,
  onImageClick,
}: PortaalFeedItemAfbeeldingProps) {
  const imageUrl = item.foto_url || item.bestanden?.[0]?.url
  const thumbnailUrl = item.bestanden?.[0]?.thumbnail_url || imageUrl

  return (
    <Kaart
      etiket="Foto"
      acties={onVragenStellen ? (
        <button type="button" onClick={onVragenStellen} className={tekstLink}>
          Reageren
        </button>
      ) : undefined}
    >
      <h3 className="break-words text-[17px] font-semibold leading-snug tracking-[-0.2px] text-[#1A1A1A]">
        {item.titel}
      </h3>
      {item.omschrijving && <p className="mt-0.5 text-sm text-[#6B6B66]">{item.omschrijving}</p>}

      {imageUrl && (
        <button
          type="button"
          onClick={() => onImageClick?.(imageUrl)}
          aria-label={`${item.titel} groter bekijken`}
          className="mt-4 block w-full overflow-hidden rounded-lg bg-[#F8F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]"
        >
          <img
            src={thumbnailUrl || imageUrl}
            alt={item.titel}
            loading="lazy"
            className="max-h-[420px] w-full object-cover transition-opacity hover:opacity-90"
          />
        </button>
      )}

      {item.bestanden && item.bestanden.length > 1 && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {item.bestanden.slice(1).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onImageClick?.(b.url)}
              aria-label={`${b.bestandsnaam} groter bekijken`}
              className="overflow-hidden rounded-lg bg-[#F8F7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A535C]"
            >
              <img
                src={b.thumbnail_url || b.url}
                alt={b.bestandsnaam}
                loading="lazy"
                className="aspect-square w-full object-cover transition-opacity hover:opacity-90"
              />
            </button>
          ))}
        </div>
      )}
    </Kaart>
  )
}
