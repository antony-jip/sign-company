import { useRef, useEffect, useCallback, useMemo } from 'react'
import { FileText, Image, Receipt, CheckCircle2, RotateCcw, Download, ExternalLink, CreditCard } from 'lucide-react'
import { PortaalKlantReactie } from './PortaalKlantReactie'
import { getStatusBadgeClass } from '@/utils/statusColors'
import type { PortaalItem } from '@/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PortaalTimelineProps {
  items: PortaalItem[]
  isPublic: boolean
  bedrijfNaam?: string
  onImageClick?: (url: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  verstuurd: 'Verstuurd',
  bekeken: 'Bekeken',
  goedgekeurd: 'Goedgekeurd',
  revisie: 'Revisie gevraagd',
  betaald: 'Betaald',
  vervangen: 'Vervangen',
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  offerte: FileText,
  tekening: Image,
  factuur: Receipt,
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(ts: string): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Vandaag'
  if (d.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function dateKey(ts: string): string {
  return new Date(ts).toISOString().split('T')[0]
}

function isImageFile(mimeType?: string, filename?: string): boolean {
  if (mimeType?.startsWith('image/')) return true
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')
  }
  return false
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DaySeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t" style={{ borderColor: '#E8E6E1' }} />
      <span className="text-xs font-medium" style={{ color: '#A0A098', fontFamily: "'DM Mono', monospace" }}>
        {formatDate(date)}
      </span>
      <div className="flex-1 border-t" style={{ borderColor: '#E8E6E1' }} />
    </div>
  )
}

function TextBubble({ item, bedrijfNaam }: { item: PortaalItem; bedrijfNaam?: string }) {
  const isKlant = item.afzender === 'klant'
  const isIntern = item.bericht_type === 'notitie_intern'

  return (
    <div className={`flex ${isKlant ? 'justify-start' : 'justify-end'}`}>
      <div
        className="rounded-xl px-4 py-2.5 max-w-[75%]"
        style={
          isIntern
            ? { backgroundColor: '#FFFBEB', border: '0.5px solid #FDE68A' }
            : isKlant
              ? { backgroundColor: '#F5F5F0', border: '0.5px solid #E8E6E1' }
              : { backgroundColor: '#E2F0F0', border: '0.5px solid #C0DBDB' }
        }
      >
        {isIntern && (
          <p className="text-xs font-medium mb-1" style={{ color: '#92400E' }}>
            Interne notitie
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap" style={{ color: '#3A3A35', lineHeight: 1.6 }}>
          {item.bericht_tekst || item.omschrijving || ''}
        </p>
        <div className={`mt-1 flex items-center gap-1.5 ${isKlant ? 'justify-start' : 'justify-end'}`}>
          <span className="text-xs" style={{ color: '#A0A098' }}>
            {isKlant ? 'Klant' : (bedrijfNaam || 'Jij')}
          </span>
          <span className="text-xs" style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}>
            {formatTime(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

function PhotoBubble({ item, onImageClick }: { item: PortaalItem; onImageClick?: (url: string) => void }) {
  const isKlant = item.afzender === 'klant'

  return (
    <div className={`flex ${isKlant ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[300px]">
        {item.foto_url && (
          /\.pdf$/i.test(item.foto_url) ? (
            <a
              href={item.foto_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-gray-50"
              style={{ borderColor: '#E8E6E1' }}
            >
              <FileText className="h-4 w-4 text-red-500" />
              <span className="flex-1 truncate">{item.titel || 'PDF bekijken'}</span>
              <ExternalLink className="h-3 w-3" style={{ color: '#A0A098' }} />
            </a>
          ) : (
            <img
              src={item.foto_url}
              alt={item.titel}
              className="cursor-pointer rounded-xl hover:opacity-90 transition-opacity"
              onClick={() => onImageClick?.(item.foto_url!)}
            />
          )
        )}
        {item.bericht_tekst && (
          <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: '#3A3A35' }}>
            {item.bericht_tekst}
          </p>
        )}
        <div className="mt-1 text-right">
          <span className="text-xs" style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}>
            {formatTime(item.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

function ItemCard({ item, onImageClick }: { item: PortaalItem; onImageClick?: (url: string) => void }) {
  const TypeIcon = TYPE_ICONS[item.type] || FileText
  const statusLabel = STATUS_LABELS[item.status] || item.status
  const badgeClass = getStatusBadgeClass(item.status)

  const images = item.bestanden.filter((b) => isImageFile(b.mime_type, b.bestandsnaam))
  const files = item.bestanden.filter((b) => !isImageFile(b.mime_type, b.bestandsnaam))

  // Approval indicator from reacties
  const approvalReactie = item.reacties?.find(r => r.type === 'goedkeuring' || r.type === 'revisie')

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#FEFDFB', border: '0.5px solid #E8E6E1' }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#E8F2EC' }}>
          <TypeIcon className="h-5 w-5" style={{ color: '#4a7c5f' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-medium" style={{ color: '#191919' }}>{item.titel}</h4>
            {item.label && (
              <span className="shrink-0 text-xs" style={{ color: '#A0A098', fontFamily: "'DM Mono', monospace" }}>{item.label}</span>
            )}
          </div>
          {item.bedrag != null && (
            <p className="text-base font-semibold" style={{ fontFamily: "'DM Mono', monospace", color: '#191919' }}>
              {formatCurrency(item.bedrag)}
            </p>
          )}
          {item.omschrijving && (
            <p className="mt-0.5 text-xs line-clamp-2" style={{ color: '#A0A098' }}>{item.omschrijving}</p>
          )}
        </div>
        <span className={`badge shrink-0 ${badgeClass}`}>{statusLabel}</span>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="mt-3">
          {images.slice(0, 1).map((img) => (
            <img
              key={img.id}
              src={img.thumbnail_url || img.url}
              alt={img.bestandsnaam}
              className="max-h-[200px] cursor-pointer rounded-lg object-cover hover:opacity-90 transition-opacity"
              onClick={() => onImageClick?.(img.url)}
            />
          ))}
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-gray-50"
              style={{ backgroundColor: '#F5F5F0' }}
            >
              <Download className="h-3.5 w-3.5" style={{ color: '#A0A098' }} />
              <span className="flex-1 truncate" style={{ color: '#3A3A35' }}>{f.bestandsnaam}</span>
              {f.grootte && (
                <span style={{ color: '#A0A098' }}>{(f.grootte / 1024).toFixed(0)} KB</span>
              )}
              <ExternalLink className="h-3 w-3 shrink-0" style={{ color: '#A0A098' }} />
            </a>
          ))}
        </div>
      )}

      {/* Approval indicator */}
      {approvalReactie && (item.status === 'goedgekeurd' || item.status === 'revisie') && (
        <div className={`mt-3 flex items-center gap-1.5 text-xs`} style={{ color: item.status === 'goedgekeurd' ? '#2D6B48' : '#C03A18' }}>
          {item.status === 'goedgekeurd' ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Goedgekeurd door {approvalReactie.klant_naam || 'Klant'}</>
          ) : (
            <><RotateCcw className="h-3.5 w-3.5" /> Revisie gevraagd door {approvalReactie.klant_naam || 'Klant'}</>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center gap-4">
        {item.type === 'factuur' && item.mollie_payment_url && item.status !== 'betaald' && (
          <a
            href={item.mollie_payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#2D6B48' }}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Betalen
          </a>
        )}
        <span className="ml-auto text-xs" style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}>
          {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PortaalTimeline({ items, isPublic, bedrijfNaam, onImageClick }: PortaalTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Sort items chronologically (oldest first)
  const sorted = useMemo(() => {
    let filtered = [...items]
    if (isPublic) {
      filtered = filtered.filter(i => i.zichtbaar_voor_klant && i.bericht_type !== 'notitie_intern')
    }
    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }, [items, isPublic])

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timer)
  }, [sorted.length, scrollToBottom])

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: '#A0A098' }}>
          Nog geen items in het portaal.
        </p>
      </div>
    )
  }

  let lastDay = ''

  return (
    <div className="space-y-3">
      {sorted.map((item) => {
        const day = dateKey(item.created_at)
        const showDaySep = day !== lastDay
        lastDay = day

        const isBubble = item.bericht_type === 'tekst' || item.bericht_type === 'notitie_intern'
        const isPhoto = item.bericht_type === 'foto'
        const isCard = !isBubble && !isPhoto

        return (
          <div key={item.id} className="space-y-2">
            {showDaySep && <DaySeparator date={item.created_at} />}

            {/* Item zelf */}
            {isBubble && <TextBubble item={item} bedrijfNaam={bedrijfNaam} />}
            {isPhoto && <PhotoBubble item={item} onImageClick={onImageClick} />}
            {isCard && <ItemCard item={item} onImageClick={onImageClick} />}

            {/* Klant-reacties direct onder het item */}
            {console.log('[TL]', item.titel, item.reacties?.length)}
            {item.reacties && item.reacties.length > 0 && (
              <div className="space-y-2">
                {item.reacties.map((r) => (
                  <PortaalKlantReactie
                    key={r.id}
                    type={r.type}
                    bericht={r.bericht}
                    klantNaam={r.klant_naam}
                    fotoUrl={r.foto_url}
                    createdAt={r.created_at}
                    onImageClick={onImageClick}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
