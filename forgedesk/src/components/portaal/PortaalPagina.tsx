import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { PortaalVerlopen } from './PortaalVerlopen'
import { PortaalGesloten } from './PortaalGesloten'

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

function PortaalItemCard({ item, primaire_kleur }: { item: PortaalItemData; primaire_kleur: string }) {
  const TypeIcon = TYPE_ICONS[item.type] || FileText
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.verstuurd
  const StatusIcon = statusConfig.icon

  const images = item.bestanden.filter(b => isImageFile(b.mime_type, b.bestandsnaam))
  const files = item.bestanden.filter(b => !isImageFile(b.mime_type, b.bestandsnaam))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
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

      {/* Omschrijving */}
      {item.omschrijving && (
        <div className="px-5 pb-3">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.omschrijving}</p>
        </div>
      )}

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

      {/* Afbeeldingen */}
      {images.length > 0 && (
        <div className="px-5 pb-3">
          <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {images.map((img) => (
              <a
                key={img.id}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
              >
                <img
                  src={img.thumbnail_url || img.url}
                  alt={img.bestandsnaam}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              </a>
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
        <div className="border-t border-gray-100 px-5 py-3 space-y-2">
          {item.reacties.map((reactie) => (
            <div key={reactie.id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-gray-700">{reactie.klant_naam || 'Klant'}</span>
                <span className="text-xs text-gray-400">{formatDate(reactie.created_at)}</span>
              </div>
              {reactie.bericht && (
                <p className="text-gray-600 whitespace-pre-wrap">{reactie.bericht}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PortaalPagina() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<PortaalData | null>(null)

  useEffect(() => {
    if (!token) return

    async function fetchPortaal() {
      try {
        const response = await fetch(`/api/portaal-get?token=${encodeURIComponent(token!)}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Portaal niet gevonden')
          } else {
            setError('Er ging iets mis')
          }
          return
        }
        const result = await response.json()
        setData(result)
      } catch {
        setError('Verbinding mislukt. Probeer het later opnieuw.')
      } finally {
        setLoading(false)
      }
    }

    fetchPortaal()
  }, [token])

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

  // Gesloten
  if (data.status === 'gesloten') {
    return (
      <PortaalGesloten
        bedrijfsnaam={data.bedrijfsnaam || ''}
        telefoon={data.bedrijfs_telefoon}
        email={data.bedrijfs_email}
      />
    )
  }

  // Verlopen
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

  // Actief
  const bedrijf = data.bedrijf!
  const project = data.project
  const portaal = data.portaal!
  const items = data.items || []
  const primaire_kleur = bedrijf.primaire_kleur || '#1a1a1a'
  const instellingen = (data.instellingen || {}) as Record<string, unknown>
  const toonContact = instellingen.contactgegevens_tonen !== false

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
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
        {/* Project info */}
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

        {/* Instructietekst */}
        {portaal.instructie_tekst && (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{portaal.instructie_tekst}</p>
          </div>
        )}

        {/* Verloopt datum */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>Beschikbaar tot {formatDate(portaal.verloopt_op)}</span>
        </div>

        {/* Items timeline */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nog geen items gedeeld.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <PortaalItemCard key={item.id} item={item} primaire_kleur={primaire_kleur} />
            ))}
          </div>
        )}

        {/* Contact footer */}
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

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400">Powered by FORGEdesk</p>
      </footer>
    </div>
  )
}
