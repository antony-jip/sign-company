interface PortaalFeedItemAfbeeldingProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    foto_url?: string | null
    bestanden?: { id: string; url: string; bestandsnaam: string; thumbnail_url?: string | null }[]
    created_at: string
  }
  onVragenStellen: () => void
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
    <div>
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: '#6A5A8A' }} />
      <div
        className="rounded-b-[10px] bg-white"
        style={{ border: '0.5px solid #E8E6E1' }}
      >
        <div className="px-5 py-4">
          <p className="font-semibold" style={{ fontSize: 15, color: '#191919' }}>
            {item.titel}
          </p>
          {item.omschrijving && (
            <p className="mt-0.5 text-sm" style={{ color: '#5A5A55' }}>
              {item.omschrijving}
            </p>
          )}
        </div>

        {imageUrl && (
          <div className="px-5 pb-4">
            <img
              src={thumbnailUrl || imageUrl}
              alt={item.titel}
              className="w-full max-h-[400px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick?.(imageUrl)}
            />
          </div>
        )}

        {/* Multiple images */}
        {item.bestanden && item.bestanden.length > 1 && (
          <div className="px-5 pb-4 flex flex-wrap gap-2">
            {item.bestanden.slice(1).map((b) => (
              <img
                key={b.id}
                src={b.thumbnail_url || b.url}
                alt={b.bestandsnaam}
                className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border"
                style={{ borderColor: '#E8E6E1' }}
                onClick={() => onImageClick?.(b.url)}
              />
            ))}
          </div>
        )}

        <div className="px-5 py-3 border-t" style={{ borderColor: '#F0EEEA' }}>
          <button
            onClick={onVragenStellen}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
          >
            Reactie
          </button>
        </div>
      </div>
    </div>
  )
}
