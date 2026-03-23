import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Loader2,
  AlertCircle,
  Calendar,
  Building2,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { SpectrumBar } from '@/components/ui/SpectrumBar'
import { PortaalVerlopen } from './PortaalVerlopen'
import { PortaalGesloten } from './PortaalGesloten'
import { PortaalOfferteSection } from './PortaalOfferteSection'
import { PortaalDrukproevenSection } from './PortaalDrukproevenSection'
import { PortaalBerichtenSection } from './PortaalBerichtenSection'

// ── API Response Types ────────────────────────────────────────────────────

interface PortaalBestandData {
  id: string
  bestandsnaam: string
  mime_type: string | null
  grootte: number | null
  url: string
  thumbnail_url: string | null
  uploaded_by: string
  created_at: string
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
  bestanden: PortaalBestandData[]
  reacties: PortaalReactieData[]
  bericht_type?: string | null
  bericht_tekst?: string | null
  foto_url?: string | null
  afzender?: string | null
  offerte_publiek_token?: string | null
}

interface PortaalData {
  status: 'actief' | 'verlopen' | 'gesloten'
  token?: string
  bedrijfsnaam?: string
  bedrijfs_telefoon?: string
  bedrijfs_email?: string
  logo_url?: string
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

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

// ── Bekeken Tracker Hook ─────────────────────────────────────────────────

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
    }).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token) return
    flushTimer.current = setInterval(flush, 5000)
    const handleUnload = () => flush()
    window.addEventListener('beforeunload', handleUnload)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(flushTimer.current)
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
      flush()
    }
  }, [token, flush])

  const markBekeken = useCallback((itemId: string) => {
    bekekenSet.current.add(itemId)
  }, [])

  return { markBekeken }
}

// ── Phase Labels ─────────────────────────────────────────────────────────

const FASE_LABELS = ['Offerte', 'Akkoord', 'Productie', 'Montage', 'Klaar']

function PortaalVoortgang({ percentage }: { percentage: number }) {
  return (
    <div className="space-y-2">
      <SpectrumBar percentage={percentage} height={8} className="rounded-full" />
      <div className="flex justify-between">
        {FASE_LABELS.map((label, i) => {
          const labelPct = (i / (FASE_LABELS.length - 1)) * 100
          const isActive = percentage >= labelPct
          return (
            <span
              key={label}
              style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#191919' : '#A0A098',
              }}
            >
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── Action Summary Component ─────────────────────────────────────────────

function PortaalActionSummary({ offertes, drukproeven }: {
  offertes: PortaalItemData[]
  drukproeven: PortaalItemData[]
}) {
  const pendingOffertes = offertes.filter(i => i.status !== 'goedgekeurd' && i.status !== 'betaald')
  const pendingDrukproeven = drukproeven.filter(i => i.status !== 'goedgekeurd')
  const totalPending = pendingOffertes.length + pendingDrukproeven.length
  const totalItems = offertes.length + drukproeven.length
  const completed = totalItems - totalPending

  if (totalItems === 0) return null

  const allDone = totalPending === 0

  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{
        backgroundColor: allDone ? '#E4F0EA' : '#FFFFFF',
        border: `0.5px solid ${allDone ? '#2D6B48' : '#E6E4E0'}`,
      }}
    >
      <div className="flex items-center gap-3">
        {allDone ? (
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#2D6B48' }} />
        ) : (
          <Clock className="w-5 h-5 flex-shrink-0" style={{ color: '#A0A098' }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: allDone ? '#2D6B48' : '#191919' }}>
            {allDone
              ? 'Alles is afgehandeld!'
              : `${totalPending} ${totalPending === 1 ? 'item wacht' : 'items wachten'} op uw goedkeuring`}
          </p>
          <p className="font-mono mt-0.5" style={{ fontSize: 10, color: '#A0A098' }}>
            {completed} van {totalItems} afgerond
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────

export function PortaalPagina() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<PortaalData | null>(null)
  const [klantNaam, setKlantNaam] = useState(() => {
    try { return localStorage.getItem('forgedesk_portaal_klant_naam') || '' } catch { return '' }
  })
  const { markBekeken } = useBekekenTracker(token)

  function handleKlantNaamChange(naam: string) {
    setKlantNaam(naam)
    try { localStorage.setItem('forgedesk_portaal_klant_naam', naam) } catch { /* ignore */ }
  }

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

  // Poll for new messages every 5 seconds + refetch on tab focus
  useEffect(() => {
    if (!token || !data || data.status !== 'actief') return
    const interval = setInterval(() => {
      fetchPortaal()
    }, 5000)
    // Refetch immediately when tab becomes visible again (mobile resume)
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        fetchPortaal()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [token, data?.status, fetchPortaal])

  // Mark portaal as bekeken on load
  useEffect(() => {
    if (!token || !data || data.status !== 'actief') return
    fetch('/api/portaal-bekeken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
  }, [token, data?.status])

  // Mark individual items as bekeken
  useEffect(() => {
    if (!data?.items) return
    for (const item of data.items) {
      if (!item.bekeken_op) markBekeken(item.id)
    }
  }, [data?.items, markBekeken])

  // ── Loading / Error / Expired / Closed states ───────────────────────────
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
    const inst = (data.instellingen || {}) as Record<string, unknown>
    return (
      <PortaalGesloten
        bedrijfsnaam={data.bedrijfsnaam || ''}
        telefoon={inst.contactgegevens_tonen !== false ? data.bedrijfs_telefoon : undefined}
        email={inst.contactgegevens_tonen !== false ? data.bedrijfs_email : undefined}
        logoUrl={inst.bedrijfslogo_op_portaal !== false ? data.logo_url : undefined}
      />
    )
  }

  if (data.status === 'verlopen') {
    const inst = (data.instellingen || {}) as Record<string, unknown>
    return (
      <PortaalVerlopen
        token={data.token || token || ''}
        bedrijfsnaam={data.bedrijfsnaam || ''}
        telefoon={inst.contactgegevens_tonen !== false ? data.bedrijfs_telefoon : undefined}
        email={inst.contactgegevens_tonen !== false ? data.bedrijfs_email : undefined}
        logoUrl={inst.bedrijfslogo_op_portaal !== false ? data.logo_url : undefined}
      />
    )
  }

  const bedrijf = data.bedrijf!
  const project = data.project
  const portaal = data.portaal!
  const rawItems = data.items || []
  const instellingen = (data.instellingen || {}) as Record<string, unknown>
  const gebruikKleuren = instellingen.bedrijfskleuren_gebruiken !== false
  const primaire_kleur = gebruikKleuren ? (bedrijf.primaire_kleur || '#1a1a1a') : '#1a1a1a'
  const toonContact = instellingen.contactgegevens_tonen !== false
  const toonLogo = instellingen.bedrijfslogo_op_portaal !== false
  const kanBerichtenSturen = instellingen.klant_kan_berichten_sturen !== false
  const kanOfferteGoedkeuren = instellingen.klant_kan_offerte_goedkeuren !== false
  const kanTekeningGoedkeuren = instellingen.klant_kan_tekening_goedkeuren !== false

  // Filter items per sectie
  const offerteItems = rawItems.filter(i => i.type === 'offerte' && (!i.bericht_type || i.bericht_type === 'item'))
  const tekeningItems = rawItems.filter(i => i.type === 'tekening' && (!i.bericht_type || i.bericht_type === 'item'))
  const berichtItems = rawItems.filter(i => i.bericht_type === 'tekst' || i.type === 'bericht')

  // Calculate progress from portal items
  const allApprovalItems = [...offerteItems, ...tekeningItems]
  const completedItems = allApprovalItems.filter(i => i.status === 'goedgekeurd' || i.status === 'betaald').length
  const portaalProgress = allApprovalItems.length > 0
    ? Math.round((completedItems / allApprovalItems.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Spectrum strip */}
      <SpectrumBar percentage={portaalProgress} height={5} className="rounded-none" />

      {/* Header */}
      <header className="flex-shrink-0" style={{ backgroundColor: '#FFFFFF', borderBottom: '0.5px solid #E6E4E0' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {toonLogo && bedrijf.logo_url ? (
              <img
                src={bedrijf.logo_url}
                alt={bedrijf.naam}
                className="h-10 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaire_kleur }}
              >
                {bedrijf.naam.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-semibold" style={{ fontSize: 14, color: '#191919' }}>{bedrijf.naam}</span>
              {project && (
                <p style={{ fontSize: 12, color: '#5A5A55' }}>{project.naam}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ fontSize: 11, color: '#A0A098' }}>
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-mono">Geldig tot {formatDate(portaal.verloopt_op)}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Instruction text */}
        {portaal.instructie_tekst && (
          <div className="rounded-[10px] px-5 py-4" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E6E4E0' }}>
            <p className="whitespace-pre-wrap" style={{ fontSize: 13, color: '#5A5A55', lineHeight: 1.6 }}>{portaal.instructie_tekst}</p>
          </div>
        )}

        {/* Action summary */}
        {/* Progress bar with phase labels */}
        <PortaalVoortgang percentage={portaalProgress} />

        {/* Action summary */}
        <PortaalActionSummary
          offertes={offerteItems}
          drukproeven={tekeningItems}
        />

        {/* Offertes section */}
        {offerteItems.length > 0 && (
          <PortaalOfferteSection
            items={offerteItems}
            token={token!}
            klantNaam={klantNaam}
            onKlantNaamChange={handleKlantNaamChange}
            onReactie={fetchPortaal}
            primaire_kleur={primaire_kleur}
            kanGoedkeuren={kanOfferteGoedkeuren}
          />
        )}

        {/* Drukproeven section */}
        {tekeningItems.length > 0 && (
          <PortaalDrukproevenSection
            items={tekeningItems}
            token={token!}
            klantNaam={klantNaam}
            onReactie={fetchPortaal}
            primaire_kleur={primaire_kleur}
            kanGoedkeuren={kanTekeningGoedkeuren}
          />
        )}

        {/* Berichten section */}
        <PortaalBerichtenSection
          items={berichtItems}
          allItems={rawItems}
          token={token!}
          klantNaam={klantNaam}
          kanBerichtenSturen={kanBerichtenSturen}
          primaire_kleur={primaire_kleur}
          onReactie={fetchPortaal}
        />
      </main>

      {/* Contact section */}
      {toonContact && (bedrijf.telefoon || bedrijf.email || bedrijf.website) && (
        <div className="max-w-2xl mx-auto w-full px-4 pb-4">
          <div className="rounded-[10px] px-5 py-4 space-y-2" style={{ backgroundColor: '#FFFFFF', border: '0.5px solid #E6E4E0' }}>
            <div className="flex items-center gap-2 font-medium" style={{ fontSize: 12, color: '#5A5A55' }}>
              <Building2 className="w-4 h-4" />
              <span>Contact</span>
            </div>
            <div className="flex flex-wrap gap-4" style={{ fontSize: 13, color: '#5A5A55' }}>
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
        </div>
      )}

      <div className="h-4 flex-shrink-0" />
    </div>
  )
}
