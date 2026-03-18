import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink, Send, Image, Receipt, CreditCard, MessageCircle,
  ChevronDown, Check, Eye, RotateCcw, Clock, ImageIcon, FileText,
  Paperclip, X
} from 'lucide-react'
import { toast } from 'sonner'
import { getPortaalByProject, getPortaalItems, createPortaalItem, getOffertesByProject, getFacturenByProject } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { uploadFile } from '@/services/storageService'
import type { ProjectPortaal, PortaalItem, Offerte, Factuur } from '@/types'

interface PortaalCompactCardProps {
  projectId: string
}

const currencyFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

const statusConfig: Record<string, { label: string; color: string; icon: typeof Check }> = {
  verstuurd:   { label: 'Verstuurd',   color: 'text-blue-600 bg-blue-50',     icon: Send },
  bekeken:     { label: 'Bekeken',     color: 'text-amber-600 bg-amber-50',   icon: Eye },
  goedgekeurd: { label: 'Goedgekeurd', color: 'text-emerald-600 bg-emerald-50', icon: Check },
  revisie:     { label: 'Revisie',     color: 'text-orange-600 bg-orange-50', icon: RotateCcw },
  betaald:     { label: 'Betaald',     color: 'text-emerald-600 bg-emerald-50', icon: Check },
  vervangen:   { label: 'Vervangen',   color: 'text-gray-500 bg-gray-100',    icon: Clock },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Vandaag'
  if (d.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

// ── Timeline item renderers ──

function BerichtBubble({ item }: { item: PortaalItem }) {
  const isVanBedrijf = item.afzender === 'bedrijf'

  if (item.bericht_type === 'foto' && item.foto_url) {
    return (
      <div className={`flex ${isVanBedrijf ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] ${isVanBedrijf ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`rounded-2xl overflow-hidden shadow-sm ${
            isVanBedrijf ? 'rounded-br-md' : 'rounded-bl-md'
          }`}>
            <img
              src={item.foto_url}
              alt={item.titel}
              className="max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(item.foto_url!, '_blank')}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
            {isVanBedrijf ? 'Jij' : 'Klant'} · {formatTime(item.created_at)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isVanBedrijf ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isVanBedrijf ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
          isVanBedrijf
            ? 'bg-emerald-600 text-white rounded-br-md'
            : 'bg-[hsl(35,15%,95%)] text-foreground rounded-bl-md'
        }`}>
          {item.bericht_tekst || item.titel}
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          {isVanBedrijf ? 'Jij' : 'Klant'} · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

function OfferteCard({ item }: { item: PortaalItem }) {
  const st = statusConfig[item.status] || statusConfig.verstuurd
  const StatusIcon = st.icon

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-white border border-amber-200/80 rounded-2xl rounded-br-md overflow-hidden shadow-sm w-full">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50/50 border-b border-amber-100">
            <Receipt className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[11px] font-semibold text-amber-800">Offerte</span>
          </div>
          <div className="px-3.5 py-2.5">
            <p className="text-[13px] font-medium text-foreground">{item.titel}</p>
            {item.bedrag != null && (
              <p className="text-[14px] font-bold font-mono text-foreground mt-0.5">
                {currencyFmt.format(item.bedrag)}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                <StatusIcon className="h-3 w-3" />
                {st.label}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          Jij · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

function FactuurCard({ item }: { item: PortaalItem }) {
  const st = statusConfig[item.status] || statusConfig.verstuurd
  const StatusIcon = st.icon

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-white border border-emerald-200/80 rounded-2xl rounded-br-md overflow-hidden shadow-sm w-full">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50/50 border-b border-emerald-100">
            <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-800">Factuur</span>
          </div>
          <div className="px-3.5 py-2.5">
            <p className="text-[13px] font-medium text-foreground">{item.titel}</p>
            {item.bedrag != null && (
              <p className="text-[14px] font-bold font-mono text-foreground mt-0.5">
                {currencyFmt.format(item.bedrag)}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                <StatusIcon className="h-3 w-3" />
                {st.label}
              </span>
            </div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          Jij · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

function TekeningCard({ item }: { item: PortaalItem }) {
  const st = statusConfig[item.status] || statusConfig.verstuurd
  const StatusIcon = st.icon
  const hasFiles = item.bestanden && item.bestanden.length > 0

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] flex flex-col items-end">
        <div className="bg-white border border-violet-200/80 rounded-2xl rounded-br-md overflow-hidden shadow-sm w-full">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-violet-50/50 border-b border-violet-100">
            <FileText className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-[11px] font-semibold text-violet-800">Tekening</span>
          </div>
          <div className="px-3.5 py-2.5">
            <p className="text-[13px] font-medium text-foreground">{item.titel}</p>
            {item.omschrijving && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.omschrijving}</p>
            )}
            {hasFiles && (
              <div className="flex items-center gap-1 mt-2 text-[10px] text-violet-600">
                <Paperclip className="h-3 w-3" />
                {item.bestanden.length} bestand{item.bestanden.length !== 1 ? 'en' : ''}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                <StatusIcon className="h-3 w-3" />
                {st.label}
              </span>
            </div>
          </div>
          {/* Reacties (klant feedback) */}
          {item.reacties && item.reacties.length > 0 && (
            <div className="border-t border-violet-100 px-3.5 py-2 bg-violet-50/30">
              {item.reacties.map((r) => (
                <div key={r.id} className="flex items-start gap-1.5 text-[11px]">
                  <span className={`font-medium ${r.type === 'goedkeuring' ? 'text-emerald-600' : r.type === 'revisie' ? 'text-orange-600' : 'text-foreground'}`}>
                    {r.klant_naam || 'Klant'}:
                  </span>
                  <span className="text-foreground/80">{r.bericht || (r.type === 'goedkeuring' ? 'Goedgekeurd' : 'Revisie gevraagd')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          Jij · {formatTime(item.created_at)}
        </span>
      </div>
    </div>
  )
}

function TimelineItem({ item }: { item: PortaalItem }) {
  if (item.type === 'bericht') return <BerichtBubble item={item} />
  if (item.type === 'offerte') return <OfferteCard item={item} />
  if (item.type === 'factuur') return <FactuurCard item={item} />
  if (item.type === 'tekening') return <TekeningCard item={item} />
  return null
}

// ── Main component ──

export function PortaalCompactCard({ projectId }: PortaalCompactCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [items, setItems] = useState<PortaalItem[]>([])
  const [voortgang, setVoortgang] = useState({ goedgekeurd: 0, totaal: 0 })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // Count unread klant messages (messages from klant that are newer than the last bedrijf message)
  const hasKlantReactie = (() => {
    if (items.length === 0) return false
    const lastBedrijfIdx = [...items].reverse().findIndex(i => i.afzender === 'bedrijf')
    if (lastBedrijfIdx === -1) return items.some(i => i.afzender === 'klant')
    const lastBedrijfItem = items[items.length - 1 - lastBedrijfIdx]
    return items.some(i =>
      i.afzender === 'klant' &&
      new Date(i.created_at).getTime() > new Date(lastBedrijfItem.created_at).getTime()
    )
  })()

  // Quick-add state
  const [activePopover, setActivePopover] = useState<'offerte' | 'factuur' | null>(null)
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [berichtTekstInput, setBerichtTekstInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const timelineEndRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!activePopover) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopover(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activePopover])

  // Scroll to bottom of timeline when items change or expanded
  useEffect(() => {
    if (expanded && timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [expanded, items.length])

  async function fetchItems() {
    if (!portaal) return
    try {
      const raw = await getPortaalItems(portaal.id)
      const zichtbaar = raw.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
      // Sort chronological (oldest first, like a chat)
      const sorted = [...zichtbaar].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setItems(sorted)
      const goedkeurbaar = zichtbaar.filter((i: PortaalItem) => i.type === 'offerte' || i.type === 'tekening')
      const goedgekeurd = goedkeurbaar.filter((i: PortaalItem) => i.status === 'goedgekeurd')
      setVoortgang({ goedgekeurd: goedgekeurd.length, totaal: goedkeurbaar.length })
    } catch { /* silent */ }
  }

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      try {
        const p = await getPortaalByProject(projectId)
        if (cancelled || !p) { setLoading(false); return }
        setPortaal(p)

        const raw = await getPortaalItems(p.id)
        if (cancelled) return

        const zichtbaar = raw.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
        const sorted = [...zichtbaar].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setItems(sorted)

        const goedkeurbaar = zichtbaar.filter((i: PortaalItem) => i.type === 'offerte' || i.type === 'tekening')
        const goedgekeurd = goedkeurbaar.filter((i: PortaalItem) => i.status === 'goedgekeurd')
        setVoortgang({ goedgekeurd: goedgekeurd.length, totaal: goedkeurbaar.length })
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [projectId])

  if (loading || !portaal) return null

  const isVerlopen = new Date(portaal.verloopt_op) < new Date()
  const isActief = portaal.actief && !isVerlopen

  // Last message for collapsed preview
  const laatsteItem = items.length > 0 ? items[items.length - 1] : null
  const previewText = laatsteItem
    ? (laatsteItem.bericht_tekst || laatsteItem.titel || laatsteItem.omschrijving || '')
    : ''
  const previewAfzender = laatsteItem?.afzender === 'bedrijf' ? 'Jij' : 'Klant'
  const previewTijd = laatsteItem ? formatTime(laatsteItem.created_at) : ''

  // Group items by date for timeline separators
  const itemsByDate: { date: string; items: PortaalItem[] }[] = []
  items.forEach((item) => {
    const dateKey = new Date(item.created_at).toDateString()
    const last = itemsByDate[itemsByDate.length - 1]
    if (last && last.date === dateKey) {
      last.items.push(item)
    } else {
      itemsByDate.push({ date: dateKey, items: [item] })
    }
  })

  // ── Quick-add handlers ──

  async function handleOpenOffertePopover() {
    if (activePopover === 'offerte') { setActivePopover(null); return }
    try {
      const offs = await getOffertesByProject(projectId)
      setOffertes(offs)
    } catch { setOffertes([]) }
    setActivePopover('offerte')
  }

  async function handleOpenFactuurPopover() {
    if (activePopover === 'factuur') { setActivePopover(null); return }
    try {
      const facts = await getFacturenByProject(projectId)
      setFacturen(facts)
    } catch { setFacturen([]) }
    setActivePopover('factuur')
  }

  async function handleSendOfferte(offerte: Offerte) {
    if (!portaal || !user?.id) return
    setIsSending(true)
    try {
      if (!offerte.publiek_token) {
        const { updateOfferte } = await import('@/services/supabaseService')
        const publiekToken = crypto.randomUUID()
        await updateOfferte(offerte.id, { publiek_token: publiekToken })
      }
      await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'offerte',
        titel: offerte.titel || `Offerte ${offerte.nummer}`,
        offerte_id: offerte.id,
        bedrag: offerte.totaal,
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      toast.success(`Offerte ${offerte.nummer} gedeeld`)
      setActivePopover(null)
      await fetchItems()
    } catch {
      toast.error('Kon offerte niet delen')
    } finally {
      setIsSending(false)
    }
  }

  async function handleSendFactuur(factuur: Factuur) {
    if (!portaal || !user?.id) return
    setIsSending(true)
    try {
      await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'factuur',
        titel: `Factuur ${factuur.nummer}`,
        factuur_id: factuur.id,
        bedrag: factuur.totaal,
        mollie_payment_url: factuur.betaal_link || undefined,
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      toast.success(`Factuur ${factuur.nummer} gedeeld`)
      setActivePopover(null)
      await fetchItems()
    } catch {
      toast.error('Kon factuur niet delen')
    } finally {
      setIsSending(false)
    }
  }

  async function handleSendBericht() {
    if (!portaal || !user?.id || !berichtTekstInput.trim()) return
    setIsSending(true)
    try {
      await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'bericht',
        titel: 'Bericht',
        bericht_type: 'tekst',
        bericht_tekst: berichtTekstInput.trim(),
        afzender: 'bedrijf',
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      setBerichtTekstInput('')
      await fetchItems()
    } catch {
      toast.error('Kon bericht niet versturen')
    } finally {
      setIsSending(false)
    }
  }

  async function handleSendFoto(file: File) {
    if (!portaal || !user?.id) return
    setIsSending(true)
    try {
      const path = `${user.id}/portaal/${portaal.id}/${Date.now()}_${file.name}`
      const url = await uploadFile(file, path)
      await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'bericht',
        titel: file.name,
        bericht_type: 'foto',
        foto_url: url,
        afzender: 'bedrijf',
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      toast.success('Afbeelding gedeeld')
      await fetchItems()
    } catch {
      toast.error('Kon afbeelding niet uploaden')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleSendFoto(file)
          e.target.value = ''
        }}
      />

      {/* ── Header row (always visible, clickable to expand) ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[hsl(35,15%,98%)] transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left accent dot */}
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isActief
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm'
            : 'bg-gray-200'
        }`}>
          <Send className={`h-4 w-4 ${isActief ? 'text-white' : 'text-gray-500'}`} />
        </div>

        {/* Title + meta */}
        <div className="flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Portaal</span>
            {hasKlantReactie && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isActief
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {isActief ? 'Actief' : 'Verlopen'}
            </span>
            {items.length > 0 && (
              <span className="text-[10px] text-muted-foreground/60">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Preview of last message when collapsed */}
          {!expanded && previewText && (
            <p className={`text-[11px] truncate max-w-[300px] mt-0.5 ${hasKlantReactie ? 'text-foreground font-medium' : 'text-muted-foreground/70'}`}>
              {hasKlantReactie && (
                <span className="text-rose-500 font-semibold">Klant heeft gereageerd — </span>
              )}
              <span className={hasKlantReactie ? '' : 'font-medium'}>{previewAfzender}</span>
              {': '}
              {previewText.length > 50 ? `${previewText.slice(0, 50)}…` : previewText}
              <span className="text-muted-foreground/40 ml-1.5">{previewTijd}</span>
            </p>
          )}
          {!expanded && voortgang.totaal > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex items-center gap-1 h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(voortgang.goedgekeurd / voortgang.totaal) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {voortgang.goedgekeurd}/{voortgang.totaal}
              </span>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Open in portalen button */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/portalen') }}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
        >
          Openen
          <ExternalLink className="h-3 w-3" />
        </button>

        {/* Expand/collapse chevron */}
        <ChevronDown className={`h-4 w-4 text-muted-foreground/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* ── Expanded timeline ── */}
      {expanded && (
        <div className="border-t border-[hsl(35,15%,90%)]">
          {/* Progress bar if there are approvable items */}
          {voortgang.totaal > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[hsl(35,15%,98%)] border-b border-[hsl(35,15%,92%)]">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[11px] text-muted-foreground">Voortgang</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(voortgang.goedgekeurd / voortgang.totaal) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-foreground font-mono">
                  {voortgang.goedgekeurd}/{voortgang.totaal} goedgekeurd
                </span>
              </div>
            </div>
          )}

          {/* Chat timeline */}
          <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-1 bg-[hsl(35,10%,98.5%)]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                  <MessageCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-foreground/70">Nog geen berichten</p>
                <p className="text-[12px] text-muted-foreground/50 mt-1 max-w-[240px]">
                  Stuur een bericht, offerte of factuur naar je klant via het portaal.
                </p>
              </div>
            ) : (
              itemsByDate.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-[hsl(35,15%,90%)]" />
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide">
                      {formatDate(group.items[0].created_at)}
                    </span>
                    <div className="flex-1 h-px bg-[hsl(35,15%,90%)]" />
                  </div>
                  {/* Items */}
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <TimelineItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))
            )}
            <div ref={timelineEndRef} />
          </div>

          {/* ── Input bar (always visible when expanded & actief) ── */}
          {isActief && (
            <div className="border-t border-[hsl(35,15%,90%)] bg-white">
              {/* Quick action bar with labels */}
              <div className="relative" ref={popoverRef}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(35,15%,92%)]">
                  <button
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={isSending}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 transition-all disabled:opacity-40"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Afbeelding
                  </button>
                  <button
                    onClick={handleOpenOffertePopover}
                    disabled={isSending}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                      activePopover === 'offerte'
                        ? 'border-amber-400 text-amber-800 bg-amber-100'
                        : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300'
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Offerte
                  </button>
                  <button
                    onClick={handleOpenFactuurPopover}
                    disabled={isSending}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
                      activePopover === 'factuur'
                        ? 'border-emerald-400 text-emerald-800 bg-emerald-100'
                        : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Factuur
                  </button>
                </div>

                {/* Offerte picker popover */}
                {activePopover === 'offerte' && (
                  <div className="absolute left-4 bottom-full mb-2 w-72 bg-[#FFFFFE] border border-[hsl(35,15%,87%)] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-[hsl(35,15%,90%)] bg-[hsl(35,15%,98%)]">
                      <p className="text-[11px] font-semibold text-foreground">Offerte delen</p>
                      <button onClick={() => setActivePopover(null)} className="text-muted-foreground/50 hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                      {offertes.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-6">Geen offertes gevonden</p>
                      ) : offertes.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => handleSendOfferte(o)}
                          disabled={isSending}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[hsl(35,15%,96%)] transition-colors text-left group"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-foreground truncate">{o.titel}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{o.nummer}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[12px] font-semibold font-mono text-foreground">
                              {currencyFmt.format(o.totaal)}
                            </span>
                            <Send className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Factuur picker popover */}
                {activePopover === 'factuur' && (
                  <div className="absolute left-4 bottom-full mb-2 w-72 bg-[#FFFFFE] border border-[hsl(35,15%,87%)] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-[hsl(35,15%,90%)] bg-[hsl(35,15%,98%)]">
                      <p className="text-[11px] font-semibold text-foreground">Factuur delen</p>
                      <button onClick={() => setActivePopover(null)} className="text-muted-foreground/50 hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                      {facturen.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-6">Geen facturen gevonden</p>
                      ) : facturen.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleSendFactuur(f)}
                          disabled={isSending}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[hsl(35,15%,96%)] transition-colors text-left group"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium font-mono text-foreground">{f.nummer}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-[12px] font-semibold font-mono text-foreground">
                              {currencyFmt.format(f.totaal)}
                            </span>
                            <Send className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message input */}
              <div className="flex items-end gap-2 px-4 py-3">
                <textarea
                  value={berichtTekstInput}
                  onChange={(e) => setBerichtTekstInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendBericht()
                    }
                  }}
                  placeholder="Typ een bericht naar je klant..."
                  rows={1}
                  className="flex-1 text-[13px] border border-[hsl(35,15%,87%)] rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all bg-[hsl(35,10%,99%)] min-h-[40px] max-h-[120px]"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                  }}
                />
                <button
                  onClick={handleSendBericht}
                  disabled={isSending || !berichtTekstInput.trim()}
                  className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
