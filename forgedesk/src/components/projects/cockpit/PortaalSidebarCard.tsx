import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Send, Image, Receipt, CreditCard, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getPortaalByProject, getPortaalItems, createPortaalItem, getOffertesByProject, getFacturenByProject } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { uploadFile } from '@/services/storageService'
import type { ProjectPortaal, PortaalItem, Offerte, Factuur } from '@/types'

interface PortaalCompactCardProps {
  projectId: string
}

export function PortaalCompactCard({ projectId }: PortaalCompactCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [laatsteBericht, setLaatsteBericht] = useState<PortaalItem | null>(null)
  const [voortgang, setVoortgang] = useState({ goedgekeurd: 0, totaal: 0 })
  const [itemCount, setItemCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Quick-add state
  const [activePopover, setActivePopover] = useState<'offerte' | 'factuur' | 'bericht' | null>(null)
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [berichtTekstInput, setBerichtTekstInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

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

  async function fetchItems() {
    if (!portaal) return
    try {
      const items = await getPortaalItems(portaal.id)
      const zichtbaar = items.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
      setItemCount(zichtbaar.length)
      if (zichtbaar.length > 0) {
        const sorted = [...zichtbaar].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setLaatsteBericht(sorted[0])
      }
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

        const items = await getPortaalItems(p.id)
        if (cancelled) return

        const zichtbaar = items.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
        setItemCount(zichtbaar.length)

        if (zichtbaar.length > 0) {
          const sorted = [...zichtbaar].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setLaatsteBericht(sorted[0])
        }

        const goedkeurbaar = zichtbaar.filter((i: PortaalItem) => i.type === 'offerte' || i.type === 'tekening')
        const goedgekeurd = goedkeurbaar.filter((i: PortaalItem) => i.status === 'goedgekeurd')
        setVoortgang({ goedgekeurd: goedgekeurd.length, totaal: goedkeurbaar.length })
      } catch {
        // No portaal or fetch error — card stays hidden
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

  const berichtTekst = laatsteBericht
    ? (laatsteBericht.bericht_tekst || laatsteBericht.titel || laatsteBericht.omschrijving || '')
    : ''
  const isVanBedrijf = laatsteBericht?.afzender === 'bedrijf'
  const afzenderLabel = isVanBedrijf ? 'Jij' : 'Klant'
  const berichtTijd = laatsteBericht
    ? new Date(laatsteBericht.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    : ''

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
      toast.success('Bericht verstuurd')
      setBerichtTekstInput('')
      setActivePopover(null)
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

  const currencyFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

  return (
    <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] overflow-visible">
      {/* Hidden file input for photo upload */}
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

      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className={`w-1 rounded-l-[10px] flex-shrink-0 ${isActief ? 'bg-emerald-500' : 'bg-gray-300'}`} />

        {/* Content */}
        <div className="flex-1 flex items-center gap-4 px-4 py-3 min-w-0">
          {/* Icon */}
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActief
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm'
              : 'bg-gray-200'
          }`}>
            <Send className={`h-4 w-4 ${isActief ? 'text-white' : 'text-gray-500'}`} />
          </div>

          {/* Title + status */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Portaal</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isActief
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {isActief ? 'Actief' : 'Verlopen'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {voortgang.totaal > 0 ? (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {voortgang.goedgekeurd}/{voortgang.totaal} goedgekeurd
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-[hsl(35,15%,90%)] flex-shrink-0 hidden md:block" />

          {/* Last message preview — constrained width */}
          <div className="flex-1 min-w-0 max-w-[320px] hidden md:block">
            {berichtTekst ? (
              <div className={`inline-block max-w-full rounded-xl px-3 py-1.5 text-[11px] leading-snug ${
                isVanBedrijf
                  ? 'bg-emerald-50/70 rounded-br-sm'
                  : 'bg-[hsl(35,15%,96%)] rounded-bl-sm'
              }`}>
                <p className="text-foreground/80 truncate">
                  {berichtTekst.length > 80 ? `${berichtTekst.slice(0, 80)}…` : berichtTekst}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {afzenderLabel} · {berichtTijd}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/50 italic">Nog geen berichten</p>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1 hidden md:block" />

          {/* ── Inline action toolbar ── */}
          {isActief && (
            <div className="relative flex items-center" ref={popoverRef}>
              <div className="flex items-center gap-0.5 bg-[hsl(35,15%,96%)] rounded-lg p-0.5">
                {([
                  { key: 'afbeelding', icon: Image, title: 'Afbeelding', onClick: () => fotoInputRef.current?.click() },
                  { key: 'offerte', icon: Receipt, title: 'Offerte', onClick: handleOpenOffertePopover },
                  { key: 'factuur', icon: CreditCard, title: 'Factuur', onClick: handleOpenFactuurPopover },
                  { key: 'bericht', icon: MessageCircle, title: 'Bericht', onClick: () => setActivePopover(activePopover === 'bericht' ? null : 'bericht') },
                ] as const).map((a) => (
                  <button
                    key={a.key}
                    onClick={a.onClick}
                    disabled={isSending}
                    title={a.title}
                    className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${
                      activePopover === a.key
                        ? 'bg-white shadow-sm text-foreground'
                        : 'text-muted-foreground/70 hover:text-foreground hover:bg-white/60'
                    }`}
                  >
                    <a.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>

              {/* Popover: Offerte picker */}
              {activePopover === 'offerte' && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#FFFFFE] border border-[hsl(35,15%,87%)] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2.5 border-b border-[hsl(35,15%,90%)] bg-[hsl(35,15%,98%)]">
                    <p className="text-[11px] font-semibold text-foreground">Offerte delen via portaal</p>
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {offertes.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-6">Geen offertes</p>
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

              {/* Popover: Factuur picker */}
              {activePopover === 'factuur' && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#FFFFFE] border border-[hsl(35,15%,87%)] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2.5 border-b border-[hsl(35,15%,90%)] bg-[hsl(35,15%,98%)]">
                    <p className="text-[11px] font-semibold text-foreground">Factuur delen via portaal</p>
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {facturen.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-6">Geen facturen</p>
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

              {/* Popover: Bericht input */}
              {activePopover === 'bericht' && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#FFFFFE] border border-[hsl(35,15%,87%)] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2.5 border-b border-[hsl(35,15%,90%)] bg-[hsl(35,15%,98%)]">
                    <p className="text-[11px] font-semibold text-foreground">Bericht naar klant</p>
                  </div>
                  <div className="p-3">
                    <textarea
                      autoFocus
                      value={berichtTekstInput}
                      onChange={(e) => setBerichtTekstInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendBericht()
                        }
                      }}
                      placeholder="Typ een bericht..."
                      rows={3}
                      className="w-full text-[12px] border border-[hsl(35,15%,87%)] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all bg-white"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground/50">Enter om te versturen</span>
                      <button
                        onClick={handleSendBericht}
                        disabled={isSending || !berichtTekstInput.trim()}
                        className="flex items-center gap-1.5 text-[11px] font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        Verstuur
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider before open button */}
          <div className="h-8 w-px bg-[hsl(35,15%,90%)] flex-shrink-0" />

          {/* Open portaal button */}
          <button
            onClick={() => navigate('/portalen')}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
          >
            Openen
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
