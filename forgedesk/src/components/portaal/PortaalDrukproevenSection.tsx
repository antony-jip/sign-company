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
  kanGoedkeuren?: boolean
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

export function PortaalDrukproevenSection({ items, token, klantNaam, onReactie, primaire_kleur, kanGoedkeuren = true }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="uppercase tracking-[0.1em] px-1" style={{ fontSize: 10, fontWeight: 600, color: '#A0A098' }}>Drukproeven</h2>
      {items.map(item => (
        <DrukproefCard
          key={item.id}
          item={item}
          token={token}
          klantNaam={klantNaam}
          onReactie={onReactie}
          primaire_kleur={primaire_kleur}
          kanGoedkeuren={kanGoedkeuren}
        />
      ))}
    </section>
  )
}

function DrukproefCard({ item, token, klantNaam, onReactie, primaire_kleur, kanGoedkeuren = true }: {
  item: PortaalItemData
  token: string
  klantNaam: string
  onReactie: () => void
  primaire_kleur: string
  kanGoedkeuren?: boolean
}) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [itemLoading, setItemLoading] = useState<'goedkeuring' | 'revisie' | null>(null)
  const [showItemRevisie, setShowItemRevisie] = useState(false)
  const [itemRevisieBericht, setItemRevisieBericht] = useState('')
  const [itemError, setItemError] = useState('')

  const images = item.bestanden.filter(b => isImage(b.mime_type))
  const documents = item.bestanden.filter(b => !isImage(b.mime_type))

  const allApproved = images.length > 0
    ? images.every(img => getImageStatus(item.reacties, img.id) === 'goedgekeurd')
    : item.status === 'goedgekeurd'

  const isItemApproved = item.status === 'goedgekeurd'
  const isItemRevisie = item.status === 'revisie'
  const needsItemLevelApproval = images.length === 0 && !isItemApproved && !isItemRevisie

  const lightboxImages = images.map(img => ({
    url: img.url,
    bestandsnaam: img.bestandsnaam,
  }))

  async function handleItemReactie(type: 'goedkeuring' | 'revisie') {
    if (type === 'revisie' && !itemRevisieBericht.trim()) {
      setItemError('Beschrijf wat er anders moet')
      return
    }
    setItemLoading(type)
    setItemError('')
    try {
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: item.id,
          type,
          bericht: type === 'revisie' ? itemRevisieBericht.trim() : undefined,
          klant_naam: klantNaam.trim() || undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon niet opslaan')
      }
      setShowItemRevisie(false)
      setItemRevisieBericht('')
      onReactie()
    } catch (err) {
      setItemError((err as Error).message)
    } finally {
      setItemLoading(null)
    }
  }

  return (
    <div className="rounded-[10px] transition-all" style={{ backgroundColor: allApproved ? '#F0F8F3' : '#FFFFFF', border: `0.5px solid ${allApproved ? '#2D6B48' : '#E6E4E0'}` }}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium" style={{ color: '#191919' }}>{item.titel}</h3>
            <p className="font-mono mt-0.5" style={{ fontSize: 10, color: '#A0A098' }}>Verstuurd op {formatDate(item.created_at)}</p>
          </div>
          {allApproved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E4F0EA] text-[#2D6B48]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {images.length > 0 ? 'Alles goedgekeurd' : 'Goedgekeurd'}
            </span>
          )}
          {isItemRevisie && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FDE8E2] text-[#C03A18]">
              <RotateCcw className="w-3.5 h-3.5" />
              Revisie gevraagd
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
                kanGoedkeuren={kanGoedkeuren}
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

        {/* Item-level approve/revisie (when no images, only documents) */}
        {kanGoedkeuren && needsItemLevelApproval && !showItemRevisie && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleItemReactie('goedkeuring')}
              disabled={!!itemLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#E4F0EA', color: '#2D6B48', borderRadius: 8 }}
            >
              {itemLoading === 'goedkeuring' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Goedkeuren
            </button>
            <button
              onClick={() => setShowItemRevisie(true)}
              disabled={!!itemLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: '#FDE8E2', color: '#C03A18', borderRadius: 8 }}
            >
              <RotateCcw className="w-4 h-4" />
              Revisie vragen
            </button>
          </div>
        )}

        {/* Item-level revisie form */}
        {kanGoedkeuren && showItemRevisie && needsItemLevelApproval && (
          <div className="mt-4 space-y-2">
            <textarea
              value={itemRevisieBericht}
              onChange={(e) => setItemRevisieBericht(e.target.value)}
              placeholder="Wat moet er anders?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
              autoFocus
            />
            {itemError && <p className="text-xs text-[#C03A18]">{itemError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => handleItemReactie('revisie')}
                disabled={!!itemLoading}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: '#FDE8E2', color: '#C03A18', borderRadius: 8 }}
              >
                {itemLoading === 'revisie' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Versturen
              </button>
              <button
                onClick={() => { setShowItemRevisie(false); setItemError('') }}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Annuleren
              </button>
            </div>
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

function ImageApprovalCard({ bestand, status, reactie, token, itemId, klantNaam, onReactie, onImageClick, primaire_kleur, kanGoedkeuren = true }: {
  bestand: PortaalBestandData
  status: ImageStatus
  reactie: PortaalReactieData | undefined
  token: string
  itemId: string
  klantNaam: string
  onReactie: () => void
  onImageClick: () => void
  primaire_kleur: string
  kanGoedkeuren?: boolean
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
          <div className="absolute inset-0 rounded-lg bg-[#2D6B48]/20 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-full p-1.5 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-[#2D6B48]" />
            </div>
          </div>
        )}
        {status === 'revisie' && (
          <div className="absolute inset-0 rounded-lg bg-[#C03A18]/20 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-full p-1.5 shadow-sm">
              <RotateCcw className="w-6 h-6 text-[#C03A18]" />
            </div>
          </div>
        )}
      </div>

      {/* Bestandsnaam */}
      <p className="text-xs text-gray-500 truncate px-0.5">{bestand.bestandsnaam}</p>

      {/* Status info */}
      {status === 'goedgekeurd' && reactie && (
        <div className="px-2 py-1.5 rounded-md bg-[#E4F0EA] border border-[#C0DBCC]">
          <p className="text-xs text-[#2D6B48] font-medium">Goedgekeurd</p>
          {reactie.klant_naam && (
            <p className="text-xs text-[#2D6B48]">door {reactie.klant_naam}</p>
          )}
        </div>
      )}

      {status === 'revisie' && reactie && (
        <div className="px-2 py-1.5 rounded-md bg-[#FDE8E2] border border-[#F5C4B4]">
          <p className="text-xs text-[#C03A18] font-medium">Revisie gevraagd</p>
          {reactie.bericht && (
            <p className="text-xs text-[#C03A18] mt-0.5 line-clamp-2">{reactie.bericht}</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      {kanGoedkeuren && status === 'verstuurd' && !showRevisie && (
        <div className="flex gap-1.5">
          <button
            onClick={() => handleReactie('goedkeuring')}
            disabled={!!loading}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: '#E4F0EA', color: '#2D6B48', borderRadius: 8 }}
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
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 hover:opacity-90"
            style={{ backgroundColor: '#FDE8E2', color: '#C03A18', borderRadius: 8 }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revisie
          </button>
        </div>
      )}

      {/* Revisie form */}
      {kanGoedkeuren && showRevisie && status === 'verstuurd' && (
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
          {error && <p className="text-xs text-[#C03A18]">{error}</p>}
          <div className="flex gap-1.5">
            <button
              onClick={() => handleReactie('revisie')}
              disabled={!!loading}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: '#FDE8E2', color: '#C03A18', borderRadius: 8 }}
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
