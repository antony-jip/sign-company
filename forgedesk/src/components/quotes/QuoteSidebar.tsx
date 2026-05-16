import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Save,
  Send,
  Download,
  Building2,
  TrendingUp,
  Percent,
  ShoppingCart,
  Plus,
  Minus,
  Mail,
  Phone,
  MapPin,
  Clock,
  Wrench,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingDown,
  DollarSign,
  Receipt,
  ArrowRight,
  CheckCircle2,
  GripVertical,
  Pin,
} from 'lucide-react'
import type { Klant, Factuur } from '@/types'
import type { InkoopRegel } from '@/types'
import { round2 } from '@/utils/budgetUtils'
import { cn, formatCurrency } from '@/lib/utils'
import { KlantStatusWarning } from '@/components/shared/KlantStatusWarning'
import { InkoopOffertePaneel } from './InkoopOffertePaneel'
import type { SidebarSectionId } from '@/hooks/useSidebarLayout'

interface MargeColor {
  text: string
  bg: string
  bar: string
}

interface ItemMarge {
  beschrijving: string
  inkoop: number
  verkoop: number
  marge: number
  pct: number
  hasCalc: boolean
}

interface ContactManagement {
  handleSelectContact: (id: string) => void
}

export interface QuoteSidebarProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  subtotaal: number
  btwBedrag: number
  formatCurrencyFn: typeof formatCurrency
  isEditMode: boolean
  offerteStatus: string
  geconverteerdNaarFactuurId: string | null
  userId: string | undefined
  sidebarLayout: {
    order: SidebarSectionId[]
    pinned: Set<SidebarSectionId>
    draggedSection: SidebarSectionId | null
    dragOverSection: SidebarSectionId | null
    handleDragStart: (e: React.DragEvent, id: SidebarSectionId) => void
    handleDragEnd: () => void
    handleDragEnter: (e: React.DragEvent, id: SidebarSectionId) => void
    handleDragLeave: (e: React.DragEvent) => void
    handleDragOver: (e: React.DragEvent) => void
    handleDrop: (e: React.DragEvent, id: SidebarSectionId) => void
    togglePin: (id: SidebarSectionId) => void
  }
  selectedKlant: Klant | undefined
  contactpersoon: string
  klantPanelOpen: boolean
  setKlantPanelOpen: (v: boolean) => void
  selectedContactId: string
  contact: ContactManagement
  setShowKlantSelector: (v: boolean) => void
  linkedFactuur: Factuur | null
  navigate: ReturnType<typeof useNavigate>
  editOfferteId: string
  autoSaveIdRef: React.RefObject<string | null>
  selectedKlantId: string
  offerteTitel: string
  selectedProjectId: string
  isEditingTotaal: boolean
  setIsEditingTotaal: (v: boolean) => void
  gewenstTotaal: string
  setGewenstTotaal: (v: string) => void
  afrondingskorting: number
  setAfrondingskorting: (v: number) => void
  urenCorrectieBedrag: number
  urenCorrectie: Record<string, number>
  setUrenCorrectie: React.Dispatch<React.SetStateAction<Record<string, number>>>
  optionelSubtotaal: number
  optionelBtw: number
  totaalInkoop: number
  winstExBtw: number
  margePercentage: number
  margeColor: MargeColor
  getMargeColorSidebar: (pct: number) => MargeColor
  itemMarges: ItemMarge[]
  totaalUren: number
  effectieveTotaalUren: number
  materiaalKosten: number
  urenVelden: string[]
  urenPerVeld: Record<string, number>
  tariefPerVeld: Record<string, number>
  handleVerstuurOfferte: () => void
  handleDownloadPdf: () => void
  saveOfferte: (status: 'concept' | 'verzonden') => void
  isSaving: boolean
  inkoopPaneelOpen: boolean
  setInkoopPaneelOpen: (v: boolean) => void
  handleInkoopRegelToevoegen: (regel: InkoopRegel) => void
  handleInkoopRegelAlsPrijsvariant: (regel: InkoopRegel, leverancier: string) => void
}

export function QuoteSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  subtotaal,
  btwBedrag,
  isEditMode,
  offerteStatus,
  geconverteerdNaarFactuurId,
  userId,
  sidebarLayout,
  selectedKlant,
  contactpersoon,
  klantPanelOpen,
  setKlantPanelOpen,
  selectedContactId,
  contact,
  setShowKlantSelector,
  linkedFactuur,
  navigate,
  editOfferteId,
  autoSaveIdRef,
  selectedKlantId,
  offerteTitel,
  selectedProjectId,
  isEditingTotaal,
  setIsEditingTotaal,
  gewenstTotaal,
  setGewenstTotaal,
  afrondingskorting,
  setAfrondingskorting,
  urenCorrectieBedrag,
  urenCorrectie,
  setUrenCorrectie,
  optionelSubtotaal,
  optionelBtw,
  totaalInkoop,
  winstExBtw,
  margePercentage,
  margeColor,
  getMargeColorSidebar,
  itemMarges,
  totaalUren,
  effectieveTotaalUren,
  materiaalKosten,
  urenVelden,
  urenPerVeld,
  tariefPerVeld,
  handleVerstuurOfferte,
  handleDownloadPdf,
  saveOfferte,
  isSaving,
  inkoopPaneelOpen,
  setInkoopPaneelOpen,
  handleInkoopRegelToevoegen,
  handleInkoopRegelAlsPrijsvariant,
}: QuoteSidebarProps) {
  const { navigateWithTab } = useNavigateWithTab()
  return (
        <div className="lg:block">
          <div className="space-y-0">

            {/* ── Mobile collapse toggle ── */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border dark:border-border bg-card mb-4"
            >
              <span className="text-sm font-semibold">Klant & Samenvatting</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{formatCurrency(round2(subtotaal + btwBedrag))}</span>
                {sidebarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </div>
            </button>

            <div className={cn('space-y-0', sidebarCollapsed && 'hidden lg:block')}>
              {/* Render sidebar sections: pinned group (sticky) + unpinned */}
              {(() => {
                const showFactureren = isEditMode && (offerteStatus === 'goedgekeurd' || offerteStatus === 'gefactureerd' || !!geconverteerdNaarFactuurId)
                const isVisible = (id: typeof sidebarLayout.order[number]) => {
                  if (id === 'factureren' && !showFactureren) return false
                  if (id === 'inkoop' && !userId) return false
                  return true
                }
                const visibleOrder = sidebarLayout.order.filter(isVisible)
                const pinnedIds = visibleOrder.filter(id => sidebarLayout.pinned.has(id))
                const unpinnedIds = visibleOrder.filter(id => !sidebarLayout.pinned.has(id))

                const renderSection = (sectionId: typeof sidebarLayout.order[number]) => {
                  const isPinned = sidebarLayout.pinned.has(sectionId)
                  const isDragging = sidebarLayout.draggedSection === sectionId
                  const isDragOver = sidebarLayout.dragOverSection === sectionId

                  return (
                  <div
                    key={sectionId}
                    draggable
                    onDragStart={(e) => sidebarLayout.handleDragStart(e, sectionId)}
                    onDragEnd={sidebarLayout.handleDragEnd}
                    onDragEnter={(e) => sidebarLayout.handleDragEnter(e, sectionId)}
                    onDragLeave={sidebarLayout.handleDragLeave}
                    onDragOver={sidebarLayout.handleDragOver}
                    onDrop={(e) => sidebarLayout.handleDrop(e, sectionId)}
                    className={cn(
                      'group/sidebar-section pb-4 transition-all',
                      isDragging && 'opacity-40',
                      isDragOver && 'pt-1',
                    )}
                  >
                    {/* Drop indicator */}
                    {isDragOver && !isDragging && (
                      <div className="h-1 bg-primary/50 rounded-full mb-2 mx-4 animate-pulse" />
                    )}

                    {/* Drag handle + pin bar */}
                    <div className={cn(
                      'flex items-center gap-1.5 mb-1 transition-opacity',
                      isPinned
                        ? 'opacity-100'
                        : 'opacity-0 group-hover/sidebar-section:opacity-100'
                    )}>
                      <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                      </div>
                      <button
                        onClick={() => sidebarLayout.togglePin(sectionId)}
                        className={cn(
                          'p-1 rounded transition-colors',
                          isPinned
                            ? 'text-primary bg-primary/15 hover:bg-primary/25'
                            : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted'
                        )}
                        title={isPinned ? 'Losmaken' : 'Vastzetten (sticky)'}
                      >
                        <Pin className={cn('h-3.5 w-3.5', isPinned && 'fill-current')} />
                      </button>
                      <span className="text-2xs text-muted-foreground/40 ml-0.5">
                        {sectionId === 'klant' && 'Klant'}
                        {sectionId === 'factureren' && 'Factureren'}
                        {sectionId === 'samenvatting' && 'Samenvatting'}
                        {sectionId === 'inkoop' && 'Inkoop'}
                      </span>
                    </div>

                    {/* ── KLANTGEGEVENS ── */}
                    {sectionId === 'klant' && (
                      <>
                        {selectedKlant ? (
                          <div className="doen-slate-surface rounded-2xl overflow-hidden">
                            <button onClick={() => setKlantPanelOpen(!klantPanelOpen)} className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/50 transition-colors" style={{ borderBottom: '1px solid rgba(26,83,92,0.08)' }}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(58,107,140,0.2)]" style={{ background: 'linear-gradient(135deg, #3A6B8C 0%, #2A5580 50%, #F15025 200%)' }}>
                                <span className="text-white font-extrabold text-[12px]">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-[13.5px] font-bold truncate text-[#1A1A1A]">{selectedKlant.bedrijfsnaam}</p>
                                <p className="text-[11px] truncate text-[#9B9B95]">{contactpersoon ? `t.a.v. ${contactpersoon}` : 'Geen contactpersoon'}</p>
                              </div>
                              {klantPanelOpen ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-[#9B9B95]" /> : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-[#9B9B95]" />}
                            </button>

                            {klantPanelOpen && (
                              <div className="px-4 py-3 space-y-2.5">
                                <div className="text-[11px] space-y-0.5" style={{ color: '#6B6B66' }}>
                                  {selectedKlant.telefoon && <p className="flex items-center gap-1.5 font-mono"><Phone className="h-3 w-3" style={{ color: '#9B9B95' }} />{selectedKlant.telefoon}</p>}
                                  {selectedKlant.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" style={{ color: '#9B9B95' }} />{selectedKlant.email}</p>}
                                  {(selectedKlant.adres || selectedKlant.stad) && (
                                    <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" style={{ color: '#9B9B95' }} />{[selectedKlant.adres, selectedKlant.postcode, selectedKlant.stad].filter(Boolean).join(', ')}</p>
                                  )}
                                </div>

                                <KlantStatusWarning klant={selectedKlant} className="mt-1" />

                                {/* TODO: vervang door <KlantContactSelector> (zelfde component als ProjectDetail). */}
                                {/* Mergt JSONB+DB en biedt primary-fallback gratis. Vereist QuoteSidebar refactor — losse follow-up. */}
                                {selectedKlant.contactpersonen?.length > 0 && (
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9B9B95' }}>Contactpersoon</label>
                                    <Select value={selectedContactId} onValueChange={(val) => contact.handleSelectContact(val)}>
                                      <SelectTrigger className="h-8 text-[12px] rounded-lg" style={{ backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }}><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                                      <SelectContent>
                                        {selectedKlant.contactpersonen.map((cp) => (
                                          <SelectItem key={cp.id} value={cp.id}>
                                            <div className="flex items-center gap-1.5"><span>{cp.naam}</span>{cp.is_primair && <span className="text-[10px]" style={{ color: '#1A535C' }}>(primair)</span>}</div>
                                          </SelectItem>
                                        ))}
                                        <SelectItem value="__new__"><span style={{ color: '#1A535C' }}>+ Nieuw</span></SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {(selectedKlant.debiteurennummer || selectedKlant.btw_nummer) && (
                                  <div className="text-[11px] font-mono space-y-0.5 pt-2" style={{ color: '#6B6B66', borderTop: '0.5px solid #EBEBEB' }}>
                                    {selectedKlant.debiteurennummer && <p>Deb.nr: {selectedKlant.debiteurennummer}</p>}
                                    {selectedKlant.btw_nummer && <p>BTW: {selectedKlant.btw_nummer}</p>}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: '0.5px solid #EBEBEB' }}>
                                  {selectedKlant.telefoon && <a href={`tel:${selectedKlant.telefoon}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ backgroundColor: '#E2F0E8', color: '#2D6B48' }}><Phone className="h-3 w-3" />Bellen</a>}
                                  {selectedKlant.email && <a href="#" onClick={(e) => { e.preventDefault(); navigateWithTab({ path: `/email/compose?to=${encodeURIComponent(selectedKlant.email)}`, label: 'Nieuwe email', id: `/email/compose-${selectedKlant.email}` }) }} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}><Mail className="h-3 w-3" />Email</a>}
                                  <Link to={`/klanten/${selectedKlant.id}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ backgroundColor: '#EBEBEB', color: '#6B6B66' }}><ExternalLink className="h-3 w-3" />Profiel</Link>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl p-5 text-center" style={{ border: '1.5px dashed #EBEBEB', backgroundColor: '#F8F7F5' }}>
                            <Building2 className="h-7 w-7 mx-auto mb-1.5" style={{ color: '#9B9B95' }} />
                            <p className="text-[12px]" style={{ color: '#9B9B95' }}>Geen klant geselecteerd</p>
                            <button className="mt-2 h-7 px-3 text-[11px] font-semibold rounded-lg text-white transition-all hover:opacity-90" style={{ backgroundColor: '#1A535C' }} onClick={() => setShowKlantSelector(true)}>Klant kiezen</button>
                          </div>
                        )}
                      </>
                    )}

                    {/* ── FACTUREREN ── */}
                    {sectionId === 'factureren' && (
                      <div className="doen-slate-surface rounded-2xl overflow-hidden">
                        {geconverteerdNaarFactuurId ? (
                          <>
                            <div className="p-4" style={{ background: 'linear-gradient(135deg, #2D6B48 0%, #1A535C 100%)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                                <p className="text-[10px] uppercase tracking-widest text-white/80 font-semibold">
                                  Gefactureerd<span className="text-[#F15025]">.</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Offerte bedrag</p>
                                  <p className="text-[14px] font-mono font-bold text-white tabular-nums">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-white/40 flex-shrink-0" />
                                <div className="flex-1 text-right">
                                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Factuur</p>
                                  <p className="text-[14px] font-mono font-bold text-white tabular-nums">{linkedFactuur ? formatCurrency(linkedFactuur.totaal) : '…'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              {linkedFactuur && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-3.5 w-3.5 text-[#9B9B95]" />
                                    <span className="text-[12.5px] font-semibold text-[#1A1A1A]">{linkedFactuur.nummer}</span>
                                  </div>
                                  <Badge className={cn('text-[10px] font-semibold',
                                    linkedFactuur.status === 'betaald' && 'bg-[#E8F2EC] text-[#2D6B48] border-[#2D6B48]/20',
                                    linkedFactuur.status === 'verzonden' && 'bg-[#E8EEF9] text-[#3A5A9A] border-[#3A5A9A]/20',
                                    linkedFactuur.status === 'concept' && 'bg-[#F0EFEC] text-[#6B6B66] border-[#6B6B66]/15',
                                    linkedFactuur.status === 'vervallen' && 'bg-[#FDE8E2] text-[#C03A18] border-[#C03A18]/20',
                                    linkedFactuur.status === 'gecrediteerd' && 'bg-[#FEF3E8] text-[#D4621A] border-[#D4621A]/20',
                                  )}>
                                    {linkedFactuur.status.charAt(0).toUpperCase() + linkedFactuur.status.slice(1)}
                                  </Badge>
                                </div>
                              )}
                              {linkedFactuur && linkedFactuur.status !== 'betaald' && linkedFactuur.betaald_bedrag > 0 && (
                                <div className="flex items-center justify-between text-[12px] text-[#6B6B66]">
                                  <span>Betaald</span>
                                  <span className="font-mono font-semibold text-[#2D6B48]">{formatCurrency(linkedFactuur.betaald_bedrag)}</span>
                                </div>
                              )}
                              <button
                                onClick={() => navigate(`/facturen/${geconverteerdNaarFactuurId}`)}
                                className="w-full inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold h-9 rounded-xl border border-[#2D6B48]/25 text-[#2D6B48] hover:bg-[#2D6B48]/[0.05] hover:border-[#2D6B48]/40 transition-all"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                Bekijk factuur
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F15025 0%, #D03A18 100%)' }}>
                              {/* Decorative glow */}
                              <div
                                aria-hidden
                                className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
                              />
                              <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                  <Receipt className="h-4 w-4 text-white" />
                                  <p className="text-[10px] uppercase tracking-widest text-white/85 font-semibold">
                                    Klaar om te factureren<span className="text-white">.</span>
                                  </p>
                                </div>
                                <p className="text-[10px] text-white/70 uppercase tracking-wider">Offerte bedrag incl BTW</p>
                                <p className="text-[22px] font-extrabold text-white font-mono tabular-nums leading-tight">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <p className="text-[11px] text-white/70"><span className="font-mono">{formatCurrency(subtotaal)}</span> excl BTW</p>
                                  <span className="text-white/40">·</span>
                                  <p className="text-[11px] text-white/70"><span className="font-mono">+{formatCurrency(btwBedrag)}</span> BTW</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <button
                                onClick={() => {
                                  const quoteId = editOfferteId || autoSaveIdRef.current
                                  if (!quoteId) return
                                  const params = new URLSearchParams({ offerte_id: quoteId, klant_id: selectedKlantId })
                                  if (offerteTitel) params.set('titel', offerteTitel)
                                  if (selectedProjectId) params.set('project_id', selectedProjectId)
                                  navigate(`/facturen/nieuw?${params.toString()}`)
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-[#2D6B48] text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(45,107,72,0.25)] hover:bg-[#235A3B] hover:shadow-[0_4px_14px_rgba(45,107,72,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all"
                              >
                                <Receipt className="h-4 w-4" />
                                Factuur aanmaken
                                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── SAMENVATTING ── */}
                    {sectionId === 'samenvatting' && (
                      <div className="doen-slate-surface rounded-2xl overflow-hidden">
                        <div className="p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A535C 0%, #0F3D44 100%)' }}>
                          {/* Decorative flame glow */}
                          <div
                            aria-hidden
                            className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(241,80,37,0.18) 0%, transparent 70%)' }}
                          />
                          <p className="relative text-[10px] uppercase tracking-widest text-white/75 font-semibold">
                            Totaal incl BTW<span className="text-[#F15025]">.</span>
                          </p>
                          {isEditingTotaal ? (
                            <div className="relative mt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-white font-extrabold text-[22px]">€</span>
                                <input
                                  type="number"
                                  value={gewenstTotaal}
                                  onChange={(e) => setGewenstTotaal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = parseFloat(gewenstTotaal)
                                      if (!isNaN(val) && val > 0) {
                                        const gemBtw = subtotaal > 0 ? btwBedrag / subtotaal : 0.21
                                        const kortingExcl = round2((val / (1 + gemBtw)) - subtotaal)
                                        setAfrondingskorting(kortingExcl)
                                      }
                                      setIsEditingTotaal(false)
                                    }
                                    if (e.key === 'Escape') setIsEditingTotaal(false)
                                  }}
                                  autoFocus
                                  step={0.01}
                                  className="bg-white/15 text-white font-extrabold font-mono tabular-nums text-[22px] rounded px-2 py-0.5 w-36 border-0 outline-none placeholder:text-white/40"
                                  placeholder={round2(subtotaal + btwBedrag).toFixed(2)}
                                />
                              </div>
                              <p className="text-[10px] text-white/55 mt-0.5">Enter = bevestig · Esc = annuleer</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGewenstTotaal(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))).toFixed(2))
                                setIsEditingTotaal(true)
                              }}
                              className="relative text-[24px] font-extrabold font-mono tabular-nums text-white mt-0.5 hover:text-white/85 transition-colors cursor-pointer text-left block"
                              title="Klik om totaal aan te passen"
                            >
                              {formatCurrency(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))))}
                            </button>
                          )}
                          {afrondingskorting !== 0 && (
                            <div className="relative flex items-center justify-between mt-1.5">
                              <p className="text-[11px] text-white/70">Korting: <span className="font-mono">{formatCurrency(afrondingskorting)}</span> excl BTW</p>
                              <button onClick={() => setAfrondingskorting(0)} className="text-[11px] text-white/60 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {urenCorrectieBedrag !== 0 && (
                            <div className="relative flex items-center justify-between mt-1.5">
                              <p className="text-[11px] text-white/70">Uren correctie: <span className="font-mono">{urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)}</span> excl BTW</p>
                              <button onClick={() => setUrenCorrectie({})} className="text-[11px] text-white/60 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {optionelSubtotaal > 0 && (
                            <p className="relative text-[11px] text-white/70 mt-1.5">+ <span className="font-mono">{formatCurrency(round2(optionelSubtotaal + optionelBtw))}</span> aan opties</p>
                          )}
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-white border border-[rgba(26,83,92,0.08)] p-2.5">
                              <p className="text-[10px] uppercase tracking-widest text-[#9B9B95] font-semibold">Subtotaal</p>
                              <p className="text-[13.5px] font-bold font-mono text-[#1A1A1A] mt-0.5 tabular-nums">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</p>
                            </div>
                            <div className="rounded-lg bg-white border border-[rgba(26,83,92,0.08)] p-2.5">
                              <p className="text-[10px] uppercase tracking-widest text-[#9B9B95] font-semibold">BTW</p>
                              <p className="text-[13.5px] font-bold font-mono text-[#1A1A1A] mt-0.5 tabular-nums">{formatCurrency(round2(btwBedrag + (afrondingskorting + urenCorrectieBedrag) * (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))}</p>
                            </div>
                          </div>
                          {afrondingskorting !== 0 && (
                            <div className="rounded-lg bg-[#F5F2E8] border border-[#8A6A2A]/15 p-2.5">
                              <p className="text-[10px] uppercase tracking-widest text-[#8A6A2A] font-semibold">Afrondingskorting</p>
                              <p className="text-[13.5px] font-bold font-mono text-[#8A6A2A] mt-0.5 tabular-nums">{formatCurrency(afrondingskorting)}</p>
                            </div>
                          )}

                          <div className="h-px bg-[rgba(26,83,92,0.08)]" />

                          {/* Inkoop / Verkoop / Winst */}
                          <div className="space-y-2.5">
                            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6B66]">
                              Inkoop &amp; verkoop<span className="text-[#F15025]">.</span>
                            </h4>
                            <div className="space-y-1.5 text-[13px]">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#C03A18] flex-shrink-0" />
                                  <span className="text-[#6B6B66]">Inkoop</span>
                                </div>
                                <span className="font-mono tabular-nums font-semibold text-[#C03A18]">{totaalInkoop > 0 ? formatCurrency(totaalInkoop) : '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A535C] flex-shrink-0" />
                                  <span className="text-[#6B6B66]">Verkoop</span>
                                </div>
                                <span className="font-mono tabular-nums font-semibold text-[#1A1A1A]">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(26,83,92,0.08)]">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D6B48] flex-shrink-0" />
                                  <span className="text-[#1A1A1A] font-semibold">Winst</span>
                                </div>
                                <span className="font-mono tabular-nums font-bold text-[#2D6B48]">{totaalInkoop > 0 ? formatCurrency(winstExBtw) : '—'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Marge */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6B66]">
                              Marge<span className="text-[#F15025]">.</span>
                            </h4>
                            <div className="doen-slate-surface rounded-xl p-3 relative overflow-hidden">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-semibold text-[#6B6B66] uppercase tracking-widest">%</span>
                                <span className={cn('text-[18px] font-extrabold font-mono tabular-nums', margeColor.text)}>
                                  {totaalInkoop > 0 ? `${margePercentage.toFixed(1)}%` : '—'}
                                </span>
                              </div>
                              {totaalInkoop > 0 && (
                                <div className="h-2 rounded-full bg-[rgba(26,83,92,0.08)] overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full transition-all', margeColor.bar)}
                                    style={{
                                      width: `${Math.min(100, Math.max(0, margePercentage))}%`,
                                      boxShadow: '0 0 8px rgba(45,107,72,0.45)',
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {itemMarges.some(m => m.hasCalc) && (
                            <>
                              <div className="h-px bg-[rgba(26,83,92,0.08)]" />
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6B66]">
                                  Per item<span className="text-[#F15025]">.</span>
                                </h4>
                                <div className="space-y-1">
                                  {itemMarges.map((m, idx) => {
                                    if (!m.hasCalc) return null
                                    const c = getMargeColorSidebar(m.pct)
                                    return (
                                      <div key={idx} className="flex items-center justify-between text-[12.5px] py-1 px-2 rounded hover:bg-white/60 transition-colors">
                                        <span className="text-[#6B6B66] truncate max-w-[200px]">{m.beschrijving || `Item ${idx + 1}`}</span>
                                        <span className={cn('font-mono font-semibold tabular-nums', c.text)}>{m.pct.toFixed(1)}%</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </>
                          )}

                          {(totaalUren > 0 || effectieveTotaalUren > 0 || materiaalKosten > 0) && (
                            <>
                              <div className="h-px bg-[rgba(26,83,92,0.08)]" />
                              <div className="space-y-2">
                                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#6B6B66]">
                                  {materiaalKosten > 0 ? 'Uren & materiaal' : 'Uren'}<span className="text-[#F15025]">.</span>
                                </h4>
                                <div className="space-y-1.5 text-[13px]">
                                  {urenVelden.map((veld) => {
                                    const basisUren = urenPerVeld[veld] || 0
                                    const correctie = urenCorrectie[veld] || 0
                                    const effectief = basisUren + correctie
                                    const tarief = tariefPerVeld[veld] || 0
                                    if (effectief <= 0 && basisUren <= 0) return null
                                    return (
                                      <div key={veld} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3.5 w-3.5 text-[#1A535C]" />
                                          <span className="text-[#6B6B66]">{veld}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {tarief > 0 && (
                                            <button
                                              onClick={() => setUrenCorrectie(prev => ({ ...prev, [veld]: (prev[veld] || 0) - 1 }))}
                                              disabled={effectief <= 0}
                                              className="h-6 w-6 rounded-md flex items-center justify-center bg-white border border-[rgba(26,83,92,0.12)] hover:border-[#1A535C] hover:bg-[rgba(26,83,92,0.04)] text-[#1A535C] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                              title={`-1 uur ${veld} (${formatCurrency(tarief)}/u)`}
                                            >
                                              <Minus className="h-3 w-3" />
                                            </button>
                                          )}
                                          <span className={cn('font-mono font-semibold tabular-nums min-w-[3.25rem] text-right', correctie !== 0 ? 'text-[#F15025]' : 'text-[#1A1A1A]')}>
                                            {effectief} uur
                                          </span>
                                          {tarief > 0 && (
                                            <button
                                              onClick={() => setUrenCorrectie(prev => ({ ...prev, [veld]: (prev[veld] || 0) + 1 }))}
                                              className="h-6 w-6 rounded-md flex items-center justify-center bg-white border border-[rgba(26,83,92,0.12)] hover:border-[#1A535C] hover:bg-[rgba(26,83,92,0.04)] text-[#1A535C] transition-colors"
                                              title={`+1 uur ${veld} (${formatCurrency(tarief)}/u)`}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {effectieveTotaalUren > 0 && (
                                    <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(26,83,92,0.08)]">
                                      <div className="flex items-center gap-2">
                                        <Wrench className="h-3.5 w-3.5 text-[#F15025]" />
                                        <span className="font-semibold text-[#1A1A1A]">Totaal uren</span>
                                      </div>
                                      <span className="font-mono tabular-nums font-bold text-[#F15025]">{effectieveTotaalUren} uur</span>
                                    </div>
                                  )}
                                  {urenCorrectieBedrag !== 0 && (
                                    <div className="flex items-center justify-between text-[11.5px]">
                                      <span className="text-[#9B9B95]">Uren correctie</span>
                                      <span className={cn('font-mono font-semibold', urenCorrectieBedrag > 0 ? 'text-[#2D6B48]' : 'text-[#C03A18]')}>
                                        {urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)}
                                      </span>
                                    </div>
                                  )}
                                  {materiaalKosten > 0 && (
                                    <div className="flex items-center justify-between pt-1.5 border-t border-[rgba(26,83,92,0.08)]">
                                      <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-3.5 w-3.5 text-[#1A535C]" />
                                        <span className="text-[#6B6B66]">Materiaal</span>
                                      </div>
                                      <span className="font-mono tabular-nums font-semibold text-[#1A535C]">{formatCurrency(materiaalKosten)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {/* Action-buttons in doen-stijl */}
                          <div className="pt-3 border-t border-[rgba(26,83,92,0.08)] grid grid-cols-3 gap-2">
                            <button
                              onClick={handleVerstuurOfferte}
                              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#F15025] text-white text-[12px] font-semibold shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:bg-[#E04520] hover:shadow-[0_4px_14px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all"
                            >
                              <Send className="h-3.5 w-3.5" />Verstuur
                            </button>
                            <button
                              onClick={handleDownloadPdf}
                              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white border border-[rgba(26,83,92,0.12)] text-[#6B6B66] hover:text-[#1A535C] hover:border-[rgba(26,83,92,0.25)] hover:shadow-[0_2px_8px_rgba(20,62,71,0.06)] text-[12px] font-semibold transition-all"
                            >
                              <Download className="h-3.5 w-3.5" />PDF
                            </button>
                            <button
                              onClick={() => saveOfferte('concept')}
                              disabled={isSaving}
                              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#1A535C] text-white text-[12px] font-semibold hover:bg-[#0F3D44] hover:shadow-[0_2px_8px_rgba(20,62,71,0.18)] transition-all disabled:opacity-50"
                            >
                              <Save className="h-3.5 w-3.5" />{isSaving ? '…' : 'Opslaan'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── INKOOPOFFERTES ── */}
                    {sectionId === 'inkoop' && (
                      <div className="doen-slate-surface rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setInkoopPaneelOpen(!inkoopPaneelOpen)}
                          className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/50 transition-colors"
                          style={{ borderBottom: inkoopPaneelOpen ? '1px solid rgba(26,83,92,0.08)' : 'none' }}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(196,72,48,0.25)]"
                            style={{ background: 'linear-gradient(135deg, #F15025 0%, #C44830 100%)' }}
                          >
                            <ShoppingCart className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-[14px] font-bold text-[#1A1A1A]">
                              Inkoop<span className="text-[#F15025]">.</span>
                            </p>
                            <p
                              className="text-[11.5px] text-[#9B9B95]"
                              style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                            >
                              leveranciersprijzen
                            </p>
                          </div>
                          {inkoopPaneelOpen
                            ? <ChevronUp className="h-4 w-4 text-[#9B9B95] flex-shrink-0" />
                            : <ChevronDown className="h-4 w-4 text-[#9B9B95] flex-shrink-0" />}
                        </button>
                        {inkoopPaneelOpen && (
                          <div className="p-4">
                            <InkoopOffertePaneel
                              userId={userId!}
                              offerteId={editOfferteId || autoSaveIdRef.current || undefined}
                              onRegelToevoegen={handleInkoopRegelToevoegen}
                              onRegelAlsPrijsvariant={handleInkoopRegelAlsPrijsvariant}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )
                }

                return (
                  <>
                    {pinnedIds.length > 0 && (
                      <div className="lg:sticky lg:top-4 z-10 bg-background rounded-xl">
                        {pinnedIds.map(id => renderSection(id))}
                      </div>
                    )}
                    {unpinnedIds.map(id => renderSection(id))}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
  )
}
