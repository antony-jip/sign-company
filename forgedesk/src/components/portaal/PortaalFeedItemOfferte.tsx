import { useState } from 'react'
import { FileText, ExternalLink, Loader2 } from 'lucide-react'

interface PortaalFeedItemOfferteProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    status: string
    bedrag?: number | null
    offerte_publiek_token?: string | null
    bestanden?: { url: string; bestandsnaam: string }[]
    created_at: string
  }
  token: string
  klantNaam: string
  kanGoedkeuren: boolean
  onReactie: () => void
  onVragenStellen: () => void
}

function formatBedrag(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    verstuurd: { bg: '#FDE8E4', color: '#F15025', label: 'verstuurd.' },
    geaccepteerd: { bg: '#E8F2EC', color: '#2D6B48', label: 'geaccepteerd.' },
    goedgekeurd: { bg: '#E8F2EC', color: '#2D6B48', label: 'geaccepteerd.' },
    betaald: { bg: '#E8F2EC', color: '#2D6B48', label: 'betaald.' },
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

export function PortaalFeedItemOfferte({
  item,
  token,
  klantNaam,
  kanGoedkeuren,
  onReactie,
  onVragenStellen,
}: PortaalFeedItemOfferteProps) {
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isAfgehandeld = ['goedgekeurd', 'geaccepteerd', 'betaald'].includes(item.status)

  async function handleAccepteren() {
    setLoading(true)
    try {
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: item.id,
          type: 'goedkeuring',
          klant_naam: klantNaam || undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon niet accepteren')
      }
      setConfirmOpen(false)
      onReactie()
    } catch (err) {
      console.error('Accepteren mislukt:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Card header accent */}
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: '#F15025' }} />
      <div
        className="rounded-b-[10px] bg-white"
        style={{ border: '0.5px solid #E8E6E1' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="font-semibold truncate"
                style={{ fontSize: 15, color: '#191919', fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {item.titel}
              </p>
              {item.omschrijving && (
                <p className="mt-0.5 text-sm" style={{ color: '#5A5A55' }}>
                  {item.omschrijving}
                </p>
              )}
            </div>
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

          {/* Offerte PDF link */}
          {item.offerte_publiek_token && (
            <a
              href={`/offerte/${item.offerte_publiek_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm hover:opacity-70 transition-opacity"
              style={{ color: '#1A535C' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Offerte bekijken
            </a>
          )}

          {/* Bestanden */}
          {item.bestanden && item.bestanden.length > 0 && (
            <div className="mt-3 space-y-1">
              {item.bestanden.map((b, i) => (
                <a
                  key={i}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-1 text-sm hover:opacity-70 transition-opacity"
                  style={{ color: '#1A535C' }}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{b.bestandsnaam}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isAfgehandeld && kanGoedkeuren && (
          <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: '#F0EEEA' }}>
            {confirmOpen ? (
              <div className="flex items-center gap-2 w-full">
                <p className="text-sm flex-1" style={{ color: '#5A5A55' }}>
                  Weet u zeker dat u deze offerte wilt accepteren?
                </p>
                <button
                  onClick={handleAccepteren}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#1A535C' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ja, accepteren
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-50"
                  style={{ color: '#5A5A55' }}
                >
                  Annuleren
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1A535C' }}
                >
                  Accepteren
                </button>
                <button
                  onClick={onVragenStellen}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
                >
                  Vragen stellen
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
