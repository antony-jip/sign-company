import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { PortaalVerlopen } from './PortaalVerlopen'
import { PortaalGesloten } from './PortaalGesloten'
import { PortaalSidebar, ProjectStatus } from './PortaalSidebar'
import { PortaalFeed } from './PortaalFeed'
import { PortaalLightbox } from './PortaalLightbox'
import { KlantKop, MogelijkGemaaktDoor, invoerVeld, knopPetrol } from '@/components/klantpagina/Klantstijl'

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
  bedrag_excl?: number | null
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

function formatDatum(dateStr: string): string {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr))
}

// ── Main Component ───────────────────────────────────────────────────────

export function PortaalPagina() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<PortaalApiResponse | null>(null)
  // Alleen een bevestigde, volledige naam telt. De naambalk zette voorheen elke
  // toetsaanslag direct als naam en verdween dan, zodat er "J" bleef staan bij
  // elk bericht en akkoord; zo'n halve waarde van eerder negeren we hier.
  const [klantNaam, setKlantNaam] = useState(() => {
    try {
      const opgeslagen = (localStorage.getItem('doen_portaal_klant_naam') || '').trim()
      return opgeslagen.length >= 2 ? opgeslagen : ''
    } catch (err) { return '' }
  })
  const [naamInvoer, setNaamInvoer] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const { markBekeken } = useBekekenTracker(token)

  useEffect(() => {
    if (klantNaam) {
      try { localStorage.setItem('doen_portaal_klant_naam', klantNaam) } catch (err) { /* ignore */ }
    }
  }, [klantNaam])

  function bevestigNaam() {
    const naam = naamInvoer.trim()
    if (naam.length >= 2) setKlantNaam(naam)
  }

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

  // White-label: de browsertab toont het bedrijf, niet de tool
  useEffect(() => {
    const naam = data?.bedrijf?.naam || data?.bedrijfsnaam
    const project = data?.project?.naam
    if (naam) document.title = project ? `${project} · ${naam}` : `${naam} · klantportaal`
  }, [data?.bedrijf?.naam, data?.bedrijfsnaam, data?.project?.naam])

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
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#9B9B95]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F5] p-4">
        <div className="w-full max-w-md rounded-xl bg-[#FFFFFF] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h1 className="text-xl font-bold tracking-[-0.3px] text-[#1A1A1A]">Deze link werkt niet meer</h1>
          <p className="mt-2 text-sm text-[#6B6B66]">
            {error === 'Portaal niet gevonden'
              ? 'De link naar dit portaal is niet geldig. Neem contact op met het bedrijf dat je de link stuurde.'
              : error || 'Er ging iets mis. Probeer het later opnieuw.'}
          </p>
        </div>
      </div>
    )
  }

  const instellingen = (data.instellingen || {}) as Record<string, unknown>
  const toonContact = instellingen.contactgegevens_tonen !== false
  const toonLogo = instellingen.bedrijfslogo_op_portaal !== false
  const kopKleur = (instellingen.portaal_header_kleur as string | undefined) || undefined

  if (data.status === 'gesloten') {
    return (
      <PortaalGesloten
        bedrijfsnaam={data.bedrijfsnaam || ''}
        telefoon={toonContact ? data.bedrijfs_telefoon : undefined}
        email={toonContact ? data.bedrijfs_email : undefined}
        logoUrl={toonLogo ? data.logo_url : undefined}
        kopKleur={kopKleur}
      />
    )
  }

  if (data.status === 'verlopen') {
    return (
      <PortaalVerlopen
        token={data.token || token || ''}
        bedrijfsnaam={data.bedrijfsnaam || ''}
        telefoon={toonContact ? data.bedrijfs_telefoon : undefined}
        email={toonContact ? data.bedrijfs_email : undefined}
        logoUrl={toonLogo ? data.logo_url : undefined}
        kopKleur={kopKleur}
      />
    )
  }

  const bedrijf = data.bedrijf
  const project = data.project
  const portaal = data.portaal
  const rawItems = data.items || []

  if (!bedrijf || !portaal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7F5] p-4">
        <div className="w-full max-w-md rounded-xl bg-[#FFFFFF] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-sm text-[#6B6B66]">Het portaal kon niet geladen worden. Probeer het later opnieuw.</p>
        </div>
      </div>
    )
  }

  const kanOfferteGoedkeuren = instellingen.klant_kan_offerte_goedkeuren !== false
  const kanTekeningGoedkeuren = instellingen.klant_kan_tekening_goedkeuren !== false
  const kanBerichtenSturen = instellingen.klant_kan_berichten_sturen !== false
  const kanBestandenUploaden = instellingen.klant_kan_bestanden_uploaden !== false

  // Build documents list for sidebar from item bestanden
  const documenten = rawItems
    .filter(i => i.bestanden?.length && ['offerte', 'factuur', 'tekening'].includes(i.type))
    .flatMap(i =>
      (i.bestanden || [])
        .filter(b => b.mime_type === 'application/pdf')
        .map(b => ({ naam: b.bestandsnaam, url: b.url, type: i.type }))
    )

  const sidebar = (
    <PortaalSidebar
      project={project || { naam: '' }}
      bedrijf={bedrijf}
      montage={data.montage}
      documenten={documenten}
      toonContact={toonContact}
    />
  )
  const toonNaambalk = !klantNaam && rawItems.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7F5]">
      <KlantKop kleur={kopKleur} logoUrl={toonLogo ? bedrijf.logo_url : undefined} bedrijfsnaam={bedrijf.naam}>
        <span className="hidden font-mono text-xs sm:inline">Geldig tot {formatDatum(portaal.verloopt_op)}</span>
      </KlantKop>

      <main className={`mx-auto w-full max-w-5xl flex-1 px-4 pt-8 md:px-8 md:pt-12 ${toonNaambalk ? 'pb-32' : 'pb-16'}`}>
        <header className="mb-8">
          <p className="text-sm text-[#6B6B66]">Je project bij {bedrijf.naam}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="break-words text-[28px] font-bold leading-[1.15] tracking-[-0.3px] text-[#1A1A1A] md:text-[34px]">
              {project?.naam || 'Klantportaal'}
            </h1>
            {project?.status && <ProjectStatus status={project.status} />}
          </div>
          {portaal.instructie_tekst && (
            <p className="mt-4 max-w-[62ch] whitespace-pre-wrap text-[15px] leading-relaxed text-[#3A3A35]">
              {portaal.instructie_tekst}
            </p>
          )}
        </header>

        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            <PortaalFeed
              items={rawItems}
              token={token!}
              klantNaam={klantNaam}
              bedrijfNaam={bedrijf.naam}
              kanOfferteGoedkeuren={kanOfferteGoedkeuren}
              kanTekeningGoedkeuren={kanTekeningGoedkeuren}
              kanBerichtenSturen={kanBerichtenSturen}
              kanBestandenUploaden={kanBestandenUploaden}
              isPublic
              onReactie={fetchPortaal}
              onImageClick={(url) => setLightboxUrl(url)}
            />
          </div>
          <div className="w-full md:w-[280px] md:shrink-0">{sidebar}</div>
        </div>

        <footer className="mt-12 space-y-1 text-center text-xs text-[#9B9B95]">
          <p>{bedrijf.naam}</p>
          <p className="sm:hidden">Portaal geldig tot {formatDatum(portaal.verloopt_op)}</p>
          <div className="pt-4">
            <MogelijkGemaaktDoor />
          </div>
        </footer>
      </main>

      {/* Klant naam prompt (eerste keer). De naam telt pas na Enter, de knop
          of het verlaten van het veld, zodat de balk niet na de eerste letter
          verdwijnt. */}
      {toonNaambalk && (
        <form
          onSubmit={(e) => { e.preventDefault(); bevestigNaam() }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EBEBEB] bg-[#FFFFFF]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-3 md:px-4">
            <label htmlFor="portaal-klant-naam" className="hidden shrink-0 text-sm text-[#6B6B66] sm:inline">
              Hoe mogen we je noemen?
            </label>
            <input
              id="portaal-klant-naam"
              type="text"
              value={naamInvoer}
              onChange={(e) => setNaamInvoer(e.target.value)}
              onBlur={bevestigNaam}
              placeholder="Je naam"
              autoComplete="name"
              aria-label="Je naam"
              className={`${invoerVeld} h-11 max-w-xs py-0`}
            />
            <button type="submit" disabled={naamInvoer.trim().length < 2} className={`${knopPetrol} h-11 shrink-0`}>
              Opslaan
            </button>
          </div>
        </form>
      )}

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
