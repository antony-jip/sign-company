import { useState } from 'react'
import {
  CheckCircle2,
  RotateCcw,
  Loader2,
  Download,
  FileText,
} from 'lucide-react'
import { PortaalLightbox } from './PortaalLightbox'

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
  status: string
  created_at: string
  bestanden: PortaalBestandData[]
  reacties: PortaalReactieData[]
}

interface Props {
  items: PortaalItemData[]
  token: string
  klantNaam: string
  onReactie: () => void
  primaire_kleur: string
}

function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith('image/')
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

type ImageStatus = 'verstuurd' | 'goedgekeurd' | 'revisie'

function getImageStatus(reacties: PortaalReactieData[], bestandId: string): ImageStatus {
  const sorted = reacties
    .filter(r => r.portaal_bestand_id === bestandId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (!sorted.length) return 'verstuurd'
  return sorted[0].type === 'goedkeuring' ? 'goedgekeurd' : 'revisie'
}

function getImageReactie(reacties: PortaalReactieData[], bestandId: string): PortaalReactieData | undefined {
  return reacties
    .filter(r => r.portaal_bestand_id === bestandId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

export function PortaalDrukproevenSection({ items, token, klantNaam, onReactie, primaire_kleur }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1">Drukproeven</h2>
      {items.map(item => (
        <DrukproefCard
          key={item.id}
          item={item}
          token={token}
          klantNaam={klantNaam}
          onReactie={onReactie}
          primaire_kleur={primaire_kleur}
        />
      ))}
    </section>
  )
}

function DrukproefCard({ item, token, klantNaam, onReactie, primaire_kleur }: {
  item: PortaalItemData
  token: string
  klantNaam: string
  onReactie: () => void
  primaire_kleur: string
}) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const images = item.bestanden.filter(b => isImage(b.mime_type))
  const documents = item.bestanden.filter(b => !isImage(b.mime_type))

  const allApproved = images.length > 0 && images.every(img => getImageStatus(item.reacties, img.id) === 'goedgekeurd')

  const lightboxImages = images.map(img => ({
    url: img.url,
    bestandsnaam: img.bestandsnaam,
  }))

  return (
    <div className={`bg-white rounded-xl border transition-all ${allApproved ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-gray-900">{item.titel}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Verstuurd op {formatDate(item.created_at)}</p>
          </div>
          {allApproved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Alles goedgekeurd
            </span>
          )}
        </div>

        {/* Image grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {images.map((img, index) => (
              <ImageApprovalCard
                key={img.id}
                bestand={img}
                status={getImageStatus(item.reacties, img.id)}
                reactie={getImageReactie(item.reacties, img.id)}
                token={token}
                itemId={item.id}
                klantNaam={klantNaam}
                onReactie={onReactie}
                onImageClick={() => setLightboxIndex(index)}
                primaire_kleur={primaire_kleur}
              />
            ))}
          </div>
        )}

        {/* Non-image documents */}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {documents.map(doc => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-gray-400" />
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate max-w-[200px]">{doc.bestandsnaam}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex >= 0 && (
        <PortaalLightbox
          images={lightboxImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  )
}

function ImageApprovalCard({ bestand, status, reactie, token, itemId, klantNaam, onReactie, onImageClick, primaire_kleur }: {
  bestand: PortaalBestandData
  status: ImageStatus
  reactie: PortaalReactieData | undefined
  token: string
  itemId: string
  klantNaam: string
  onReactie: () => void
  onImageClick: () => void
  primaire_kleur: string
}) {
  const [loading, setLoading] = useState<'goedkeuring' | 'revisie' | null>(null)
  const [showRevisie, setShowRevisie] = useState(false)
  const [revisieBericht, setRevisieBericht] = useState('')
  const [error, setError] = useState('')

  async function handleReactie(type: 'goedkeuring' | 'revisie') {
    if (type === 'revisie' && !revisieBericht.trim()) {
      setError('Beschrijf wat er anders moet')
      return
    }
    setLoading(type)
    setError('')
    try {
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: itemId,
          portaal_bestand_id: bestand.id,
          type,
          bericht: type === 'revisie' ? revisieBericht.trim() : undefined,
          klant_naam: klantNaam.trim() || undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon niet opslaan')
      }
      setShowRevisie(false)
      setRevisieBericht('')
      onReactie()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      {/* Thumbnail */}
      <div className="relative group">
        <button
          onClick={onImageClick}
          className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
        >
          <img
            src={bestand.thumbnail_url || bestand.url}
            alt={bestand.bestandsnaam}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </button>

        {/* Status overlay */}
        {status === 'goedgekeurd' && (
          <div className="absolute inset-0 rounded-lg bg-green-500/20 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-full p-1.5 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        )}
        {status === 'revisie' && (
          <div className="absolute inset-0 rounded-lg bg-amber-500/20 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-full p-1.5 shadow-sm">
              <RotateCcw className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        )}
      </div>

      {/* Bestandsnaam */}
      <p className="text-xs text-gray-500 truncate px-0.5">{bestand.bestandsnaam}</p>

      {/* Status info */}
      {status === 'goedgekeurd' && reactie && (
        <div className="px-2 py-1.5 rounded-md bg-green-50 border border-green-200">
          <p className="text-xs text-green-700 font-medium">Goedgekeurd</p>
          {reactie.klant_naam && (
            <p className="text-xs text-green-600">door {reactie.klant_naam}</p>
          )}
        </div>
      )}

      {status === 'revisie' && reactie && (
        <div className="px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700 font-medium">Revisie gevraagd</p>
          {reactie.bericht && (
            <p className="text-xs text-amber-600 mt-0.5 line-clamp-2">{reactie.bericht}</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {status === 'verstuurd' && !showRevisie && (
        <div className="flex gap-1.5">
          <button
            onClick={() => handleReactie('goedkeuring')}
            disabled={!!loading}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: primaire_kleur }}
          >
            {loading === 'goedkeuring' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Goed
          </button>
          <button
            onClick={() => setShowRevisie(true)}
            disabled={!!loading}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revisie
          </button>
        </div>
      )}

      {/* Revisie form */}
      {showRevisie && status === 'verstuurd' && (
        <div className="space-y-2">
          <textarea
            value={revisieBericht}
            onChange={(e) => setRevisieBericht(e.target.value)}
            placeholder="Wat moet er anders?"
            rows={2}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:border-transparent resize-none"
            style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
            autoFocus
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-1.5">
            <button
              onClick={() => handleReactie('revisie')}
              disabled={!!loading}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {loading === 'revisie' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Versturen
            </button>
            <button
              onClick={() => { setShowRevisie(false); setError('') }}
              className="px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
