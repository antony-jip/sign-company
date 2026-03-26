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
  onVragenStellen: () => void
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
    <div>
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: '#5A5A55' }} />
      <div
        className="rounded-b-[10px] bg-white"
        style={{ border: '0.5px solid #E8E6E1' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium" style={{ color: '#191919' }}>
              {bedrijfNaam || item.titel}
            </p>
            <span
              className="text-xs flex-shrink-0"
              style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}
            >
              {formatTijd(item.created_at)}
            </span>
          </div>

          {item.bericht_tekst && (
            <p
              className="whitespace-pre-wrap"
              style={{ fontSize: 14, color: '#3A3A35', lineHeight: 1.7 }}
            >
              {item.bericht_tekst}
            </p>
          )}

          {item.foto_url && (
            <div className="mt-3">
              <img
                src={item.foto_url}
                alt="Bijlage"
                className="max-w-full max-h-[300px] object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onImageClick?.(item.foto_url!)}
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t" style={{ borderColor: '#F0EEEA' }}>
          <button
            onClick={onVragenStellen}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F4F2EE]"
            style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
          >
            Reactie
          </button>
        </div>
      </div>
    </div>
  )
}
