import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, Paperclip, X, ArrowRight, ChevronDown, ChevronRight,
  ImageIcon, FileText, Receipt, CreditCard, Check, Eye, AlertCircle,
  Bold, Italic, Underline, List, Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getPortaalByProject, getPortaalItems, createPortaalItem, getOffertesByProject, getFacturenByProject, createPortaal } from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import { useAuth } from '@/contexts/AuthContext'
import type { ProjectPortaal, PortaalItem, Offerte, Factuur } from '@/types'

// ── Utilities ──

const currencyFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

function relativeDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'vandaag'
  if (d.toDateString() === yesterday.toDateString()) return 'gisteren'
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function shortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).toUpperCase()
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function statusStyle(status: string): { color: string; label: string } {
  switch (status) {
    case 'concept': case 'gepland': return { color: '#8A7A4A', label: 'Concept' }
    case 'verstuurd': return { color: '#3A5A9A', label: 'Verstuurd' }
    case 'bekeken': return { color: '#3A5A9A', label: 'Bekeken' }
    case 'goedgekeurd': return { color: '#3A7D52', label: 'Goedgekeurd' }
    case 'betaald': return { color: '#3A7D52', label: 'Betaald' }
    case 'revisie': return { color: '#C0451A', label: 'Revisie' }
    case 'verlopen': case 'afgewezen': return { color: '#C0451A', label: 'Verlopen' }
    case 'vervangen': return { color: '#9B9B95', label: 'Vervangen' }
    default: return { color: '#6B6B66', label: status }
  }
}

// ── Afzender indicator ──

function AfzenderLabel({ item }: { item: PortaalItem }) {
  const isKlant = item.afzender === 'klant'
  const naam = isKlant ? (item.toegewezen_aan || 'Klant') : 'Jij'
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isKlant ? 'bg-[#F15025]' : 'border-[1.5px] border-[#1A535C]'}`} />
      <span className="text-[11px] text-[#9B9B95]">
        {isKlant ? <span className="font-medium text-[#1A1A1A]">{naam}</span> : naam}
        {' '}· {relativeDate(item.created_at)} {formatTime(item.created_at)}
      </span>
    </div>
  )
}

// ── Rich Cards ──

function OfferteKaart({ item }: { item: PortaalItem }) {
  const st = statusStyle(item.status)
  // Extract nummer from titel if it contains it
  const nummer = item.offerte_id ? item.titel : ''

  return (
    <div className="max-w-[400px]">
      <AfzenderLabel item={item} />
      <div className="rounded-xl overflow-hidden bg-[#FFFFFF] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="h-1 bg-[#F15025]" />
        <div className="p-4">
        <p className="text-[11px] font-mono uppercase tracking-wide text-[#F15025]/70">Offerte</p>
        <p className="text-sm font-medium text-[#1A1A1A] mt-1">{item.titel}</p>
        {item.bedrag != null && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-mono font-semibold text-[#1A1A1A]">{currencyFmt.format(item.bedrag)}</span>
            <span className="text-sm flex items-center gap-1" style={{ color: st.color }}>
              {st.label}<span className="text-[#F15025]">.</span>
            </span>
          </div>
        )}
        {!item.bedrag && (
          <span className="text-sm flex items-center gap-1 mt-1" style={{ color: st.color }}>
            {st.label}<span className="text-[#F15025]">.</span>
          </span>
        )}
        {/* Actieknoppen — disabled in interne view */}
        {item.status !== 'goedgekeurd' && item.status !== 'betaald' && item.status !== 'afgewezen' && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-[#EBEBEB]/40">
            <span className="flex-1 text-center text-sm font-medium py-2 bg-[#F8F7F5] rounded-md text-[#9B9B95] cursor-default" title="Zichtbaar voor klant">Goedkeuren</span>
            <span className="flex-1 text-center text-sm font-medium py-2 bg-[#F8F7F5] rounded-md text-[#9B9B95] cursor-default" title="Zichtbaar voor klant">Vragen stellen</span>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

function FactuurKaart({ item }: { item: PortaalItem }) {
  const st = statusStyle(item.status)
  return (
    <div className="max-w-[400px]">
      <AfzenderLabel item={item} />
      <div className="rounded-xl overflow-hidden bg-[#FFFFFF] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="h-1 bg-[#2D6B48]" />
        <div className="p-4">
        <p className="text-[11px] font-mono uppercase tracking-wide text-[#2D6B48]/70">Factuur</p>
        <p className="text-sm font-medium text-[#1A1A1A] mt-1">{item.titel}</p>
        {item.bedrag != null && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg font-mono font-semibold text-[#1A1A1A]">{currencyFmt.format(item.bedrag)}</span>
            <span className="text-sm flex items-center gap-1" style={{ color: st.color }}>
              {st.label}<span className="text-[#F15025]">.</span>
            </span>
          </div>
        )}
        {item.status !== 'betaald' && item.mollie_payment_url && (
          <div className="mt-3 pt-3 border-t border-[#EBEBEB]/40">
            <span className="block text-center text-sm font-medium py-2 bg-[#F8F7F5] rounded-md text-[#9B9B95] cursor-default" title="Zichtbaar voor klant">Betalen</span>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

function TekeningKaart({ item }: { item: PortaalItem }) {
  const st = statusStyle(item.status)
  const hasFiles = item.bestanden && item.bestanden.length > 0
  // Check if any bestand is an image
  const thumbFile = item.bestanden?.find(b => b.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(b.bestandsnaam))

  return (
    <div className="max-w-[400px]">
      <AfzenderLabel item={item} />
      <div className="rounded-xl overflow-hidden bg-[#FFFFFF] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="h-1 bg-[#1A535C]" />
        <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-wide text-[#1A535C]/70">Tekening</p>
            <p className="text-sm font-medium text-[#1A1A1A] mt-1">{item.titel}</p>
            {item.omschrijving && <p className="text-xs text-[#6B6B66] mt-0.5">{item.omschrijving}</p>}
            <span className="text-sm flex items-center gap-1 mt-1.5" style={{ color: st.color }}>
              {st.label}<span className="text-[#F15025]">.</span>
            </span>
          </div>
          {thumbFile && (
            <img
              src={thumbFile.thumbnail_url || thumbFile.url}
              alt=""
              className="w-16 h-16 rounded-md object-cover flex-shrink-0 cursor-pointer hover:opacity-80"
              onClick={() => window.open(thumbFile.url, '_blank')}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          {!thumbFile && hasFiles && (
            <div className="w-16 h-16 rounded-md bg-[#F8F7F5] flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-[#9B9B95]" />
            </div>
          )}
        </div>
        {hasFiles && (
          <p className="text-xs text-[#9B9B95] mt-2 flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            {item.bestanden.length} bestand{item.bestanden.length !== 1 ? 'en' : ''}
          </p>
        )}
        </div>
      </div>
    </div>
  )
}

// ── Chat bubbels ──

function TekstBubbel({ item }: { item: PortaalItem }) {
  const isKlant = item.afzender === 'klant'
  return (
    <div>
      <AfzenderLabel item={item} />
      <div className={`max-w-[75%] ${isKlant ? '' : 'ml-auto'}`}>
        <div className={`px-4 py-2.5 text-sm leading-relaxed ${
          isKlant
            ? 'bg-[#FFFFFF] text-[#1A1A1A] rounded-2xl rounded-bl-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'bg-[#1A535C]/[0.07] text-[#1A1A1A] rounded-2xl rounded-br-sm'
        }`}>
          {item.bericht_tekst || item.titel}
        </div>
      </div>
    </div>
  )
}

function FotoBubbel({ item }: { item: PortaalItem }) {
  const isKlant = item.afzender === 'klant'
  const [imgError, setImgError] = useState(false)
  return (
    <div>
      <AfzenderLabel item={item} />
      <div className={`max-w-[75%] ${isKlant ? '' : 'ml-auto'}`}>
        {!imgError && item.foto_url ? (
          <img
            src={item.foto_url}
            alt=""
            className={`max-w-[280px] max-h-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${isKlant ? 'rounded-bl-sm' : 'rounded-br-sm'}`}
            onClick={() => window.open(item.foto_url!, '_blank')}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`inline-flex items-center gap-2 px-4 py-2.5 bg-[#FFFFFF] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${isKlant ? 'rounded-bl-sm' : 'rounded-br-sm'}`}>
            <ImageIcon className="h-4 w-4 text-[#9B9B95]" />
            <span className="text-sm text-[#6B6B66]">{item.titel || 'Afbeelding'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Feed Item Router ──

function FeedItem({ item }: { item: PortaalItem }) {
  return (
    <div>
      {item.type === 'offerte' ? <OfferteKaart item={item} />
        : item.type === 'factuur' ? <FactuurKaart item={item} />
        : item.type === 'tekening' ? <TekeningKaart item={item} />
        : item.bericht_type === 'foto' && item.foto_url ? <FotoBubbel item={item} />
        : <TekstBubbel item={item} />}

      {/* Reacties — altijd renderen voor alle item types */}
      {(item.reacties ?? []).map((r) => (
        <div
          key={r.id}
          className="ml-4 mt-1.5 border-l-2 pl-3 py-1"
          style={{ borderColor: '#F15025' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold" style={{ color: r.type === 'goedkeuring' ? '#3A7D52' : r.type === 'revisie' ? '#C0451A' : '#5A5A55' }}>
              {r.type === 'goedkeuring' ? 'Goedgekeurd' : r.type === 'revisie' ? 'Revisie' : 'Reactie'}
            </span>
            <span className="text-[11px] text-[#9B9B95]">— {r.klant_naam || 'Klant'}</span>
            <span className="text-[10px] font-mono text-[#C0BDB8] ml-auto">{formatTime(r.created_at)}</span>
          </div>
          {r.bericht && <p className="text-xs text-[#3A3A35] mt-0.5">{r.bericht}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Feed ──

function Feed({ items, feedEndRef }: { items: PortaalItem[]; feedEndRef: React.RefObject<HTMLDivElement> }) {
  const groups: { date: string; label: string; items: PortaalItem[] }[] = []
  items.forEach((item) => {
    const dateKey = new Date(item.created_at).toDateString()
    const last = groups[groups.length - 1]
    if (last && last.date === dateKey) last.items.push(item)
    else groups.push({ date: dateKey, label: shortDate(item.created_at), items: [item] })
  })

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-medium text-[#1A1A1A]">Nog niets gedeeld</p>
        <p className="text-xs text-[#9B9B95] mt-1.5 leading-relaxed max-w-[280px] mx-auto">
          Deel offertes, tekeningen, foto's of facturen met je klant via het portaal. Je klant kan reageren en goedkeuren.
        </p>
      </div>
    )
  }

  return (
    <div className="relative max-h-[500px] overflow-y-auto space-y-4 px-1 py-3">
      {groups.map((group) => (
        <div key={group.date}>
          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 h-px bg-[#1A535C]/10" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#1A535C]/30 whitespace-nowrap">{group.label}</span>
            <div className="flex-1 h-px bg-[#1A535C]/10" />
          </div>
          <div className="space-y-4">
            {group.items.map((item) => <FeedItem key={item.id} item={item} />)}
          </div>
        </div>
      ))}
      <div ref={feedEndRef} />
    </div>
  )
}

// ── Input Bar ──

function InputBar({
  portaal, projectId, userId, isActief, isSending, setIsSending, fetchItems,
}: {
  portaal: ProjectPortaal; projectId: string; userId: string; isActief: boolean
  isSending: boolean; setIsSending: (v: boolean) => void; fetchItems: () => Promise<void>
}) {
  const [berichtTekst, setBerichtTekst] = useState('')
  const [notificeerKlant, setNotificeerKlant] = useState(true)
  const [activePopover, setActivePopover] = useState<'offerte' | 'factuur' | null>(null)
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [tekeningFile, setTekeningFile] = useState<File | null>(null)
  const [tekeningTitel, setTekeningTitel] = useState('')
  const [tekeningPopoverOpen, setTekeningPopoverOpen] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const tekeningInputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activePopover && !tekeningPopoverOpen) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopover(null); setTekeningPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activePopover, tekeningPopoverOpen])

  async function sendEmailNotification(content: string, titel: string) {
    try {
      const { getProject, getKlant, getPortaalInstellingen, getProfile } = await import('@/services/supabaseService')
      const { sendEmail } = await import('@/services/gmailService')
      const { buildPortalEmailHtml, replaceEmailVariables } = await import('@/utils/emailTemplate')
      const project = await getProject(projectId)
      if (!project?.klant_id || !portaal) return
      const klant = await getKlant(project.klant_id)
      const klantEmail = klant?.email || klant?.contactpersonen?.[0]?.email
      if (!klantEmail) { toast.warning('Klant heeft geen email'); return }
      const profile = await getProfile(userId)
      const bedrijfsnaam = profile?.bedrijfsnaam || ''
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
      const klantNaam = klant?.contactpersoon || klant?.contactpersonen?.[0]?.naam || klant?.bedrijfsnaam || 'klant'
      const instellingen = await getPortaalInstellingen(userId)
      const vars: Record<string, string> = { klant_naam: klantNaam, project_naam: project.naam, portaal_link: portaalUrl, bedrijfsnaam: bedrijfsnaam || '', item_type: titel, projectnaam: project.naam, itemtitel: titel, klantNaam, portaalUrl }
      const onderwerp = instellingen?.template_nieuw_item?.onderwerp ? replaceEmailVariables(instellingen.template_nieuw_item.onderwerp, vars) : `${bedrijfsnaam || 'Nieuw item'} — ${titel}`
      const heading = instellingen?.template_nieuw_item?.inhoud ? replaceEmailVariables(instellingen.template_nieuw_item.inhoud, vars) : `Er is een nieuw item gedeeld voor project ${project.naam}.`
      const plainBody = [`Beste ${klantNaam},`, '', heading, '', content, '', `Bekijk het hier: ${portaalUrl}`, '', `Met vriendelijke groet,`, bedrijfsnaam || 'Het team'].join('\n')
      const htmlBody = buildPortalEmailHtml({ heading, itemTitel: titel, beschrijving: content, ctaLabel: 'Bekijk in portaal →', ctaUrl: portaalUrl, bedrijfsnaam, logoUrl: profile?.logo_url || undefined })
      await sendEmail(klantEmail, onderwerp, plainBody, { html: htmlBody })
      toast.success(`Email verstuurd naar ${klantEmail}`)
    } catch (err) {
      console.error('Email notificatie mislukt:', err instanceof Error ? err.message : err)
      toast.error(`Email niet verstuurd`)
    }
  }

  const send = async (fn: () => Promise<void>) => { setIsSending(true); try { await fn() } finally { setIsSending(false) } }

  async function handleSendBericht() {
    if (!berichtTekst.trim()) return
    await send(async () => {
      await createPortaalItem({ user_id: userId, project_id: projectId, portaal_id: portaal.id, type: 'bericht', titel: 'Bericht', bericht_type: 'tekst', bericht_tekst: berichtTekst.trim(), afzender: 'bedrijf', status: 'verstuurd', zichtbaar_voor_klant: true, volgorde: 0 })
      const tekst = berichtTekst.trim(); setBerichtTekst('')
      if (editorRef.current) editorRef.current.innerHTML = ''
      await fetchItems()
      if (notificeerKlant) sendEmailNotification(tekst, 'Bericht')
    })
  }

  async function handleSendFoto(file: File) {
    await send(async () => {
      const url = await uploadFile(file, `${userId}/portaal/${portaal.id}/${Date.now()}_${file.name}`)
      await createPortaalItem({ user_id: userId, project_id: projectId, portaal_id: portaal.id, type: 'bericht', titel: file.name, bericht_type: 'foto', foto_url: url, afzender: 'bedrijf', status: 'verstuurd', zichtbaar_voor_klant: true, volgorde: 0 })
      toast.success('Afbeelding gedeeld'); await fetchItems()
      if (notificeerKlant) sendEmailNotification('Nieuwe foto gedeeld', 'Foto')
    })
  }

  async function handleSendTekening() {
    if (!tekeningFile) return
    await send(async () => {
      const url = await uploadFile(tekeningFile, `${userId}/portaal/${portaal.id}/${Date.now()}_${tekeningFile.name}`)
      const newItem = await createPortaalItem({ user_id: userId, project_id: projectId, portaal_id: portaal.id, type: 'tekening', titel: tekeningTitel || tekeningFile.name, status: 'verstuurd', zichtbaar_voor_klant: true, volgorde: 0 } as any)
      const { createPortaalBestand } = await import('@/services/supabaseService')
      await createPortaalBestand({
        portaal_item_id: newItem.id,
        bestandsnaam: tekeningFile.name,
        mime_type: tekeningFile.type,
        grootte: tekeningFile.size,
        url,
        thumbnail_url: tekeningFile.type.startsWith('image/') ? url : undefined,
        uploaded_by: 'bedrijf',
      })
      toast.success('Tekening gedeeld'); setTekeningFile(null); setTekeningTitel(''); setTekeningPopoverOpen(false)
      await fetchItems()
      if (notificeerKlant) sendEmailNotification(tekeningTitel || tekeningFile.name, tekeningTitel || tekeningFile.name)
    })
  }

  async function handleSendOfferte(offerte: Offerte) {
    await send(async () => {
      if (!offerte.publiek_token) { const { updateOfferte } = await import('@/services/supabaseService'); await updateOfferte(offerte.id, { publiek_token: crypto.randomUUID() }) }
      await createPortaalItem({ user_id: userId, project_id: projectId, portaal_id: portaal.id, type: 'offerte', titel: offerte.titel || `Offerte ${offerte.nummer}`, offerte_id: offerte.id, bedrag: offerte.totaal, status: 'verstuurd', zichtbaar_voor_klant: true, volgorde: 0 })
      toast.success(`Offerte ${offerte.nummer} gedeeld`); setActivePopover(null); await fetchItems()
      if (notificeerKlant) sendEmailNotification(`Offerte ${offerte.nummer}`, offerte.titel || `Offerte ${offerte.nummer}`)
    })
  }

  async function handleSendFactuur(factuur: Factuur) {
    await send(async () => {
      await createPortaalItem({ user_id: userId, project_id: projectId, portaal_id: portaal.id, type: 'factuur', titel: `Factuur ${factuur.nummer}`, factuur_id: factuur.id, bedrag: factuur.totaal, mollie_payment_url: factuur.betaal_link || undefined, status: 'verstuurd', zichtbaar_voor_klant: true, volgorde: 0 })
      toast.success(`Factuur ${factuur.nummer} gedeeld`); setActivePopover(null); await fetchItems()
      if (notificeerKlant) sendEmailNotification(`Factuur ${factuur.nummer}`, `Factuur ${factuur.nummer}`)
    })
  }

  if (!isActief) return null

  return (
    <div className="border-t border-[#1A535C]/8 p-3 relative" ref={popoverRef}>
      <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSendFoto(f); e.target.value = '' }} />
      <input ref={tekeningInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setTekeningFile(f); setTekeningTitel(f.name.replace(/\.[^/.]+$/, '')); setTekeningPopoverOpen(true) }; e.target.value = '' }} />

      {/* Popovers */}
      {tekeningPopoverOpen && tekeningFile && (
        <div className="absolute left-3 bottom-full mb-2 w-72 bg-[#FFFFFF] border border-[#EBEBEB] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBEBEB]"><p className="text-xs font-semibold text-[#1A1A1A]">Tekening delen</p><button onClick={() => { setTekeningPopoverOpen(false); setTekeningFile(null) }} className="text-[#9B9B95] hover:text-[#1A1A1A]"><X className="h-3.5 w-3.5" /></button></div>
          <div className="px-4 py-3 space-y-3">
            <p className="text-xs text-[#9B9B95] truncate">{tekeningFile.name}</p>
            <input type="text" value={tekeningTitel} onChange={(e) => setTekeningTitel(e.target.value)} placeholder="Titel" className="w-full text-sm px-3 py-2 border border-[#EBEBEB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1A535C]/20" />
            <button onClick={handleSendTekening} disabled={isSending} className="w-full text-sm font-medium py-2 rounded-lg bg-[#1A535C] text-white hover:bg-[#164850] disabled:opacity-40 transition-colors">Delen</button>
          </div>
        </div>
      )}
      {activePopover === 'offerte' && (
        <div className="absolute left-3 bottom-full mb-2 w-72 bg-[#FFFFFF] border border-[#EBEBEB] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBEBEB]"><p className="text-xs font-semibold text-[#1A1A1A]">Offerte delen</p><button onClick={() => setActivePopover(null)} className="text-[#9B9B95] hover:text-[#1A1A1A]"><X className="h-3.5 w-3.5" /></button></div>
          <div className="max-h-52 overflow-y-auto py-1">
            {offertes.length === 0 ? <p className="text-xs text-[#9B9B95] text-center py-6">Geen offertes gevonden</p> : offertes.map((o) => (
              <button key={o.id} onClick={() => handleSendOfferte(o)} disabled={isSending} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8F7F5] transition-colors text-left">
                <div className="min-w-0"><p className="text-sm font-medium text-[#1A1A1A] truncate">{o.titel}</p><p className="text-[10px] text-[#9B9B95] font-mono">{o.nummer}</p></div>
                <span className="text-sm font-semibold font-mono text-[#1A1A1A] ml-3 flex-shrink-0">{currencyFmt.format(o.totaal)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {activePopover === 'factuur' && (
        <div className="absolute left-3 bottom-full mb-2 w-72 bg-[#FFFFFF] border border-[#EBEBEB] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBEBEB]"><p className="text-xs font-semibold text-[#1A1A1A]">Factuur delen</p><button onClick={() => setActivePopover(null)} className="text-[#9B9B95] hover:text-[#1A1A1A]"><X className="h-3.5 w-3.5" /></button></div>
          <div className="max-h-52 overflow-y-auto py-1">
            {facturen.length === 0 ? <p className="text-xs text-[#9B9B95] text-center py-6">Geen facturen gevonden</p> : facturen.map((f) => (
              <button key={f.id} onClick={() => handleSendFactuur(f)} disabled={isSending} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8F7F5] transition-colors text-left">
                <div className="min-w-0"><p className="text-sm font-medium font-mono text-[#1A1A1A]">{f.nummer}</p><p className="text-[10px] text-[#9B9B95]">{new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</p></div>
                <span className="text-sm font-semibold font-mono text-[#1A1A1A] ml-3 flex-shrink-0">{currencyFmt.format(f.totaal)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area with toolbar */}
      <div className="bg-[#FFFFFF] border border-[#EBEBEB]/40 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-within:border-[#1A535C]/40 focus-within:shadow-[0_0_0_2px_rgba(26,83,92,0.08)] transition-all overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#EBEBEB]/30">
          {[
            { cmd: 'bold', icon: <Bold className="h-3.5 w-3.5" />, title: 'Vet' },
            { cmd: 'italic', icon: <Italic className="h-3.5 w-3.5" />, title: 'Cursief' },
            { cmd: 'underline', icon: <Underline className="h-3.5 w-3.5" />, title: 'Onderstreept' },
            { cmd: 'insertUnorderedList', icon: <List className="h-3.5 w-3.5" />, title: 'Opsomming' },
            { cmd: 'createLink', icon: <Link2 className="h-3.5 w-3.5" />, title: 'Link' },
          ].map((btn) => (
            <button
              key={btn.cmd}
              title={btn.title}
              onMouseDown={(e) => {
                e.preventDefault()
                if (btn.cmd === 'createLink') {
                  const url = prompt('URL invoeren:')
                  if (url) document.execCommand('createLink', false, url)
                } else {
                  document.execCommand(btn.cmd)
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F8F7F5] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors"
            >
              {btn.icon}
            </button>
          ))}
          <div className="w-px h-4 bg-[#EBEBEB] mx-1" />
          <button onClick={() => fotoInputRef.current?.click()} disabled={isSending} title="Afbeelding" className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#F8F7F5] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors disabled:opacity-40">
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ContentEditable */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            if (editorRef.current) setBerichtTekst(editorRef.current.innerText || '')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendBericht() }
          }}
          data-placeholder="Bericht..."
          className="min-h-[40px] max-h-[120px] overflow-y-auto px-3 py-2.5 text-sm text-[#1A1A1A] focus:outline-none leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-[#9B9B95]/50"
        />
      </div>

      {/* Action buttons row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => tekeningInputRef.current?.click()}
            disabled={isSending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#F8F7F5] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors disabled:opacity-40 text-[12px]"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Tekening</span>
          </button>
          <button
            onClick={async () => { try { setOffertes(await getOffertesByProject(projectId)) } catch { setOffertes([]) }; setActivePopover('offerte') }}
            disabled={isSending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#F8F7F5] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors disabled:opacity-40 text-[12px]"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Offerte</span>
          </button>
          <button
            onClick={async () => { try { setFacturen(await getFacturenByProject(projectId)) } catch { setFacturen([]) }; setActivePopover('factuur') }}
            disabled={isSending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#F8F7F5] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors disabled:opacity-40 text-[12px]"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Factuur</span>
          </button>
          <button
            onClick={() => fotoInputRef.current?.click()}
            disabled={isSending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#F8F7F5] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors disabled:opacity-40 text-[12px]"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Foto</span>
          </button>
        </div>
        <button
          onClick={handleSendBericht}
          disabled={isSending || !berichtTekst.trim()}
          className="p-2 rounded-lg bg-[#F15025] text-white hover:bg-[#D94520] disabled:opacity-30 transition-colors flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Notificeer */}
      <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
        <input type="checkbox" checked={notificeerKlant} onChange={(e) => setNotificeerKlant(e.target.checked)} className="h-3.5 w-3.5 rounded border-[#EBEBEB] text-[#1A535C] focus:ring-[#1A535C]/30" />
        <span className="text-xs text-[#9B9B95]">Notificeer klant per email</span>
      </label>
    </div>
  )
}

// ── Main Component ──

const STORAGE_KEY = 'portaal-collapsed'

export function PortaalCompactBlock({ projectId }: { projectId: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [items, setItems] = useState<PortaalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true' } catch { return false }
  })
  const feedEndRef = useRef<HTMLDivElement>(null)

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
  }

  const hasKlantReactie = (() => {
    if (items.length === 0) return false
    const lastBedrijfIdx = [...items].reverse().findIndex(i => i.afzender === 'bedrijf')
    if (lastBedrijfIdx === -1) return items.some(i => i.afzender === 'klant')
    const lastBedrijfItem = items[items.length - 1 - lastBedrijfIdx]
    return items.some(i => i.afzender === 'klant' && new Date(i.created_at).getTime() > new Date(lastBedrijfItem.created_at).getTime())
  })()

  async function fetchItems() {
    if (!portaal) return
    try {
      const raw = await getPortaalItems(portaal.id)
      const sorted = [...raw.filter((i: PortaalItem) => i.zichtbaar_voor_klant)].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      setItems(sorted)
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
        const sorted = [...raw.filter((i: PortaalItem) => i.zichtbaar_voor_klant)].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        setItems(sorted)
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    fetch()
    return () => { cancelled = true }
  }, [projectId])

  // Realtime subscription for portaal_items and portaal_reacties
  useEffect(() => {
    if (!portaal) return
    let channel: ReturnType<typeof import('@/services/supabaseClient').default extends infer S ? S extends { channel: infer C } ? C : never : never> | undefined

    async function setup() {
      const { default: supabase } = await import('@/services/supabaseClient')
      if (!supabase || !portaal) return
      channel = supabase
        .channel(`portaal-compact-${portaal.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portaal_reacties' }, () => fetchItems())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portaal_items', filter: `portaal_id=eq.${portaal.id}` }, () => fetchItems())
        .subscribe()
    }
    setup()

    // Polling fallback — elke 10s data verversen
    const poll = setInterval(() => fetchItems(), 10_000)

    // Visibility change — data verversen bij terugkeer
    function handleVisibility() {
      if (document.visibilityState === 'visible') fetchItems()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (channel) {
        import('@/services/supabaseClient').then(({ default: supabase }) => {
          supabase?.removeChannel(channel!)
        })
      }
    }
  }, [portaal?.id])

  useEffect(() => {
    if (!collapsed && feedEndRef.current) feedEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [items.length, collapsed])

  const handleActiveerPortaal = async () => {
    if (!user?.id) return
    try {
      const nieuwPortaal = await createPortaal(projectId, user.id)
      setPortaal(nieuwPortaal)
      setCollapsed(false)
      toast.success('Portaal geactiveerd')
    } catch {
      toast.error('Kon portaal niet activeren')
    }
  }

  if (loading) return null

  if (!portaal) {
    return (
      <div className="bg-[#1A535C] rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Send className="h-4 w-4 text-white/50" />
          <div>
            <h3 className="text-[12px] font-semibold text-white uppercase tracking-widest">Portaal</h3>
            <p className="text-[11px] text-white/40 mt-0.5">Deel offertes, tekeningen en updates met je klant</p>
          </div>
        </div>
        <button
          onClick={handleActiveerPortaal}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
        >
          Activeer
        </button>
      </div>
    )
  }

  const isVerlopen = new Date(portaal.verloopt_op) < new Date()
  const isActief = portaal.actief && !isVerlopen
  const sharedCount = items.filter(i => i.type !== 'bericht').length

  return (
    <div>
      {/* Header bar */}
      <div
        className="flex items-center justify-between cursor-pointer select-none group bg-[#1A535C] rounded-t-lg px-4 py-2.5"
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-2.5">
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
            : <ChevronDown className="h-3.5 w-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
          }
          <h3 className="text-[12px] font-semibold text-white uppercase tracking-widest">Portaal</h3>
          <span className="text-[11px] font-medium text-white/60">
            {isActief ? 'Actief' : 'Verlopen'}<span className="text-[#F15025]">.</span>
          </span>
          {sharedCount > 0 && (
            <span className="text-[11px] text-white/40 font-mono">{sharedCount} gedeeld</span>
          )}
          {hasKlantReactie && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#F15025]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F15025] animate-pulse" />
              Reactie
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate('/portalen') }}
          className="text-[11px] font-medium text-white/60 hover:text-white flex items-center gap-1 transition-colors"
        >
          Openen <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="bg-[#F8F7F5] rounded-b-lg px-4 pb-1 pt-2">
          <Feed items={items} feedEndRef={feedEndRef} />

          {portaal && user?.id && (
            <InputBar
              portaal={portaal}
              projectId={projectId}
              userId={user.id}
              isActief={isActief}
              isSending={isSending}
              setIsSending={setIsSending}
              fetchItems={fetchItems}
            />
          )}
        </div>
      )}
    </div>
  )
}
