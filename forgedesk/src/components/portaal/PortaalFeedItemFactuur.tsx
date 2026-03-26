interface PortaalFeedItemFactuurProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    status: string
    bedrag?: number | null
    mollie_payment_url?: string | null
    created_at: string
  }
  onVragenStellen: () => void
}

function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    verstuurd: { bg: '#FDE8E4', color: '#C44830', label: 'te betalen.' },
    betaald: { bg: '#E8F2EC', color: '#2D6B48', label: 'betaald.' },
    goedgekeurd: { bg: '#E8F2EC', color: '#2D6B48', label: 'betaald.' },
  }
  const s = map[status] || map.verstuurd
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <span style={{ color: '#F15025', fontSize: 8 }}>●</span>
      {s.label}
    </span>
  )
}

export function PortaalFeedItemFactuur({
  item,
  onVragenStellen,
}: PortaalFeedItemFactuurProps) {
  const isBetaald = ['betaald', 'goedgekeurd'].includes(item.status)

  return (
    <div>
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: '#2D6B48' }} />
      <div
        className="rounded-b-[10px] bg-white"
        style={{ border: '0.5px solid #E8E6E1' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <p
              className="font-semibold"
              style={{ fontSize: 15, color: '#191919' }}
            >
              {item.titel}
            </p>
            <StatusBadge status={item.status} />
          </div>

          {item.bedrag != null && (
            <p
              className="mt-2 text-lg font-medium"
              style={{ color: '#191919', fontFamily: "'DM Mono', monospace" }}
            >
              {formatBedrag(item.bedrag)}
            </p>
          )}

          {item.omschrijving && (
            <p className="mt-1 text-sm" style={{ color: '#5A5A55' }}>
              {item.omschrijving}
            </p>
          )}
        </div>

        {!isBetaald && (
          <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: '#F0EEEA' }}>
            {item.mollie_payment_url && (
              <a
                href={item.mollie_payment_url}
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#1A535C' }}
              >
                <span style={{ color: '#F15025', marginRight: 4 }}>Betalen</span>
              </a>
            )}
            <button
              onClick={onVragenStellen}
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
            >
              Vragen stellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
