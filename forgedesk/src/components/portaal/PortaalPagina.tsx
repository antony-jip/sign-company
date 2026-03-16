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
} from 'lucide-react'
import { PortaalVerlopen } from './PortaalVerlopen'
import { PortaalGesloten } from './PortaalGesloten'
import { PortaalChat } from './PortaalChat'
import type { SendPayload } from './PortaalChatInput'
import type { PortaalItem, PortaalReactie } from '@/types'

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
  // Chat fields
  bericht_type?: string | null
  bericht_tekst?: string | null
  foto_url?: string | null
  afzender?: string | null
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

/** Convert API response items to PortaalItem type for chat component */
function toPortaalItems(apiItems: PortaalItemData[]): PortaalItem[] {
  return apiItems.map(item => ({
    id: item.id,
    user_id: '',
    project_id: '',
    portaal_id: '',
    type: item.type as PortaalItem['type'],
    titel: item.titel,
    omschrijving: item.omschrijving || undefined,
    label: item.label || undefined,
    status: item.status as PortaalItem['status'],
    bekeken_op: item.bekeken_op || undefined,
    mollie_payment_url: item.mollie_payment_url || undefined,
    bedrag: item.bedrag || undefined,
    zichtbaar_voor_klant: true,
    volgorde: item.volgorde,
    bericht_type: (item.bericht_type || 'item') as PortaalItem['bericht_type'],
    bericht_tekst: item.bericht_tekst || undefined,
    foto_url: item.foto_url || undefined,
    afzender: (item.afzender || 'bedrijf') as PortaalItem['afzender'],
    bestanden: item.bestanden.map(b => ({
      id: b.id,
      portaal_item_id: item.id,
      bestandsnaam: b.bestandsnaam,
      mime_type: b.mime_type || undefined,
      grootte: b.grootte || undefined,
      url: b.url,
      thumbnail_url: b.thumbnail_url || undefined,
      uploaded_by: (b.uploaded_by || 'bedrijf') as 'bedrijf' | 'klant',
      created_at: b.created_at,
    })),
    reacties: item.reacties.map(r => ({
      id: r.id,
      portaal_item_id: item.id,
      type: r.type as PortaalReactie['type'],
      bericht: r.bericht || undefined,
      klant_naam: r.klant_naam || undefined,
      created_at: r.created_at,
    })),
    created_at: item.created_at,
  }))
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
  const [data, setData] = useState<PortaalData | null>(null)
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

  // Mark individual items as bekeken
  useEffect(() => {
    if (!data?.items) return
    for (const item of data.items) {
      if (!item.bekeken_op) markBekeken(item.id)
    }
  }, [data?.items, markBekeken])

  // ── Client send handler (text + photo via portaal-reactie API) ──────────
  async function handleClientSend(payload: SendPayload) {
    if (!token || !data?.portaal) return

    if (payload.kind === 'tekst') {
      // Create a text reaction on the portaal (we'll use a generic bericht reaction)
      await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: getLastItemId(),
          type: 'bericht',
          bericht: payload.tekst,
          klant_naam: getStoredName(),
        }),
      })
      await fetchPortaal()
    } else if (payload.kind === 'foto') {
      // Upload photo first, then create reaction
      const formData = new FormData()
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(payload.file)
      })

      const uploadRes = await fetch('/api/portaal-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: getLastItemId(),
          bestandsnaam: payload.file.name,
          mime_type: payload.file.type,
          data: base64,
        }),
      })

      if (uploadRes.ok) {
        await fetch('/api/portaal-reactie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            portaal_item_id: getLastItemId(),
            type: 'bericht',
            bericht: payload.caption || 'Foto gedeeld',
            klant_naam: getStoredName(),
          }),
        })
      }
      await fetchPortaal()
    }
  }

  function getLastItemId(): string {
    // Use the most recent item as the parent for client reactions
    const items = data?.items || []
    return items.length > 0 ? items[items.length - 1].id : ''
  }

  function getStoredName(): string {
    return localStorage.getItem('forgedesk_portaal_klant_naam') || ''
  }

  // ── Client approve/revisie handlers ─────────────────────────────────────
  async function handleApprove(itemId: string) {
    if (!token) return
    await fetch('/api/portaal-reactie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        portaal_item_id: itemId,
        type: 'goedkeuring',
        klant_naam: getStoredName(),
      }),
    })
    await fetchPortaal()
  }

  async function handleRevisie(itemId: string) {
    if (!token) return
    const bericht = prompt('Beschrijf de gewenste wijzigingen:')
    if (!bericht) return
    await fetch('/api/portaal-reactie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        portaal_item_id: itemId,
        type: 'revisie',
        bericht,
        klant_naam: getStoredName(),
      }),
    })
    await fetchPortaal()
  }

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
  const chatItems = toPortaalItems(rawItems)
  const primaire_kleur = bedrijf.primaire_kleur || '#1a1a1a'
  const instellingen = (data.instellingen || {}) as Record<string, unknown>
  const toonContact = instellingen.contactgegevens_tonen !== false
  const toonLogo = instellingen.bedrijfslogo_op_portaal !== false
  const kanBerichtenSturen = instellingen.klant_kan_berichten_sturen !== false

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
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
              <span className="font-semibold text-gray-900">{bedrijf.naam}</span>
              {project && (
                <p className="text-xs text-gray-500">{project.naam}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Geldig tot {formatDate(portaal.verloopt_op)}</span>
          </div>
        </div>
      </header>

      {/* Instruction text */}
      {portaal.instructie_tekst && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4">
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{portaal.instructie_tekst}</p>
          </div>
        </div>
      )}

      {/* Chat timeline */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <PortaalChat
          items={chatItems}
          isPublic={true}
          bedrijfNaam={bedrijf.naam}
          onSend={kanBerichtenSturen ? handleClientSend : undefined}
          onApprove={handleApprove}
          onRevisie={handleRevisie}
          instellingen={instellingen}
        />
      </div>

      {/* Contact section */}
      {toonContact && (bedrijf.telefoon || bedrijf.email || bedrijf.website) && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-4">
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
        </div>
      )}

      {/* Footer — geen FORGEdesk branding */}
      <div className="h-4 flex-shrink-0" />
    </div>
  )
}
