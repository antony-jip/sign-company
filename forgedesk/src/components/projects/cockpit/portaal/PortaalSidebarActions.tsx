import { useState, useRef, useEffect } from 'react'
import {
  Send, Receipt, CreditCard, ImageIcon, FileText, X
} from 'lucide-react'
import { toast } from 'sonner'
import { createPortaalItem, getOffertesByProject, getFacturenByProject } from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import { currencyFmt } from './PortaalTimelineItems'
import type { ProjectPortaal, Offerte, Factuur } from '@/types'

interface PortaalSidebarActionsProps {
  portaal: ProjectPortaal
  projectId: string
  isActief: boolean
  isSending: boolean
  setIsSending: (v: boolean) => void
  fetchItems: () => Promise<void>
  userId: string
}

export function PortaalSidebarActions({
  portaal,
  projectId,
  isActief,
  isSending,
  setIsSending,
  fetchItems,
  userId,
}: PortaalSidebarActionsProps) {
  const [activePopover, setActivePopover] = useState<'offerte' | 'factuur' | null>(null)
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [berichtTekstInput, setBerichtTekstInput] = useState('')
  const [tekeningFile, setTekeningFile] = useState<File | null>(null)
  const [tekeningTitel, setTekeningTitel] = useState('')
  const [tekeningPopoverOpen, setTekeningPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const tekeningInputRef = useRef<HTMLInputElement>(null)

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
    if (!portaal || !userId) return
    setIsSending(true)
    try {
      if (!offerte.publiek_token) {
        const { updateOfferte } = await import('@/services/supabaseService')
        const publiekToken = crypto.randomUUID()
        await updateOfferte(offerte.id, { publiek_token: publiekToken })
      }
      await createPortaalItem({
        user_id: userId,
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
    if (!portaal || !userId) return
    setIsSending(true)
    try {
      await createPortaalItem({
        user_id: userId,
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
    if (!portaal || !userId || !berichtTekstInput.trim()) return
    setIsSending(true)
    try {
      await createPortaalItem({
        user_id: userId,
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
    if (!portaal || !userId) return
    setIsSending(true)
    try {
      const path = `${userId}/portaal/${portaal.id}/${Date.now()}_${file.name}`
      const url = await uploadFile(file, path)
      await createPortaalItem({
        user_id: userId,
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

  async function handleSendTekening() {
    if (!portaal || !userId || !tekeningFile) return
    setIsSending(true)
    try {
      const path = `${userId}/portaal/${portaal.id}/${Date.now()}_${tekeningFile.name}`
      const url = await uploadFile(tekeningFile, path)
      await createPortaalItem({
        user_id: userId,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'tekening',
        titel: tekeningTitel || tekeningFile.name,
        bestanden: [url],
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      } as any)
      toast.success('Tekening gedeeld')
      setTekeningFile(null)
      setTekeningTitel('')
      setTekeningPopoverOpen(false)
      await fetchItems()
    } catch {
      toast.error('Kon tekening niet delen')
    } finally {
      setIsSending(false)
    }
  }

  if (!isActief) return null

  return (
    <div className="border-t border-[#E6E4E0] bg-white">
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
      {/* Hidden tekening file input */}
      <input
        ref={tekeningInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setTekeningFile(file)
            setTekeningTitel(file.name.replace(/\.[^/.]+$/, ''))
            setTekeningPopoverOpen(true)
          }
          e.target.value = ''
        }}
      />

      {/* Quick action bar with labels */}
      <div className="relative" ref={popoverRef}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E6E4E0]">
          <button
            onClick={() => fotoInputRef.current?.click()}
            disabled={isSending}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-mod-klanten-border text-mod-klanten-text bg-mod-klanten-light hover:bg-mod-klanten-light/40 transition-all disabled:opacity-40"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Afbeelding
          </button>
          <button
            onClick={() => tekeningInputRef.current?.click()}
            disabled={isSending}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
              tekeningPopoverOpen
                ? 'border-mod-klanten-border text-mod-klanten-text bg-mod-klanten-light/40'
                : 'border-mod-klanten-border text-mod-klanten-text bg-mod-klanten-light hover:bg-mod-klanten-light/40'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Tekening
          </button>
          <button
            onClick={handleOpenOffertePopover}
            disabled={isSending}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-40 ${
              activePopover === 'offerte'
                ? 'border-mod-email-border text-mod-email-text bg-mod-email-light/40'
                : 'border-mod-email-border text-mod-email-text bg-mod-email-light hover:bg-mod-email-light/40'
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
                ? 'border-mod-planning-border text-mod-planning-text bg-mod-planning-light/40'
                : 'border-mod-werkbonnen-border text-mod-werkbonnen-text bg-mod-werkbonnen-light hover:bg-mod-planning-light/40'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Factuur
          </button>
        </div>

        {/* Tekening popover */}
        {tekeningPopoverOpen && tekeningFile && (
          <div className="absolute left-4 bottom-full mb-2 w-72 bg-[#FAFAF8] border border-[#E6E4E0] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E6E4E0] bg-[#FAFAF8]">
              <p className="text-[11px] font-semibold text-foreground">Tekening delen</p>
              <button
                onClick={() => {
                  setTekeningPopoverOpen(false)
                  setTekeningFile(null)
                  setTekeningTitel('')
                }}
                className="text-muted-foreground/50 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="px-3 py-3 space-y-3">
              <p className="text-[11px] text-muted-foreground truncate">{tekeningFile.name}</p>
              <input
                type="text"
                value={tekeningTitel}
                onChange={(e) => setTekeningTitel(e.target.value)}
                placeholder="Titel"
                className="w-full text-[12px] px-2.5 py-1.5 border border-[#E6E4E0] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-mod-klanten-border"
              />
              <button
                onClick={handleSendTekening}
                disabled={isSending}
                className="w-full text-[11px] font-medium px-3 py-1.5 rounded-lg bg-mod-klanten-text text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Delen
              </button>
            </div>
          </div>
        )}

        {/* Offerte picker popover */}
        {activePopover === 'offerte' && (
          <div className="absolute left-4 bottom-full mb-2 w-72 bg-[#FAFAF8] border border-[#E6E4E0] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E6E4E0] bg-[#FAFAF8]">
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
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F4F2EE] transition-colors text-left group"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{o.titel}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{o.nummer}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[12px] font-semibold font-mono text-foreground">
                      {currencyFmt.format(o.totaal)}
                    </span>
                    <Send className="h-3 w-3 text-mod-projecten-text opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Factuur picker popover */}
        {activePopover === 'factuur' && (
          <div className="absolute left-4 bottom-full mb-2 w-72 bg-[#FAFAF8] border border-[#E6E4E0] rounded-xl shadow-lg shadow-black/8 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E6E4E0] bg-[#FAFAF8]">
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
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F4F2EE] transition-colors text-left group"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium font-mono text-foreground">{f.nummer}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(f.factuurdatum).toLocaleDateString('nl-NL')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[12px] font-semibold font-mono text-foreground">
                      {currencyFmt.format(f.totaal)}
                    </span>
                    <Send className="h-3 w-3 text-mod-projecten-text opacity-0 group-hover:opacity-100 transition-opacity" />
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
          className="flex-1 text-[13px] border border-[#E6E4E0] rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-petrol/50 focus:border-petrol transition-all bg-[#FAFAF8] min-h-[40px] max-h-[120px]"
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
          className="h-10 w-10 rounded-xl bg-petrol text-white flex items-center justify-center hover:bg-[#154449] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
