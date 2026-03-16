import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Loader2,
  FileText,
  Image,
  Receipt,
  MessageSquare,
  Download,
  ExternalLink,
  Calendar,
  Building2,
  Phone,
  Mail,
  Globe,
  CreditCard,
  Eye,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Paperclip,
} from 'lucide-react'
import { PortaalVerlopen } from './PortaalVerlopen'
import { PortaalGesloten } from './PortaalGesloten'
import { PortaalReactieForm } from './PortaalReactieForm'
import { PortaalLightbox } from './PortaalLightbox'

// Types voor de API response
interface PortaalBestand {
  id: string
  bestandsnaam: string
  mime_type: string | null
  grootte: number | null
  url: string
  thumbnail_url: string | null
  uploaded_by: string
  created_at: string
}

interface PortaalReactie {
  id: string
  type: string
  bericht: string | null
  klant_naam: string | null
  created_at: string
}

interface PortaalItemData {
  id: string
  type: string
  titel: string
  omschrijving: string | null
  label: string | null
  status: string
  bekeken_op: string | null
  mollie_payment_url: string | null
  bedrag: number | null
  volgorde: number
  created_at: string
  bestanden: PortaalBestand[]
  reacties: PortaalReactie[]
}

interface PortaalData {
  status: 'actief' | 'verlopen' | 'gesloten'
  token?: string
  bedrijfsnaam?: string
  bedrijfs_telefoon?: string
  bedrijfs_email?: string
  portaal?: {
    id: string
    instructie_tekst: string | null
    verloopt_op: string
  }
  project?: {
    naam: string
    adres: string | null
    postcode: string | null
    plaats: string | null
  } | null
  bedrijf?: {
    naam: string
    logo_url: string
    telefoon: string
    email: string
    website: string
    primaire_kleur: string
  }
  instellingen?: Record<string, unknown>
  items?: PortaalItemData[]
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  offerte: FileText,
  tekening: Image,
  factuur: Receipt,
  bericht: MessageSquare,
}

const TYPE_LABELS: Record<string, string> = {
  offerte: 'Offerte',
  tekening: 'Tekening',
  factuur: 'Factuur',
  bericht: 'Bericht',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  verstuurd: { label: 'Verstuurd', color: 'bg-blue-50 text-blue-700', icon: Clock },
  bekeken: { label: 'Bekeken', color: 'bg-gray-100 text-gray-700', icon: Eye },
  goedgekeurd: { label: 'Goedgekeurd', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  revisie: { label: 'Revisie gevraagd', color: 'bg-amber-50 text-amber-700', icon: RotateCcw },
  betaald: { label: 'Betaald', color: 'bg-green-50 text-green-700', icon: CreditCard },
  vervangen: { label: 'Vervangen', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function isImageFile(mimeType: string | null, filename: string): boolean {
  if (mimeType?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)
}

// ─── Bekeken Tracker Hook ───
function useBekekenTracker(token: string | undefined) {
  const bekekenSet = useRef(new Set<string>())
  const flushTimer = useRef<ReturnType<typeof setInterval>>()

  const flush = useCallback(() => {
    if (!token || bekekenSet.current.size === 0) return
    const ids = Array.from(bekekenSet.current)
    bekekenSet.current.clear()
    fetch('/api/portaal-bekeken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, item_ids: ids }),
    }).catch(() => {}) // fire-and-forget
  }, [token])

  useEffect(() => {
    if (!token) return
    // Flush elke 5 seconden
    flushTimer.current = setInterval(flush, 5000)
    // Flush bij page unload
    const handleUnload = () => flush()
    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    return () => {
      clearInterval(flushTimer.current)
      window.removeEventListener('beforeunload', handleUnload)
      flush() // final flush
    }
  }, [token, flush])

  const markBekeken = useCallback((itemId: string) => {
    bekekenSet.current.add(itemId)
  }, [])

  return { markBekeken }
}

// ─── Item Card Component ───
function PortaalItemCard({
  item,
  primaire_kleur,
  token,
  onReactie,
  onImageClick,
  markBekeken,
}: {
  item: PortaalItemData
  primaire_kleur: string
  token: string
  onReactie: () => void
  onImageClick: (images: { url: string; bestandsnaam: string; grootte?: number | null }[], index: number) => void
  markBekeken: (itemId: string) => void
}) {
  const TypeIcon = TYPE_ICONS[item.type] || FileText
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.verstuurd
  const StatusIcon = statusConfig.icon
  const cardRef = useRef<HTMLDivElement>(null)

  const images = item.bestanden.filter(b => isImageFile(b.mime_type, b.bestandsnaam))
  const files = item.bestanden.filter(b => !isImageFile(b.mime_type, b.bestandsnaam))

  // Klant-geüploade bestanden bij reacties
  const klantBestanden = item.bestanden.filter(b => b.uploaded_by === 'klant')

  // IntersectionObserver voor bekeken tracking
  useEffect(() => {
    if (!cardRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          markBekeken(item.id)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [item.id, markBekeken])

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: primaire_kleur + '15', color: primaire_kleur }}
          >
            <TypeIcon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-gray-900 truncate">{item.titel}</h3>
              {item.label && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{TYPE_LABELS[item.type]}</span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
            </div>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </div>
      </div>

      {/* Omschrijving — chat bubble voor bericht items */}
      {item.omschrijving && item.type === 'bericht' ? (
        <div className="px-5 pb-3">
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="rounded-2xl rounded-bl-md bg-gray-100 px-3.5 py-2">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.omschrijving}</p>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.created_at)}</p>
            </div>
          </div>
        </div>
      ) : item.omschrijving ? (
        <div className="px-5 pb-3">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.omschrijving}</p>
        </div>
      ) : null}

      {/* Bedrag */}
      {item.bedrag != null && item.type === 'factuur' && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
            <span className="text-sm text-gray-600">Bedrag</span>
            <span className="text-lg font-semibold text-gray-900">{formatCurrency(item.bedrag)}</span>
          </div>
        </div>
      )}

      {/* Mollie betaallink */}
      {item.mollie_payment_url && item.status !== 'betaald' && (
        <div className="px-5 pb-3">
          <a
            href={item.mollie_payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: primaire_kleur }}
          >
            <CreditCard className="w-4 h-4" />
            Online betalen
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Afbeeldingen — klik voor lightbox */}
      {images.length > 0 && (
        <div className="px-5 pb-3">
          <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => onImageClick(images.map(i => ({ url: i.url, bestandsnaam: i.bestandsnaam, grootte: i.grootte })), idx)}
                className="block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors cursor-zoom-in"
              >
                <img
                  src={img.thumbnail_url || img.url}
                  alt={img.bestandsnaam}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bestanden */}
      {files.length > 0 && (
        <div className="px-5 pb-3 space-y-1.5">
          {files.map((bestand) => (
            <a
              key={bestand.id}
              href={bestand.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
            >
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate flex-1">{bestand.bestandsnaam}</span>
              <Download className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}

      {/* Reacties */}
      {item.reacties.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-3 space-y-3">
          {item.reacties.map((reactie) => {
            const isGoedkeuring = reactie.type === 'goedkeuring'
            const isRevisie = reactie.type === 'revisie'
            const isBericht = reactie.type === 'bericht'

            // Find klant-uploaded bestanden for this reactie (matched by created_at proximity)
            const reactieBestanden = klantBestanden.filter(b => {
              const bTime = new Date(b.created_at).getTime()
              const rTime = new Date(reactie.created_at).getTime()
              return Math.abs(bTime - rTime) < 60000 // within 1 minute
            })

            // Chat-stijl voor bericht reacties
            if (isBericht && item.type === 'bericht') {
              return (
                <div key={reactie.id} className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div
                      className="rounded-2xl rounded-br-md px-3.5 py-2 text-white text-sm"
                      style={{ backgroundColor: primaire_kleur }}
                    >
                      {reactie.bericht && (
                        <p className="whitespace-pre-wrap">{reactie.bericht}</p>
                      )}
                      {reactieBestanden.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {reactieBestanden.map((b) => (
                            <a
                              key={b.id}
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              {b.bestandsnaam}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 text-right">
                      {reactie.klant_naam && `${reactie.klant_naam} · `}
                      {formatDateTime(reactie.created_at)}
                    </p>
                  </div>
                </div>
              )
            }

            // Standaard reactie kaart (goedkeuring/revisie/bericht op niet-bericht items)
            const bgColor = isGoedkeuring ? 'bg-green-50 border-green-200' : isRevisie ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
            const iconColor = isGoedkeuring ? 'text-green-600' : isRevisie ? 'text-amber-600' : 'text-gray-500'
            const ReactieIcon = isGoedkeuring ? CheckCircle2 : isRevisie ? RotateCcw : MessageSquare

            return (
              <div key={reactie.id} className={`rounded-xl border p-3 ${bgColor}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ReactieIcon className={`w-4 h-4 ${iconColor}`} />
                  <span className="text-sm font-medium text-gray-800">
                    {isGoedkeuring ? 'Goedgekeurd' : isRevisie ? 'Revisie gevraagd' : 'Bericht'}
                    {reactie.klant_naam && ` door ${reactie.klant_naam}`}
                  </span>
                </div>
                {reactie.bericht && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap ml-6">{reactie.bericht}</p>
                )}
                {reactieBestanden.length > 0 && (
                  <div className="ml-6 mt-2 space-y-1">
                    {reactieBestanden.map((b) => (
                      <a
                        key={b.id}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <Paperclip className="w-3 h-3" />
                        {b.bestandsnaam}
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1.5 ml-6">{formatDateTime(reactie.created_at)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Reactie formulier */}
      <PortaalReactieForm
        token={token}
        itemId={item.id}
        itemType={item.type}
        itemStatus={item.status}
        primaire_kleur={primaire_kleur}
        onReactie={onReactie}
      />
    </div>
  )
}

// ─── Main Page ───
export function PortaalPagina() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<PortaalData | null>(null)

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<{ url: string; bestandsnaam: string; grootte?: number | null }[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Bekeken tracker
  const { markBekeken } = useBekekenTracker(token)

  const fetchPortaal = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch(`/api/portaal-get?token=${encodeURIComponent(token)}`)
      if (!response.ok) {
        setError(response.status === 404 ? 'Portaal niet gevonden' : 'Er ging iets mis')
        return
      }
      const result = await response.json()
      setData(result)
    } catch {
      setError('Verbinding mislukt. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchPortaal()
  }, [fetchPortaal])

  // Mark portaal as bekeken on load
  useEffect(() => {
    if (!token || !data || data.status !== 'actief') return
    fetch('/api/portaal-bekeken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
  }, [token, data?.status])

  function handleImageClick(images: { url: string; bestandsnaam: string; grootte?: number | null }[], index: number) {
    setLightboxImages(images)
    setLightboxIndex(index)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="text-gray-600">{error || 'Portaal niet gevonden'}</p>
        </div>
      </div>
    )
  }

  if (data.status === 'gesloten') {
    return (
      <PortaalGesloten
        bedrijfsnaam={data.bedrijfsnaam || ''}
        telefoon={data.bedrijfs_telefoon}
        email={data.bedrijfs_email}
      />
    )
  }

  if (data.status === 'verlopen') {
    return (
      <PortaalVerlopen
        token={data.token || token || ''}
        bedrijfsnaam={data.bedrijfsnaam || ''}
        telefoon={data.bedrijfs_telefoon}
        email={data.bedrijfs_email}
      />
    )
  }

  const bedrijf = data.bedrijf!
  const project = data.project
  const portaal = data.portaal!
  const items = data.items || []
  const primaire_kleur = bedrijf.primaire_kleur || '#1a1a1a'
  const instellingen = (data.instellingen || {}) as Record<string, unknown>
  const toonContact = instellingen.contactgegevens_tonen !== false

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Lightbox */}
      {lightboxImages && (
        <PortaalLightbox
          images={lightboxImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {bedrijf.logo_url ? (
              <img
                src={bedrijf.logo_url}
                alt={bedrijf.naam}
                className="h-8 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaire_kleur }}
              >
                {bedrijf.naam.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-gray-900">{bedrijf.naam}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {project && (
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{project.naam}</h1>
            {(project.adres || project.plaats) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[project.adres, project.postcode, project.plaats].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        )}

        {portaal.instructie_tekst && (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{portaal.instructie_tekst}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Beschikbaar tot {formatDate(portaal.verloopt_op)}</span>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nog geen items gedeeld.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <PortaalItemCard
                key={item.id}
                item={item}
                primaire_kleur={primaire_kleur}
                token={token!}
                onReactie={fetchPortaal}
                onImageClick={handleImageClick}
                markBekeken={markBekeken}
              />
            ))}
          </div>
        )}

        {toonContact && (bedrijf.telefoon || bedrijf.email || bedrijf.website) && (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
              <Building2 className="w-4 h-4" />
              <span>Contact</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {bedrijf.telefoon && (
                <a href={`tel:${bedrijf.telefoon}`} className="inline-flex items-center gap-1.5 hover:text-gray-900">
                  <Phone className="w-3.5 h-3.5" />
                  {bedrijf.telefoon}
                </a>
              )}
              {bedrijf.email && (
                <a href={`mailto:${bedrijf.email}`} className="inline-flex items-center gap-1.5 hover:text-gray-900">
                  <Mail className="w-3.5 h-3.5" />
                  {bedrijf.email}
                </a>
              )}
              {bedrijf.website && (
                <a href={bedrijf.website.startsWith('http') ? bedrijf.website : `https://${bedrijf.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-gray-900">
                  <Globe className="w-3.5 h-3.5" />
                  {bedrijf.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400">Powered by FORGEdesk</p>
      </footer>
    </div>
  )
}
