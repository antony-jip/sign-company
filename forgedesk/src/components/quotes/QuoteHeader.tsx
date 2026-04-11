import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Check,
  Save,
  Send,
  Download,
  Building2,
  Mail,
  ChevronDown,
  Clock,
  Copy,
  MoreHorizontal,
  ClipboardList,
  FileCheck,
} from 'lucide-react'
import type { Klant } from '@/types'

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
  handleDupliceerOfferte: () => void
  setShowKlantSelector: (v: boolean) => void
  onWerkbon?: () => void
  onOpdrachtbevestiging?: () => void
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
}: QuoteHeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string })?.from

  return (
      <div className="sticky top-0 z-10 bg-[#F8F7F5]/80 backdrop-blur-sm border-b border-[#EBEBEB] px-6 py-3 mb-6 -mx-4 md:-mx-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Title + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button onClick={() => navigate(from || '/offertes')} className="text-[#9B9B95] hover:text-[#6B6B66] transition-colors flex-shrink-0"><ArrowLeft className="h-4 w-4" /></button>
              <h1 className="text-xl font-bold text-[#1A1A1A] tracking-[-0.3px] truncate">{isEditMode ? 'Offerte bewerken' : 'Nieuwe offerte'}</h1>
              <span className="text-[13px] font-mono text-[#9B9B95] flex-shrink-0">{offerteNummer}</span>
              {versioning.versieNummer > 1 && (
                <button onClick={() => versioning.setShowVersieHistorie(!versioning.showVersieHistorie)} className="text-[11px] font-mono text-[#6A5A8A] hover:underline flex-shrink-0">v{versioning.versieNummer}</button>
              )}
              {verstuurdOp && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3A5A9A] bg-[#E8EEF9] px-2 py-0.5 rounded-full flex-shrink-0">
                  <Mail className="h-2.5 w-2.5" />
                  Verstuurd{verstuurdNaar ? ` naar ${verstuurdNaar}` : ''} · {new Date(verstuurdOp).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </span>
              )}
              {geldigTot && (() => {
                const days = Math.floor((new Date(geldigTot).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                if (days < 0) return <span className="text-xs text-[#C0451A] font-medium flex-shrink-0">Verlopen<span className="text-[#F15025]">.</span></span>
                if (days < 7) return <span className="text-xs text-[#C0451A] flex-shrink-0">Nog {days}d</span>
                return <span className="text-xs text-[#9B9B95] flex-shrink-0">t/m <span className="font-mono">{new Date(geldigTot).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span></span>
              })()}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {autoSaveStatus === 'saving' && <span className="flex items-center gap-1.5 text-xs text-[#8A7A4A]"><div className="h-1.5 w-1.5 rounded-full bg-[#8A7A4A] animate-pulse" />Opslaan...</span>}
              {autoSaveStatus === 'saved' && <span className="flex items-center gap-1.5 text-xs text-[#3A7D52]"><Check className="h-3 w-3" />Opgeslagen</span>}
              {!autoSaveStatus && <p className="text-[13px] text-[#9B9B95]">{isEditMode ? selectedKlant?.bedrijfsnaam || '' : 'Selecteer een klant en vul de details in'}</p>}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDownloadPdf} className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-lg border border-[#EBEBEB] text-[#6B6B66] hover:text-[#1A1A1A] hover:border-[#EBEBEB] hover:bg-[#F8F7F5] transition-colors">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => saveOfferte('concept')} disabled={isSaving} className="inline-flex items-center gap-1.5 h-8 px-4 text-[12px] font-medium rounded-lg bg-[#1A535C] text-white hover:bg-[#164850] transition-colors disabled:opacity-50">
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isSaving ? 'Opslaan...' : 'Opslaan'}</span>
            </button>
            {/* Verstuur split button */}
            <div className="relative flex items-center">
              <button onClick={handleVerstuurOfferte} disabled={isSaving} className="inline-flex items-center gap-1.5 h-9 px-5 text-sm font-semibold rounded-l-lg bg-[#F15025] text-white hover:bg-[#D94520] transition-colors disabled:opacity-50">
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Verstuur</span>
              </button>
              <button
                onClick={() => email.setShowVerstuurKeuze(!email.showVerstuurKeuze)}
                disabled={isSaving}
                className="inline-flex items-center h-9 px-1.5 text-sm font-semibold rounded-r-lg bg-[#D94520] text-white hover:bg-[#C03A18] transition-colors disabled:opacity-50 border-l border-white/20"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {email.showVerstuurKeuze && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => email.setShowVerstuurKeuze(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-[#FFFFFF] rounded-xl border border-[#EBEBEB] shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-hidden">
                    <button
                      onClick={handleKeuzePortaal}
                      disabled={email.isSendingPortaal || !selectedProjectId}
                      className="w-full text-left px-4 py-3 hover:bg-[#F8F7F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-b border-[#EBEBEB]/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-[#1A535C] flex items-center justify-center flex-shrink-0">
                          <Send className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">Via portaal</p>
                          <p className="text-[11px] text-[#9B9B95] leading-snug">Klant bekijkt online + email notificatie</p>
                        </div>
                      </div>
                      {!selectedProjectId && <p className="text-[10px] text-[#C0451A] mt-1 ml-9">Koppel eerst een project</p>}
                      {email.isSendingPortaal && <p className="text-[10px] text-[#1A535C] mt-1 ml-9 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#1A535C] animate-pulse" />Delen...</p>}
                    </button>
                    <button
                      onClick={handleKeuzeEmail}
                      className="w-full text-left px-4 py-3 hover:bg-[#F8F7F5] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-[#F15025] flex items-center justify-center flex-shrink-0">
                          <Mail className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">Via email</p>
                          <p className="text-[11px] text-[#9B9B95] leading-snug">PDF bijlage + gepersonaliseerde email</p>
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
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowActionsMenu(!showActionsMenu)}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {showActionsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-card rounded-lg border border-border dark:border-border shadow-lg py-1 w-48">
                      <button onClick={() => { handleDupliceerOfferte(); setShowActionsMenu(false) }} disabled={isDuplicating} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2 disabled:opacity-50">
                        <Copy className="h-3.5 w-3.5" />{isDuplicating ? 'Dupliceren...' : 'Dupliceer offerte'}
                      </button>
                      <button onClick={() => { versioning.handleNieuweVersie(); setShowActionsMenu(false) }} disabled={versioning.isSavingVersie} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2 disabled:opacity-50">
                        <Clock className="h-3.5 w-3.5" />{versioning.isSavingVersie ? 'Opslaan...' : `Nieuwe versie (v${versioning.versieNummer})`}
                      </button>
                      <button onClick={() => { setShowKlantSelector(true); setShowActionsMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />Klant wijzigen
                      </button>
                      {onWerkbon && (
                        <button onClick={() => { onWerkbon(); setShowActionsMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2">
                          <ClipboardList className="h-3.5 w-3.5" />Werkbon maken
                        </button>
                      )}
                      {onOpdrachtbevestiging && (
                        <button onClick={() => { onOpdrachtbevestiging(); setShowActionsMenu(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-background dark:hover:bg-muted flex items-center gap-2">
                          <FileCheck className="h-3.5 w-3.5" />Opdrachtbevestiging
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
