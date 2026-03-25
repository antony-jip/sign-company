import { useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Download,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface PortaalBestandData {
  id: string
  bestandsnaam: string
  mime_type: string | null
  url: string
  thumbnail_url: string | null
}

interface PortaalReactieData {
  id: string
  type: string
  bericht: string | null
  klant_naam: string | null
  portaal_bestand_id: string | null
  created_at: string
}

interface PortaalItemData {
  id: string
  titel: string
  bedrag: number | null
  status: string
  created_at: string
  bestanden: PortaalBestandData[]
  reacties: PortaalReactieData[]
  offerte_publiek_token?: string | null
}

interface Props {
  items: PortaalItemData[]
  token: string
  klantNaam: string
  onKlantNaamChange: (naam: string) => void
  onReactie: () => void
  primaire_kleur: string
  kanGoedkeuren?: boolean
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

function getGoedkeuringReactie(reacties: PortaalReactieData[]) {
  return reacties
    .filter(r => r.type === 'goedkeuring' && !r.portaal_bestand_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

function isFileViewable(mime: string | null): boolean {
  if (!mime) return false
  return mime === 'application/pdf' || mime.startsWith('image/')
}

export function PortaalOfferteSection({ items, token, klantNaam, onKlantNaamChange, onReactie, primaire_kleur, kanGoedkeuren = true }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="uppercase tracking-[0.1em] px-1" style={{ fontSize: 10, fontWeight: 600, color: '#A0A098' }}>Offertes</h2>
      {items.map(item => (
        <OfferteCard
          key={item.id}
          item={item}
          token={token}
          klantNaam={klantNaam}
          onKlantNaamChange={onKlantNaamChange}
          onReactie={onReactie}
          primaire_kleur={primaire_kleur}
          kanGoedkeuren={kanGoedkeuren}
        />
      ))}
    </section>
  )
}

function OfferteCard({ item, token, klantNaam, onKlantNaamChange, onReactie, primaire_kleur, kanGoedkeuren = true }: {
  item: PortaalItemData
  token: string
  klantNaam: string
  onKlantNaamChange: (naam: string) => void
  onReactie: () => void
  primaire_kleur: string
  kanGoedkeuren?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const goedkeuring = getGoedkeuringReactie(item.reacties)
  const isGetekend = item.status === 'goedgekeurd' || !!goedkeuring

  async function handleAkkoord() {
    if (!klantNaam.trim()) {
      setError('Vul uw naam in om akkoord te geven')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: item.id,
          type: 'goedkeuring',
          klant_naam: klantNaam.trim(),
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon niet ondertekenen')
      }
      setSuccess(true)
      try { localStorage.setItem('doen_portaal_klant_naam', klantNaam.trim()) } catch { /* ignore */ }
      setTimeout(() => onReactie(), 1500)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[10px] transition-all" style={{ backgroundColor: isGetekend ? '#F0F8F3' : '#FEFDFB', border: `0.5px solid ${isGetekend ? '#2D6B48' : '#E6E4E0'}` }}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" style={{ color: '#191919' }}>{item.titel}</h3>
            <p className="font-mono mt-0.5" style={{ fontSize: 10, color: '#A0A098' }}>Verstuurd op {formatDate(item.created_at)}</p>
          </div>
          {item.bedrag != null && (
            <span className="text-lg font-semibold font-mono text-gray-900 flex-shrink-0 tabular-nums">
              {formatCurrency(item.bedrag)}
            </span>
          )}
        </div>

        {/* Bestanden */}
        {item.bestanden.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.bestanden.map(b => (
              <a
                key={b.id}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
              >
                {isFileViewable(b.mime_type) ? (
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-gray-400" />
                )}
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate max-w-[200px]">{b.bestandsnaam}</span>
              </a>
            ))}
          </div>
        )}

        {/* Offerte bekijken link — opent in zelfde venster met terug-knop */}
        {item.offerte_publiek_token && (
          <div className="mt-3">
            <a
              href={`/offerte-bekijken/${item.offerte_publiek_token}?terug=${encodeURIComponent(window.location.pathname)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
              <FileText className="w-4 h-4 text-gray-500" />
              Bekijk volledige offerte
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </a>
          </div>
        )}
      </div>

      {/* Getekend status */}
      {isGetekend && (
        <div className="mx-5 mb-4 px-4 py-3 rounded-lg" style={{ backgroundColor: '#E4F0EA', border: '0.5px solid #C0DBCC' }}>
          <div className="flex items-center gap-2" style={{ color: '#2D6B48' }}>
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Akkoord gegeven</p>
              <p className="text-xs" style={{ color: '#2D6B48', opacity: 0.8 }}>
                door {goedkeuring?.klant_naam || 'Klant'}
                {goedkeuring && ` op ${formatDate(goedkeuring.created_at)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success animatie */}
      {success && !isGetekend && (
        <div className="mx-5 mb-4 px-4 py-3 rounded-lg animate-in fade-in" style={{ backgroundColor: '#E4F0EA', border: '0.5px solid #C0DBCC' }}>
          <div className="flex items-center gap-2" style={{ color: '#2D6B48' }}>
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">Offerte ondertekend!</p>
          </div>
        </div>
      )}

      {/* Onderteken formulier */}
      {kanGoedkeuren && !isGetekend && !success && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uw naam <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={klantNaam}
              onChange={(e) => onKlantNaamChange(e.target.value)}
              placeholder="Volledige naam"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleAkkoord}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: '#E4F0EA', color: '#2D6B48', borderRadius: 8 }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Akkoord geven
          </button>
        </div>
      )}
    </div>
  )
}
