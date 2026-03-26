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
  const typeLabel =
    type === 'goedkeuring' ? 'Goedgekeurd' :
    type === 'revisie' ? 'Revisie gevraagd' :
    'Reactie'

  const typeColor =
    type === 'goedkeuring' ? '#2D6B48' :
    type === 'revisie' ? '#6A4A9A' :
    '#5A5A55'

  return (
    <div
      className="ml-6 rounded-r-lg py-3 px-4"
      style={{
        borderLeft: '3px solid #F15025',
        backgroundColor: '#FAFAF8',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs font-semibold"
          style={{ color: typeColor }}
        >
          {typeLabel}
        </span>
        {klantNaam && (
          <span className="text-xs" style={{ color: '#A0A098' }}>
            — {klantNaam}
          </span>
        )}
        <span
          className="text-xs ml-auto"
          style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}
        >
          {formatTijd(createdAt)}
        </span>
      </div>

      {bericht && (
        <p
          className="whitespace-pre-wrap"
          style={{ fontSize: 13, color: '#3A3A35', lineHeight: 1.6 }}
        >
          {bericht}
        </p>
      )}

      {fotoUrl && (
        <div className="mt-2">
          <img
            src={fotoUrl}
            alt="Bijlage"
            className="rounded-lg max-w-[280px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onImageClick?.(fotoUrl)}
          />
        </div>
      )}
    </div>
  )
}
