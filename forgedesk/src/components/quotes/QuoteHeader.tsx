import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Check,
  Save,
  Download,
  Building2,
  ChevronDown,
  Clock,
  Copy,
  MoreHorizontal,
  ClipboardList,
  FileCheck,
  ArrowRight,
  Search,
  X,
  Send,
  Mail,
  Globe,
} from 'lucide-react'
import type { Klant } from '@/types'
import { cn } from '@/lib/utils'
import { hapticLight, hapticMedium } from '@/utils/haptic'

export interface QuoteHeaderProps {
  isEditMode: boolean
  offerteNummer: string
  geldigTot: string
  autoSaveStatus: 'idle' | 'saving' | 'saved'
  selectedKlant: Klant | undefined
  isSaving: boolean
  selectedProjectId: string
  verstuurdOp?: string
  verstuurdNaar?: string
  versioning: {
    versieNummer: number
    showVersieHistorie: boolean
    setShowVersieHistorie: (v: boolean) => void
    handleNieuweVersie: () => void
    isSavingVersie: boolean
  }
  email: {
    showVerstuurKeuze: boolean
    setShowVerstuurKeuze: (v: boolean) => void
    isSendingPortaal: boolean
  }
  showActionsMenu: boolean
  setShowActionsMenu: (v: boolean) => void
  isDuplicating: boolean
  handleDownloadPdf: () => void
  saveOfferte: (status: 'concept' | 'verzonden') => void
  handleVerstuurOfferte: () => void
  handleKeuzePortaal: () => void
  handleKeuzeEmail: () => void
  handleDupliceerOfferte: (targetKlantId?: string) => void
  setShowKlantSelector: (v: boolean) => void
  onWerkbon?: () => void
  onOpdrachtbevestiging?: () => void
  // Kopieer naar andere klant
  showKopieerNaarKlant?: boolean
  setShowKopieerNaarKlant?: (v: boolean) => void
  kopieerZoek?: string
  setKopieerZoek?: (v: string) => void
  klanten?: Array<{ id: string; bedrijfsnaam?: string }>
}

export function QuoteHeader({
  isEditMode,
  offerteNummer,
  geldigTot,
  autoSaveStatus,
  selectedKlant,
  isSaving,
  selectedProjectId,
  versioning,
  email,
  showActionsMenu,
  setShowActionsMenu,
  isDuplicating,
  verstuurdOp,
  verstuurdNaar,
  handleDownloadPdf,
  saveOfferte,
  handleVerstuurOfferte,
  handleKeuzePortaal,
  handleKeuzeEmail,
  handleDupliceerOfferte,
  setShowKlantSelector,
  onWerkbon,
  onOpdrachtbevestiging,
  showKopieerNaarKlant,
  setShowKopieerNaarKlant,
  kopieerZoek,
  setKopieerZoek,
  klanten,
}: QuoteHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string })?.from

  // Geldig-tot indicator
  const geldigInfo = (() => {
    if (!geldigTot) return null
    const days = Math.floor((new Date(geldigTot).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const datumLabel = new Date(geldigTot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    if (days < 0) return { label: 'Verlopen', accent: 'flame' as const, sub: datumLabel }
    if (days < 7) return { label: `Nog ${days} dagen`, accent: 'amber' as const, sub: datumLabel }
    return { label: `t/m ${datumLabel}`, accent: 'muted' as const, sub: null }
  })()

  return (
    <div className="bg-background border-b border-[rgba(26,83,92,0.08)] dark:border-white/10 px-4 md:px-8 py-4 mb-6 -mx-4 md:-mx-6">

      {/* Row 0: breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] mb-2">
        {(() => {
          const backLabel = from
            ? from.startsWith('/projecten/') ? 'Project'
            : from.startsWith('/klanten/') ? 'Klant'
            : from.startsWith('/facturen/') ? 'Factuur'
            : from === '/projecten' ? 'Projecten'
            : from === '/klanten' ? 'Klanten'
            : from === '/facturen' ? 'Facturen'
            : 'Offertes'
            : 'Offertes'
          const handleBack = () => {
            hapticLight()
            if (from) navigate(from)
            else if (window.history.length > 2 && location.key !== 'default') navigate(-1)
            else navigate('/offertes')
          }
          return (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-petrol dark:hover:text-petrol-light transition-colors group"
            >
              <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
              {backLabel}
            </button>
          )
        })()}
        <span className="text-muted-foreground/70">·</span>
        <span className="font-mono text-[11px] font-medium text-foreground/70 bg-[rgba(26,83,92,0.05)] dark:bg-white/[0.05] border border-[rgba(26,83,92,0.08)] dark:border-white/10 rounded-md px-1.5 py-0.5">
          {offerteNummer}
        </span>
        {versioning.versieNummer > 1 && (
          <button
            onClick={() => versioning.setShowVersieHistorie(!versioning.showVersieHistorie)}
            className="font-mono text-[11px] font-medium text-[#6A5A8A] bg-[hsl(var(--status-violet-bg))] border border-[#6A5A8A]/15 rounded-md px-1.5 py-0.5 hover:bg-[#E0D6EC] transition-colors"
          >
            v{versioning.versieNummer}
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 md:gap-6">

        {/* Left: H1 + status meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-[28px] md:text-[32px] font-extrabold text-foreground tracking-[-0.5px] leading-none truncate">
              {isEditMode ? 'Offerte bewerken' : 'Nieuwe offerte'}<span className="text-[#F15025]">.</span>
            </h1>

            {/* Verstuurd-status pill */}
            {verstuurdOp && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#3A5A9A] bg-[hsl(var(--status-blue-bg))] border border-[#3A5A9A]/20 px-2 py-0.5 rounded-md">
                <Send className="h-3 w-3" strokeWidth={1.75} />
                Verstuurd{verstuurdNaar ? ` · ${verstuurdNaar}` : ''} · {new Date(verstuurdOp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
              </span>
            )}

            {/* Geldigheid */}
            {geldigInfo && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-md',
                geldigInfo.accent === 'flame' && 'text-[#C0451A] bg-[hsl(var(--status-flame-bg))] border border-[#C0451A]/20 font-semibold',
                geldigInfo.accent === 'amber' && 'text-[#8A6A2A] bg-[hsl(var(--status-amber-bg))] border border-[#8A6A2A]/15',
                geldigInfo.accent === 'muted' && 'text-foreground/70',
              )}>
                {geldigInfo.label}
              </span>
            )}
          </div>

          {/* Subline: klant + autosave-status */}
          <div className="mt-2 text-[13.5px] flex items-center gap-2 flex-wrap">
            {selectedKlant ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3A6B8C]" />
                <span className="font-semibold text-foreground/80">{selectedKlant.bedrijfsnaam || selectedKlant.contactpersoon}</span>
                {selectedKlant.stad && <span className="text-muted-foreground font-normal"> · {selectedKlant.stad}</span>}
              </span>
            ) : (
              <span
                className="text-muted-foreground"
                style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
              >
                · selecteer een klant en vul de details in
              </span>
            )}
            {autoSaveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#8A7A4A] ml-auto md:ml-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8A7A4A] animate-pulse" />
                Opslaan…
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[12px] text-[#2D6B48] ml-auto md:ml-2">
                <Check className="h-3 w-3" />
                Opgeslagen
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* PDF */}
          <button
            onClick={() => { hapticLight(); handleDownloadPdf() }}
            className="inline-flex items-center justify-center gap-1.5 h-10 md:h-9 w-10 md:w-auto md:px-3.5 text-[13px] font-medium rounded-xl border border-[rgba(26,83,92,0.12)] dark:border-white/10 bg-white dark:bg-card text-foreground/70 hover:text-[#1A535C] dark:hover:text-petrol-light hover:border-[rgba(26,83,92,0.25)] dark:hover:border-white/20 hover:shadow-[0_2px_8px_rgba(20,62,71,0.06)] transition-all"
            aria-label="PDF downloaden"
          >
            <Download className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">PDF</span>
          </button>

          {/* Opslaan */}
          <button
            onClick={() => { hapticLight(); saveOfferte('concept') }}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 h-10 md:h-9 w-10 md:w-auto md:px-4 text-[13px] font-semibold rounded-xl bg-[#1A535C] text-white hover:bg-[#0F3D44] hover:shadow-[0_2px_8px_rgba(20,62,71,0.18)] transition-all disabled:opacity-50"
            aria-label="Opslaan"
          >
            <Save className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">{isSaving ? 'Opslaan…' : 'Opslaan'}</span>
          </button>

          {/* Verstuur — Flame split-button */}
          <div className="relative flex items-center">
            <button
              onClick={() => { hapticMedium(); handleVerstuurOfferte() }}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 h-10 md:h-9 px-4 md:px-5 text-[13px] md:text-sm font-semibold rounded-l-xl bg-[#F15025] text-white hover:bg-[#E04520] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_16px_rgba(241,80,37,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Send className="h-4 w-4" strokeWidth={1.75} />
              <span>Verstuur</span>
            </button>
            <button
              onClick={() => { hapticLight(); email.setShowVerstuurKeuze(!email.showVerstuurKeuze) }}
              disabled={isSaving}
              className="inline-flex items-center h-10 md:h-9 px-2 md:px-2 text-sm rounded-r-xl bg-[#E04520] text-white hover:bg-[#D03A18] transition-colors disabled:opacity-50 border-l border-white/25 shadow-[0_2px_8px_rgba(241,80,37,0.25)]"
              aria-label="Versturen via…"
            >
              <ChevronDown className="h-4 w-4 md:h-3.5 md:w-3.5" />
            </button>
            {email.showVerstuurKeuze && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => email.setShowVerstuurKeuze(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 doen-slate-surface rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                  <button
                    onClick={handleKeuzePortaal}
                    disabled={email.isSendingPortaal || !selectedProjectId}
                    className="w-full text-left px-4 py-3 hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-b border-[rgba(26,83,92,0.08)] dark:border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#1A535C] flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(20,62,71,0.2)]">
                        <Globe className="h-4 w-4" strokeWidth={1.75} color="#FFFFFF" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-foreground">Via portaal</p>
                        <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">Klant bekijkt online + email-notificatie</p>
                        {!selectedProjectId && (
                          <p className="text-[10.5px] text-[#C0451A] mt-1">Koppel eerst een project</p>
                        )}
                        {email.isSendingPortaal && (
                          <p className="text-[10.5px] text-[#1A535C] dark:text-petrol-light mt-1 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#1A535C] dark:bg-petrol-light animate-pulse" />
                            Delen…
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={handleKeuzeEmail}
                    className="w-full text-left px-4 py-3 hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#F15025] flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(241,80,37,0.25)]">
                        <Mail className="h-4 w-4" strokeWidth={1.75} color="#FFFFFF" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-foreground">Via email</p>
                        <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">PDF-bijlage + gepersonaliseerde email</p>
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Actions dropdown */}
          {isEditMode && (
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 md:h-9 md:w-9 rounded-xl border-[rgba(26,83,92,0.12)] dark:border-white/10 hover:border-[rgba(26,83,92,0.25)] dark:hover:border-white/20 hover:bg-white dark:hover:bg-white/[0.06] hover:shadow-[0_2px_8px_rgba(20,62,71,0.06)] transition-all"
                onClick={() => { hapticLight(); setShowActionsMenu(!showActionsMenu) }}
                aria-label="Meer acties"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {showActionsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 doen-slate-surface rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.05)] py-1 w-52">
                    <button
                      onClick={() => { handleDupliceerOfferte(); setShowActionsMenu(false) }}
                      disabled={isDuplicating}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      {isDuplicating ? 'Dupliceren…' : 'Dupliceer offerte'}
                    </button>
                    <button
                      onClick={() => { setShowKopieerNaarKlant?.(true); setShowActionsMenu(false) }}
                      disabled={isDuplicating}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      Kopieer naar andere klant
                    </button>
                    <button
                      onClick={() => { versioning.handleNieuweVersie(); setShowActionsMenu(false) }}
                      disabled={versioning.isSavingVersie}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {versioning.isSavingVersie ? 'Opslaan…' : `Nieuwe versie (v${versioning.versieNummer})`}
                    </button>
                    <button
                      onClick={() => { setShowKlantSelector(true); setShowActionsMenu(false) }}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                    >
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      Klant wijzigen
                    </button>
                    {onWerkbon && (
                      <button
                        onClick={() => { onWerkbon(); setShowActionsMenu(false) }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                      >
                        <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                        Werkbon maken
                      </button>
                    )}
                    {onOpdrachtbevestiging && (
                      <button
                        onClick={() => { onOpdrachtbevestiging(); setShowActionsMenu(false) }}
                        className="w-full text-left px-3 py-2 text-[13px] hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] flex items-center gap-2 transition-colors"
                      >
                        <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        Opdrachtbevestiging
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Kopieer naar andere klant — modal */}
      {showKopieerNaarKlant && klanten && setShowKopieerNaarKlant && setKopieerZoek && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setShowKopieerNaarKlant(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto doen-slate-surface rounded-2xl shadow-[0_8px_32px_rgba(20,62,71,0.16)] w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(26,83,92,0.08)] dark:border-white/10">
                <h3 className="font-heading text-[16px] font-bold text-foreground">
                  Kopieer naar klant<span className="text-[#F15025]">.</span>
                </h3>
                <button
                  onClick={() => setShowKopieerNaarKlant(false)}
                  className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-4 w-4 text-foreground/70" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Zoek klant…"
                    value={kopieerZoek || ''}
                    onChange={(e) => setKopieerZoek(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[rgba(26,83,92,0.12)] dark:border-white/10 rounded-lg bg-white dark:bg-white/[0.05] focus:border-[#1A535C] dark:focus:border-white/30 focus:ring-[3px] focus:ring-[rgba(26,83,92,0.12)] dark:focus:ring-white/10 outline-none transition-colors"
                  />
                </div>
                <div className="max-h-[280px] overflow-y-auto space-y-0.5">
                  {klanten
                    .filter((k) => !kopieerZoek || (k.bedrijfsnaam || '').toLowerCase().includes(kopieerZoek.toLowerCase()))
                    .slice(0, 50)
                    .map((k) => (
                      <button
                        key={k.id}
                        onClick={() => handleDupliceerOfferte(k.id)}
                        disabled={isDuplicating}
                        className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-[hsl(38,20%,95.5%)] dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-foreground">{k.bedrijfsnaam || '(naamloos)'}</span>
                      </button>
                    ))
                  }
                  {klanten.filter((k) => !kopieerZoek || (k.bedrijfsnaam || '').toLowerCase().includes(kopieerZoek.toLowerCase())).length === 0 && (
                    <p
                      className="text-center text-sm text-muted-foreground py-4"
                      style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
                    >
                      geen klanten gevonden
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
