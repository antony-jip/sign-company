import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
                          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}>
                            <button onClick={() => setKlantPanelOpen(!klantPanelOpen)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#F8F7F5] transition-colors" style={{ borderBottom: '0.5px solid #EBEBEB' }}>
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8BAFD4] to-[#6B8FB4] flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-[10px]">{selectedKlant.bedrijfsnaam[0]?.toUpperCase()}</span>
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-[13px] font-semibold truncate" style={{ color: '#1A1A1A' }}>{selectedKlant.bedrijfsnaam}</p>
                                <p className="text-[11px] truncate" style={{ color: '#9B9B95' }}>{contactpersoon ? `t.a.v. ${contactpersoon}` : 'Geen contactpersoon'}</p>
                              </div>
                              {klantPanelOpen ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9B9B95' }} /> : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9B9B95' }} />}
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

                                {(selectedKlant.kvk_nummer || selectedKlant.btw_nummer) && (
                                  <div className="text-[11px] font-mono space-y-0.5 pt-2" style={{ color: '#6B6B66', borderTop: '0.5px solid #EBEBEB' }}>
                                    {selectedKlant.kvk_nummer && <p>KvK: {selectedKlant.kvk_nummer}</p>}
                                    {selectedKlant.btw_nummer && <p>BTW: {selectedKlant.btw_nummer}</p>}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-1.5 pt-2" style={{ borderTop: '0.5px solid #EBEBEB' }}>
                                  {selectedKlant.telefoon && <a href={`tel:${selectedKlant.telefoon}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ backgroundColor: '#E2F0E8', color: '#2D6B48' }}><Phone className="h-3 w-3" />Bellen</a>}
                                  {selectedKlant.email && <a href={`mailto:${selectedKlant.email}`} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors" style={{ backgroundColor: '#E2F0F0', color: '#1A535C' }}><Mail className="h-3 w-3" />Email</a>}
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
                      <div className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm">
                        {geconverteerdNaarFactuurId ? (
                          <>
                            <div className="bg-[#E8F5EC] dark:bg-[#162018] p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-4 w-4 text-[#4A9960] dark:text-[#6ACA80]" />
                                <p className="text-2xs uppercase tracking-label text-[#4A9960]/80 dark:text-[#6ACA80]/80 font-medium">Gefactureerd</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <p className="text-2xs text-[#4A9960]/60 dark:text-[#6ACA80]/60">Offerte bedrag</p>
                                  <p className="text-sm font-bold text-[#4A9960] dark:text-[#6ACA80]">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#4A9960]/40 dark:text-[#6ACA80]/40 flex-shrink-0" />
                                <div className="flex-1 text-right">
                                  <p className="text-2xs text-[#4A9960]/60 dark:text-[#6ACA80]/60">Factuur</p>
                                  <p className="text-sm font-bold text-[#4A9960] dark:text-[#6ACA80]">{linkedFactuur ? formatCurrency(linkedFactuur.totaal) : '...'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              {linkedFactuur && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">{linkedFactuur.nummer}</span>
                                  </div>
                                  <Badge className={cn('text-2xs',
                                    linkedFactuur.status === 'betaald' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                    linkedFactuur.status === 'verzonden' && 'bg-blue-100 text-blue-700 border-blue-200',
                                    linkedFactuur.status === 'concept' && 'bg-muted text-foreground/70 border-border',
                                    linkedFactuur.status === 'vervallen' && 'bg-red-100 text-red-700 border-red-200',
                                    linkedFactuur.status === 'gecrediteerd' && 'bg-orange-100 text-orange-700 border-orange-200',
                                  )}>
                                    {linkedFactuur.status.charAt(0).toUpperCase() + linkedFactuur.status.slice(1)}
                                  </Badge>
                                </div>
                              )}
                              {linkedFactuur && linkedFactuur.status !== 'betaald' && linkedFactuur.betaald_bedrag > 0 && (
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Betaald</span>
                                  <span className="font-medium text-emerald-600">{formatCurrency(linkedFactuur.betaald_bedrag)}</span>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-8 gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                                onClick={() => navigate(`/facturen/${geconverteerdNaarFactuurId}`)}
                              >
                                <Receipt className="h-3.5 w-3.5" />Bekijk factuur
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Receipt className="h-4 w-4 text-white" />
                                <p className="text-2xs uppercase tracking-label text-white/80 font-medium">Klaar om te factureren</p>
                              </div>
                              <p className="text-2xs text-white/60">Offerte bedrag incl BTW</p>
                              <p className="text-xl font-bold text-white font-mono">{formatCurrency(round2(subtotaal + btwBedrag))}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-2xs text-white/60"><span className="font-mono">{formatCurrency(subtotaal)}</span> excl BTW</p>
                                <p className="text-2xs text-white/60">+<span className="font-mono">{formatCurrency(btwBedrag)}</span> BTW</p>
                              </div>
                            </div>
                            <div className="p-3">
                              <Button
                                size="sm"
                                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                                onClick={() => {
                                  const quoteId = editOfferteId || autoSaveIdRef.current
                                  if (!quoteId) return
                                  const params = new URLSearchParams({ offerte_id: quoteId, klant_id: selectedKlantId })
                                  if (offerteTitel) params.set('titel', offerteTitel)
                                  if (selectedProjectId) params.set('project_id', selectedProjectId)
                                  navigate(`/facturen/nieuw?${params.toString()}`)
                                }}
                              >
                                <Receipt className="h-4 w-4" />Factuur aanmaken
                                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── SAMENVATTING ── */}
                    {sectionId === 'samenvatting' && (
                      <div className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm">
                        <div className="bg-mod-klanten-light dark:bg-mod-klanten-light/15 p-4">
                          <p className="text-2xs uppercase tracking-label text-foreground/70 font-medium">Totaal incl BTW</p>
                          {isEditingTotaal ? (
                            <div className="mt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-foreground font-bold text-lg">€</span>
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
                                  className="bg-foreground/10 text-foreground font-bold text-lg rounded px-2 py-0.5 w-32 border-0 outline-none placeholder:text-foreground/40"
                                  placeholder={round2(subtotaal + btwBedrag).toFixed(2)}
                                />
                              </div>
                              <p className="text-2xs text-foreground/50 mt-0.5">Enter = bevestig, Esc = annuleer</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGewenstTotaal(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))).toFixed(2))
                                setIsEditingTotaal(true)
                              }}
                              className="text-xl font-bold font-mono text-foreground mt-0.5 hover:underline underline-offset-2 decoration-foreground/40 cursor-pointer text-left"
                              title="Klik om totaal aan te passen"
                            >
                              {formatCurrency(round2(subtotaal + btwBedrag + ((afrondingskorting + urenCorrectieBedrag) * (1 + (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))))}
                            </button>
                          )}
                          {afrondingskorting !== 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-2xs text-white/60">Korting: {formatCurrency(afrondingskorting)} excl BTW</p>
                              <button onClick={() => setAfrondingskorting(0)} className="text-2xs text-white/50 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {urenCorrectieBedrag !== 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-2xs text-white/60">Uren correctie: {urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)} excl BTW</p>
                              <button onClick={() => setUrenCorrectie({})} className="text-2xs text-white/50 hover:text-white underline">Herstel</button>
                            </div>
                          )}
                          {optionelSubtotaal > 0 && (
                            <p className="text-2xs text-white/60 mt-1">+ {formatCurrency(round2(optionelSubtotaal + optionelBtw))} aan opties</p>
                          )}
                        </div>

                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-background/80 dark:bg-muted/50 p-2.5">
                              <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Subtotaal</p>
                              <p className="text-sm font-medium font-mono text-foreground mt-0.5">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</p>
                            </div>
                            <div className="rounded-lg bg-background/80 dark:bg-muted/50 p-2.5">
                              <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">BTW</p>
                              <p className="text-sm font-medium font-mono text-foreground mt-0.5">{formatCurrency(round2(btwBedrag + (afrondingskorting + urenCorrectieBedrag) * (subtotaal > 0 ? btwBedrag / subtotaal : 0.21)))}</p>
                            </div>
                          </div>
                          {afrondingskorting !== 0 && (
                            <div className="rounded-lg bg-amber-50/80 dark:bg-amber-900/20 p-2.5 border border-amber-200/50 dark:border-amber-800/30">
                              <p className="text-2xs uppercase tracking-label text-amber-600 font-medium">Afrondingskorting</p>
                              <p className="text-sm font-medium font-mono text-amber-700 mt-0.5">{formatCurrency(afrondingskorting)}</p>
                            </div>
                          )}

                          <Separator className="opacity-50" />

                          <div className="space-y-2">
                            <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Inkoop / Verkoop</p>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-red-400" /><span className="text-xs text-muted-foreground">Inkoop</span></div>
                                <span className="text-xs font-medium font-mono text-red-600 dark:text-red-400">{totaalInkoop > 0 ? formatCurrency(totaalInkoop) : '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-green-400" /><span className="text-xs text-muted-foreground">Verkoop</span></div>
                                <span className="text-xs font-medium font-mono text-foreground">{formatCurrency(round2(subtotaal + afrondingskorting + urenCorrectieBedrag))}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-muted-foreground">Winst</span></div>
                                <span className="text-xs font-medium font-mono text-emerald-600 dark:text-emerald-400">{totaalInkoop > 0 ? formatCurrency(winstExBtw) : '—'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Marge</p>
                            <div className={cn('rounded-lg p-3', margeColor.bg)}>
                              <div className="flex items-center justify-between">
                                <Percent className={cn('h-4 w-4', margeColor.text)} />
                                <span className={cn('text-lg font-bold font-mono', margeColor.text)}>{totaalInkoop > 0 ? `${margePercentage.toFixed(1)}%` : '—'}</span>
                              </div>
                              {totaalInkoop > 0 && (
                                <div className="mt-2 h-1.5 rounded-full bg-secondary dark:bg-muted">
                                  <div className={cn('h-full rounded-full transition-all', margeColor.bar)} style={{ width: `${Math.min(100, Math.max(0, margePercentage))}%` }} />
                                </div>
                              )}
                            </div>
                          </div>

                          {itemMarges.some(m => m.hasCalc) && (
                            <>
                              <Separator className="opacity-50" />
                              <div className="space-y-2">
                                <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">Per item</p>
                                <div className="space-y-1.5">
                                  {itemMarges.map((m, idx) => {
                                    if (!m.hasCalc) return null
                                    const c = getMargeColorSidebar(m.pct)
                                    return (
                                      <div key={idx} className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{m.beschrijving || `Item ${idx + 1}`}</span>
                                        <span className={cn('text-xs font-medium font-mono', c.text)}>{m.pct.toFixed(1)}%</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </>
                          )}

                          {(totaalUren > 0 || effectieveTotaalUren > 0 || materiaalKosten > 0) && (
                            <>
                              <Separator className="opacity-50" />
                              <div className="space-y-2">
                                <p className="text-2xs uppercase tracking-label text-muted-foreground font-medium">{materiaalKosten > 0 ? 'Uren & Materiaal' : 'Uren'}</p>
                                <div className="space-y-1.5">
                                  {urenVelden.map((veld) => {
                                    const basisUren = urenPerVeld[veld] || 0
                                    const correctie = urenCorrectie[veld] || 0
                                    const effectief = basisUren + correctie
                                    const tarief = tariefPerVeld[veld] || 0
                                    if (effectief <= 0 && basisUren <= 0) return null
                                    return (
                                      <div key={veld} className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="h-3.5 w-3.5 text-purple-500" />
                                          <span className="text-xs text-muted-foreground">{veld}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {tarief > 0 && (
                                            <button
                                              onClick={() => setUrenCorrectie(prev => ({ ...prev, [veld]: (prev[veld] || 0) - 1 }))}
                                              disabled={effectief <= 0}
                                              className="h-5 w-5 rounded flex items-center justify-center bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                              title={`-1 uur ${veld} (${formatCurrency(tarief)}/u)`}
                                            >
                                              <Minus className="h-3 w-3" />
                                            </button>
                                          )}
                                          <span className={cn('text-xs font-medium font-mono min-w-[3rem] text-right', correctie !== 0 ? 'text-purple-700 dark:text-purple-400' : 'text-purple-600')}>
                                            {effectief} uur
                                          </span>
                                          {tarief > 0 && (
                                            <button
                                              onClick={() => setUrenCorrectie(prev => ({ ...prev, [veld]: (prev[veld] || 0) + 1 }))}
                                              className="h-5 w-5 rounded flex items-center justify-center bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/60 text-purple-600 transition-colors"
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
                                    <div className="flex items-center justify-between pt-1 border-t border-border dark:border-border">
                                      <div className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs font-medium text-foreground">Totaal uren</span></div>
                                      <span className="text-xs font-bold text-amber-600">{effectieveTotaalUren} uur</span>
                                    </div>
                                  )}
                                  {urenCorrectieBedrag !== 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-2xs text-muted-foreground">Uren correctie</span>
                                      <span className={cn('text-2xs font-medium', urenCorrectieBedrag > 0 ? 'text-green-600' : 'text-red-500')}>
                                        {urenCorrectieBedrag > 0 ? '+' : ''}{formatCurrency(urenCorrectieBedrag)}
                                      </span>
                                    </div>
                                  )}
                                  {materiaalKosten > 0 && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5 text-blue-500" /><span className="text-xs text-muted-foreground">Materiaal</span></div>
                                      <span className="text-xs font-medium font-mono text-blue-600">{formatCurrency(materiaalKosten)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          <Separator className="opacity-50" />
                          <div className="flex flex-wrap gap-1.5">
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleVerstuurOfferte}>
                              <Send className="h-3 w-3" />Verstuur
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={handleDownloadPdf}>
                              <Download className="h-3 w-3" />PDF
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => saveOfferte('concept')} disabled={isSaving}>
                              <Save className="h-3 w-3" />{isSaving ? '...' : 'Opslaan'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── INKOOPOFFERTES ── */}
                    {sectionId === 'inkoop' && (
                      <div className="rounded-xl border border-border dark:border-border bg-card overflow-hidden shadow-sm">
                        <button
                          onClick={() => setInkoopPaneelOpen(!inkoopPaneelOpen)}
                          className="w-full flex items-center gap-2 px-4 py-3 bg-background/80 dark:bg-muted/50 border-b border-border dark:border-border hover:bg-muted dark:hover:bg-muted transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold text-foreground">Inkoopoffertes</p>
                            <p className="text-xs text-muted-foreground">Leveranciersprijzen</p>
                          </div>
                          {inkoopPaneelOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
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
