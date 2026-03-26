import { useState } from 'react'
import { FileText, Download, Loader2, Eye } from 'lucide-react'

interface PortaalFeedItemTekeningProps {
  item: {
    id: string
    titel: string
    omschrijving?: string | null
    label?: string | null
    status: string
    bestanden?: { id: string; url: string; bestandsnaam: string; mime_type?: string | null; grootte?: number | null; thumbnail_url?: string | null }[]
    created_at: string
  }
  token: string
  klantNaam: string
  kanGoedkeuren: boolean
  onReactie: () => void
  onVragenStellen: () => void
  onImageClick?: (url: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    verstuurd: { bg: '#FDE8E4', color: '#F15025', label: 'verstuurd.' },
    goedgekeurd: { bg: '#E8F2EC', color: '#2D6B48', label: 'goedgekeurd.' },
    revisie: { bg: '#EEE8F9', color: '#6A4A9A', label: 'revisie.' },
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

export function PortaalFeedItemTekening({
  item,
  token,
  klantNaam,
  kanGoedkeuren,
  onReactie,
  onVragenStellen,
  onImageClick,
}: PortaalFeedItemTekeningProps) {
  const [loading, setLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'goedkeuren' | 'revisie' | null>(null)
  const isAfgehandeld = ['goedgekeurd', 'revisie'].includes(item.status)
  const images = (item.bestanden || []).filter(b => b.mime_type?.startsWith('image/'))
  const pdfFiles = (item.bestanden || []).filter(b => b.mime_type === 'application/pdf' || b.bestandsnaam?.toLowerCase().endsWith('.pdf'))
  const otherFiles = (item.bestanden || []).filter(b => !b.mime_type?.startsWith('image/') && b.mime_type !== 'application/pdf' && !b.bestandsnaam?.toLowerCase().endsWith('.pdf'))

  async function handleAction(type: 'goedkeuring' | 'revisie') {
    setLoading(true)
    try {
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: item.id,
          type,
          klant_naam: klantNaam || undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Actie mislukt')
      }
      setConfirmAction(null)
      onReactie()
    } catch (err) {
      console.error('Tekening actie mislukt:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: '#1A535C' }} />
      <div
        className="rounded-b-[10px] bg-white"
        style={{ border: '0.5px solid #E8E6E1' }}
      >
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold" style={{ fontSize: 15, color: '#191919' }}>
                {item.titel}
              </p>
              {item.label && (
                <span className="text-xs" style={{ color: '#1A535C', fontFamily: "'DM Mono', monospace" }}>
                  {item.label}
                </span>
              )}
            </div>
            <StatusBadge status={item.status} />
          </div>

          {item.omschrijving && (
            <p className="mt-1 text-sm" style={{ color: '#5A5A55' }}>
              {item.omschrijving}
            </p>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((img) => (
                <img
                  key={img.id}
                  src={img.thumbnail_url || img.url}
                  alt={img.bestandsnaam}
                  className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border"
                  style={{ borderColor: '#E8E6E1' }}
                  onClick={() => onImageClick?.(img.url)}
                />
              ))}
            </div>
          )}

          {/* PDF files — inline preview */}
          {pdfFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {pdfFiles.map((f) => (
                <div key={f.id}>
                  <div
                    className="flex items-center gap-2 py-2 px-3 rounded-lg"
                    style={{ backgroundColor: '#F5F5F0', border: '0.5px solid #E8E6E1' }}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#C03A18' }} />
                    <span className="truncate flex-1 text-sm" style={{ color: '#191919' }}>{f.bestandsnaam}</span>
                    {f.grootte != null && (
                      <span style={{ fontSize: 11, color: '#A0A098', fontFamily: "'DM Mono', monospace" }}>
                        {formatFileSize(f.grootte)}
                      </span>
                    )}
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 no-underline"
                      style={{ backgroundColor: '#1A535C', color: '#fff' }}
                    >
                      <Eye className="w-3 h-3" />
                      Bekijk
                    </a>
                    <a
                      href={f.url}
                      download={f.bestandsnaam}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" style={{ color: '#A0A098' }} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Other files */}
          {otherFiles.length > 0 && (
            <div className="mt-3 space-y-1">
              {otherFiles.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors"
                  style={{ fontSize: 13, color: '#1A535C' }}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">{f.bestandsnaam}</span>
                  {f.grootte != null && (
                    <span style={{ fontSize: 11, color: '#A0A098', fontFamily: "'DM Mono', monospace" }}>
                      {formatFileSize(f.grootte)}
                    </span>
                  )}
                  <Download className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#A0A098' }} />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isAfgehandeld && kanGoedkeuren && (
          <div className="px-5 py-3 border-t" style={{ borderColor: '#F0EEEA' }}>
            {confirmAction ? (
              <div className="flex items-center gap-2">
                <p className="text-sm flex-1" style={{ color: '#5A5A55' }}>
                  {confirmAction === 'goedkeuren'
                    ? 'Weet u zeker dat u deze tekening wilt goedkeuren?'
                    : 'Wilt u een revisie aanvragen?'}
                </p>
                <button
                  onClick={() => handleAction(confirmAction === 'goedkeuren' ? 'goedkeuring' : 'revisie')}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: confirmAction === 'goedkeuren' ? '#1A535C' : '#6A4A9A' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {confirmAction === 'goedkeuren' ? 'Ja, goedkeuren' : 'Ja, revisie'}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                  style={{ color: '#5A5A55' }}
                >
                  Annuleren
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmAction('goedkeuren')}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90"
                  style={{ backgroundColor: '#1A535C' }}
                >
                  Goedkeuren
                </button>
                <button
                  onClick={() => {
                    setConfirmAction('revisie')
                    onVragenStellen()
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
                  style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
                >
                  Revisie
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
