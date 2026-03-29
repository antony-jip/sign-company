import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { PortaalVerlopen } from './PortaalVerlopen'
import { PortaalGesloten } from './PortaalGesloten'
import { PortaalHeader } from './PortaalHeader'
import { PortaalSidebar } from './PortaalSidebar'
import { PortaalFeed } from './PortaalFeed'
import { PortaalLightbox } from './PortaalLightbox'

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
  foto_url?: string | null
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

interface PortaalApiResponse {
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
    status?: string
    adres: string | null
    postcode: string | null
    plaats: string | null
    start_datum?: string
    deadline?: string
  } | null
  bedrijf?: {
    naam: string
    logo_url: string
    telefoon: string
    email: string
    website: string
    primaire_kleur: string
  }
  montage?: { datum: string; start_tijd?: string } | null
  instellingen?: Record<string, unknown>
  items?: PortaalItemData[]
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

// ── Main Component ───────────────────────────────────────────────────────

export function PortaalPagina() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<PortaalApiResponse | null>(null)
  const [klantNaam, setKlantNaam] = useState(() => {
    try { return localStorage.getItem('doen_portaal_klant_naam') || '' } catch (err) { return '' }
  })
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const { markBekeken } = useBekekenTracker(token)

  useEffect(() => {
    if (klantNaam) {
      try { localStorage.setItem('doen_portaal_klant_naam', klantNaam) } catch (err) { /* ignore */ }
    }
  }, [klantNaam])

  const fetchPortaal = useCallback(async () => {
    if (!token) return
    try {
      const response = await fetch(`/api/portaal-get?token=${encodeURIComponent(token)}`)
      if (!response.ok) {
        setError(response.status === 404 ? 'Portaal niet gevonden' : 'Er ging iets mis')
        return
      }
      setData(await response.json())
    } catch (err) {
      setError('Verbinding mislukt. Probeer het later opnieuw.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchPortaal() }, [fetchPortaal])

  // Poll every 15s + refetch on tab focus
  useEffect(() => {
    if (!token || !data || data.status !== 'actief') return
    const interval = setInterval(fetchPortaal, 15000)
    function handleVisibility() {
      if (document.visibilityState === 'visible') fetchPortaal()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [token, data?.status, fetchPortaal])

  // Mark portaal as bekeken
  useEffect(() => {
    if (!token || !data || data.status !== 'actief') return
    fetch('/api/portaal-bekeken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {})
  }, [token, data?.status])

  // Mark items as bekeken
  const unbekekenIds = useMemo(
    () => (data?.items || []).filter(i => !i.bekeken_op).map(i => i.id).join(','),
    [data?.items],
  )
  useEffect(() => {
    if (!unbekekenIds) return
    for (const id of unbekekenIds.split(',')) markBekeken(id)
  }, [unbekekenIds, markBekeken])

  // ── Loading / Error / Expired / Closed ────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9B9B95]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#9B9B95] mx-auto" />
          <p className="text-[#6B6B66]">{error || 'Portaal niet gevonden'}</p>
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

  const bedrijf = data.bedrijf
  const project = data.project
  const portaal = data.portaal
  const rawItems = data.items || []

  if (!bedrijf || !portaal) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#9B9B95] mx-auto" />
          <p className="text-[#6B6B66]">Portaal kon niet geladen worden</p>
        </div>
      </div>
    )
  }

  const instellingen = (data.instellingen || {}) as Record<string, unknown>
  const toonContact = instellingen.contactgegevens_tonen !== false
  const toonLogo = instellingen.bedrijfslogo_op_portaal !== false
  const kanOfferteGoedkeuren = instellingen.klant_kan_offerte_goedkeuren !== false
  const kanTekeningGoedkeuren = instellingen.klant_kan_tekening_goedkeuren !== false

  // Build documents list for sidebar from item bestanden
  const documenten = rawItems
    .filter(i => i.bestanden?.length && ['offerte', 'factuur', 'tekening'].includes(i.type))
    .flatMap(i =>
      (i.bestanden || [])
        .filter(b => b.mime_type === 'application/pdf')
        .map(b => ({ naam: b.bestandsnaam, url: b.url, type: i.type }))
    )

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
      <PortaalHeader
        bedrijfNaam={bedrijf.naam}
        logoUrl={toonLogo ? bedrijf.logo_url : undefined}
        verlooptOp={portaal.verloopt_op}
        projectNaam={project?.naam}
      />

      {/* Project bar */}
      {project && (
        <div className="flex-shrink-0 border-b" style={{ borderColor: '#E8E6E1', backgroundColor: '#fff' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <h1
              className="text-base font-bold"
              style={{ color: '#191919', fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              {project.naam}
            </h1>
          </div>
        </div>
      )}

      {/* Mobile sidebar (accordion) */}
      <div className="md:hidden max-w-5xl mx-auto w-full px-4 pt-4">
        <PortaalSidebar
          project={project || { naam: '' }}
          bedrijf={bedrijf}
          montage={data.montage}
          documenten={documenten}
          toonContact={toonContact}
          isMobiel
        />
      </div>

      {/* Main content: feed + sidebar */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="flex gap-8">
          {/* Feed */}
          <div className="flex-1 min-w-0">
            {/* Instruction text */}
            {portaal.instructie_tekst && (
              <div
                className="rounded-[10px] px-5 py-4 mb-4"
                style={{ backgroundColor: '#fff', border: '0.5px solid #E8E6E1' }}
              >
                <p className="whitespace-pre-wrap" style={{ fontSize: 13, color: '#5A5A55', lineHeight: 1.6 }}>
                  {portaal.instructie_tekst}
                </p>
              </div>
            )}

            <PortaalFeed
              items={rawItems}
              token={token!}
              klantNaam={klantNaam}
              bedrijfNaam={bedrijf.naam}
              kanOfferteGoedkeuren={kanOfferteGoedkeuren}
              kanTekeningGoedkeuren={kanTekeningGoedkeuren}
              isPublic
              onReactie={fetchPortaal}
              onImageClick={(url) => setLightboxUrl(url)}
            />
          </div>

          {/* Desktop sidebar */}
          <div className="hidden md:block w-[260px] flex-shrink-0">
            <PortaalSidebar
              project={project || { naam: '' }}
              bedrijf={bedrijf}
              montage={data.montage}
              documenten={documenten}
              toonContact={toonContact}
            />
          </div>
        </div>
      </main>

      {/* Klant naam prompt (eerste keer) */}
      {!klantNaam && rawItems.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 py-3 px-4 flex items-center justify-center gap-3"
          style={{ backgroundColor: '#fff', borderTop: '0.5px solid #E8E6E1', boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }}
        >
          <span className="text-sm" style={{ color: '#5A5A55' }}>Uw naam:</span>
          <input
            type="text"
            value={klantNaam}
            onChange={(e) => setKlantNaam(e.target.value)}
            placeholder="Vul uw naam in"
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A535C]/30 focus:border-[#1A535C]"
            style={{ borderColor: '#E8E6E1', maxWidth: 200 }}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <PortaalLightbox
          images={[{ url: lightboxUrl, bestandsnaam: '' }]}
          startIndex={0}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  )
}
