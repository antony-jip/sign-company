import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  UserPlus, FolderPlus, ListPlus, Link2,
  ArrowLeft, X, Loader2, Building2, Search,
} from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Email, Medewerker, Klant } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { createKlant, createTaak, getMedewerkers, getKlanten, updateKlant } from '@/services/supabaseService'
import { logCreate } from '@/utils/auditLogger'
import { logger } from '@/utils/logger'
import { extractSenderName, extractSenderEmail, getAvatarStyle } from './emailHelpers'
import { EmailProjectKoppelingPanel } from './EmailProjectKoppelingPanel'
import { hapticLight } from '@/utils/haptic'

interface Props {
  email: Email | null
  // Project flow blijft via bestaande Dialog — callback opent die centered modal
  onOpenProjectDialog: () => void
}

type View = 'menu' | 'klant' | 'taak' | 'koppel'

export function EmailActionsPopover({ email, onOpenProjectDialog }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const titelInputRef = useRef<HTMLInputElement | null>(null)
  const klantInputRef = useRef<HTMLInputElement | null>(null)

  const senderName = email ? extractSenderName(email.van) : ''
  const senderEmail = email ? extractSenderEmail(email.van) : ''
  const senderDomain = senderEmail.match(/@(.+)/)?.[1]?.toLowerCase() || ''
  const guessedBedrijf = senderDomain && !['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl'].includes(senderDomain)
    ? senderDomain.split('.')[0].charAt(0).toUpperCase() + senderDomain.split('.')[0].slice(1)
    : ''

  // Form state — auto-filled wanneer view opent
  const [klantForm, setKlantForm] = useState({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '' })
  const [klantStep, setKlantStep] = useState<'search' | 'add-to-existing' | 'create-new'>('search')
  const [klantSearch, setKlantSearch] = useState('')
  const [addToKlant, setAddToKlant] = useState<Klant | null>(null)
  const [allKlanten, setAllKlanten] = useState<Klant[]>([])
  const [taakForm, setTaakForm] = useState({ titel: '', deadline: '', toegewezen_aan: '' })
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])

  useEffect(() => {
    getMedewerkers().then(m => setMedewerkers(m.filter(mw => mw.status === 'actief'))).catch(() => {})
    getKlanten().then(setAllKlanten).catch(() => {})
  }, [])

  // Klant-suggestions: filtered list, max 5, default top-5 wanneer query leeg.
  // Zoekt automatisch ook op het afzender-domein zodat een nieuwe contactpersoon
  // van een bestaande klant meteen matcht.
  const klantSuggestions = useMemo(() => {
    const q = (klantSearch || senderDomain).toLowerCase().trim()
    if (!q) return allKlanten.slice(0, 5)
    return allKlanten.filter(k =>
      k.bedrijfsnaam?.toLowerCase().includes(q) ||
      k.contactpersoon?.toLowerCase().includes(q) ||
      k.email?.toLowerCase().includes(q)
    ).slice(0, 5)
  }, [klantSearch, allKlanten, senderDomain])

  // Reset bij sluiten
  useEffect(() => {
    if (!open) setView('menu')
  }, [open])

  // Auto-fill bij wisselen naar form-view
  useEffect(() => {
    if (view === 'klant') {
      setKlantStep('search')
      setKlantSearch('')
      setAddToKlant(null)
      setKlantForm({ bedrijfsnaam: guessedBedrijf, contactpersoon: senderName, email: senderEmail, telefoon: '' })
      setTimeout(() => klantInputRef.current?.focus(), 50)
    } else if (view === 'taak') {
      setTaakForm({ titel: email?.onderwerp || '', deadline: '', toegewezen_aan: '' })
      setTimeout(() => titelInputRef.current?.focus(), 50)
    }
  }, [view, senderName, senderEmail, guessedBedrijf, email?.onderwerp])

  // Click-outside om te sluiten
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Escape om terug naar menu of sluiten
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view !== 'menu') setView('menu')
        else setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, view])

  const handleAddContactToExisting = useCallback(async () => {
    if (!addToKlant || !klantForm.contactpersoon.trim()) {
      toast.error('Naam is verplicht')
      return
    }
    setSaving(true)
    try {
      const bestaande = addToKlant.contactpersonen || []
      const nieuw = {
        id: crypto.randomUUID(),
        naam: klantForm.contactpersoon,
        functie: '',
        email: klantForm.email,
        telefoon: klantForm.telefoon,
        is_primair: false,
      }
      await updateKlant(addToKlant.id, { contactpersonen: [...bestaande, nieuw] })
      toast.success(`${klantForm.contactpersoon} toegevoegd aan ${addToKlant.bedrijfsnaam || addToKlant.contactpersoon}`)
      setOpen(false)
    } catch (err) {
      logger.error('Contact toevoegen mislukt:', err)
      toast.error('Contact toevoegen mislukt')
    } finally {
      setSaving(false)
    }
  }, [addToKlant, klantForm])

  const handleSaveKlant = useCallback(async () => {
    if (!klantForm.contactpersoon.trim() || !klantForm.email.trim()) {
      toast.error('Naam en email zijn verplicht')
      return
    }
    setSaving(true)
    try {
      const newKlant = await createKlant({
        bedrijfsnaam: klantForm.bedrijfsnaam || klantForm.contactpersoon,
        contactpersoon: klantForm.contactpersoon,
        email: klantForm.email,
        telefoon: klantForm.telefoon,
        adres: '', postcode: '', stad: '', land: 'Nederland',
        website: senderDomain ? `www.${senderDomain}` : '',
        debiteurennummer: '', kvk_nummer: '', btw_nummer: '', status: 'actief', tags: [], notities: '',
        contactpersonen: [{ id: crypto.randomUUID(), naam: klantForm.contactpersoon, functie: '', email: klantForm.email, telefoon: klantForm.telefoon, is_primair: true }],
      })
      logCreate({ user, medewerkers, entityType: 'klant', entityId: newKlant.id })
      toast.success('Klant aangemaakt')
      setOpen(false)
    } catch (err) {
      logger.error('Klant aanmaken mislukt:', err)
      toast.error('Klant aanmaken mislukt')
    } finally {
      setSaving(false)
    }
  }, [klantForm, senderDomain, user, medewerkers])

  const handleSaveTaak = useCallback(async () => {
    if (!taakForm.titel.trim()) {
      toast.error('Titel is verplicht')
      return
    }
    setSaving(true)
    try {
      const taak = await createTaak({
        titel: taakForm.titel,
        beschrijving: '',
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: taakForm.toegewezen_aan,
        geschatte_tijd: 0,
        bestede_tijd: 0,
        klant_id: '',
        deadline: taakForm.deadline || undefined,
      })
      logCreate({ user, medewerkers, entityType: 'taak', entityId: taak.id })
      toast.success('Taak aangemaakt')
      setOpen(false)
    } catch (err) {
      logger.error('Taak aanmaken mislukt:', err)
      toast.error('Taak aanmaken mislukt')
    } finally {
      setSaving(false)
    }
  }, [taakForm, user, medewerkers])

  const inputCls = "w-full px-3 py-2 text-[13px] bg-white rounded-[8px] outline-none border border-border focus:border-[#1A535C] transition-colors duration-150 placeholder:text-muted-foreground/80"
  const labelCls = "text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block mb-1"

  // Breedte morpht per view voor smooth animation
  const widthClass = view === 'menu' ? 'w-[240px]' : view === 'koppel' ? 'w-[380px]' : 'w-[340px]'

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {/* Flame-tinted "create" family — losse regel onder de reply/AI-acties */}
      <button
        onClick={() => { hapticLight(); setView('klant'); setOpen(true) }}
        className="tap-press flex items-center justify-center gap-1.5 h-9 md:h-8 w-9 md:w-auto md:px-2.5 rounded-button text-[12px] font-medium text-muted-foreground hover:text-[#F15025] hover:bg-[#F15025]/[0.06] transition-colors duration-150"
        title="Klant aanmaken vanuit deze mail"
        aria-label="Klant aanmaken"
      >
        <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="hidden md:inline">Klant</span>
      </button>
      <button
        onClick={() => { hapticLight(); onOpenProjectDialog() }}
        className="tap-press flex items-center justify-center gap-1.5 h-9 md:h-8 w-9 md:w-auto md:px-2.5 rounded-button text-[12px] font-medium text-muted-foreground hover:text-[#F15025] hover:bg-[#F15025]/[0.06] transition-colors duration-150"
        title="Project aanmaken vanuit deze mail"
        aria-label="Project aanmaken"
      >
        <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="hidden md:inline">Project</span>
      </button>
      <button
        onClick={() => { hapticLight(); setView('taak'); setOpen(true) }}
        className="tap-press flex items-center justify-center gap-1.5 h-9 md:h-8 w-9 md:w-auto md:px-2.5 rounded-button text-[12px] font-medium text-muted-foreground hover:text-[#F15025] hover:bg-[#F15025]/[0.06] transition-colors duration-150"
        title="Taak aanmaken vanuit deze mail"
        aria-label="Taak aanmaken"
      >
        <ListPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="hidden md:inline">Taak</span>
      </button>
      <button
        onClick={() => { hapticLight(); setView('koppel'); setOpen(true) }}
        className="tap-press flex items-center justify-center gap-1.5 h-9 md:h-8 w-9 md:w-auto md:px-2.5 rounded-button text-[12px] font-medium text-muted-foreground hover:text-[#F15025] hover:bg-[#F15025]/[0.06] transition-colors duration-150"
        title="Aan project koppelen"
        aria-label="Aan project koppelen"
      >
        <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="hidden md:inline">Koppelen</span>
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full right-0 mt-1.5 bg-card/95 backdrop-blur-xl rounded-[14px] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.20),0_0_0_0.5px_rgba(0,0,0,0.06)] z-50 overflow-hidden transition-[width] duration-200 ease-out',
            widthClass,
          )}
        >
          {view === 'klant' ? (
            <FormFrame
              title={klantStep === 'search' ? 'Klant koppelen' : klantStep === 'add-to-existing' ? `Contact toevoegen` : 'Nieuwe klant'}
              onBack={() => {
                if (klantStep === 'search') setOpen(false)
                else { setKlantStep('search'); setAddToKlant(null) }
              }}
              onClose={() => setOpen(false)}
            >
              {klantStep === 'search' ? (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      ref={klantInputRef}
                      value={klantSearch}
                      onChange={e => setKlantSearch(e.target.value)}
                      className={cn(inputCls, 'pl-9')}
                      placeholder="Zoek bestaande klant…"
                    />
                  </div>

                  <div className="space-y-0.5 max-h-[260px] overflow-y-auto -mx-1">
                    {klantSuggestions.length > 0 ? klantSuggestions.map(k => {
                      const style = getAvatarStyle(k.bedrijfsnaam || k.contactpersoon || '')
                      const displayName = k.bedrijfsnaam || k.contactpersoon || '(zonder naam)'
                      return (
                        <button
                          key={k.id}
                          type="button"
                          onClick={() => {
                            setAddToKlant(k)
                            setKlantForm(f => ({ ...f, contactpersoon: senderName, email: senderEmail, telefoon: '' }))
                            setKlantStep('add-to-existing')
                          }}
                          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[8px] text-left hover:bg-background transition-colors duration-150 active:scale-[0.99]"
                        >
                          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 text-[12px] font-bold" style={{ background: style.bg, color: style.text }}>
                            {displayName[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-foreground truncate">{displayName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{k.email || k.contactpersoon}</p>
                          </div>
                          <UserPlus className="h-3.5 w-3.5 text-[#1A535C] flex-shrink-0" />
                        </button>
                      )
                    }) : (
                      <p className="text-[11px] text-muted-foreground px-3 py-3 text-center">Geen klanten gevonden</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setKlantStep('create-new')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-[12px] font-medium text-[#1A535C] hover:bg-[#1A535C]/[0.06] transition-colors duration-150"
                  >
                    <UserPlus className="h-3 w-3" />
                    Nieuwe klant aanmaken
                  </button>
                </div>
              ) : klantStep === 'add-to-existing' && addToKlant ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-2.5 py-2 bg-[#1A535C]/[0.06] rounded-[8px]">
                    <Building2 className="h-3.5 w-3.5 text-[#1A535C] flex-shrink-0" />
                    <span className="text-[12px] font-semibold text-[#1A535C] truncate flex-1">{addToKlant.bedrijfsnaam || addToKlant.contactpersoon}</span>
                  </div>
                  <div>
                    <label className={labelCls}>Naam contactpersoon *</label>
                    <input value={klantForm.contactpersoon} onChange={e => setKlantForm(f => ({ ...f, contactpersoon: e.target.value }))}
                      className={inputCls} placeholder="Naam" autoFocus />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={klantForm.email} onChange={e => setKlantForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls} placeholder="email@bedrijf.nl" />
                  </div>
                  <div>
                    <label className={labelCls}>Telefoon</label>
                    <input type="tel" value={klantForm.telefoon} onChange={e => setKlantForm(f => ({ ...f, telefoon: e.target.value }))}
                      className={inputCls} placeholder="06…" />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddContactToExisting}
                    disabled={saving}
                    className="tap-press w-full h-9 rounded-[10px] bg-[#1A535C] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(26,83,92,0.25)] hover:shadow-[0_4px_12px_rgba(26,83,92,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {saving ? 'Toevoegen…' : 'Contact toevoegen'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className={labelCls}>Bedrijf</label>
                    <input value={klantForm.bedrijfsnaam} onChange={e => setKlantForm(f => ({ ...f, bedrijfsnaam: e.target.value }))}
                      className={inputCls} placeholder="Bedrijfsnaam" autoFocus />
                  </div>
                  <div>
                    <label className={labelCls}>Contactpersoon *</label>
                    <input value={klantForm.contactpersoon} onChange={e => setKlantForm(f => ({ ...f, contactpersoon: e.target.value }))}
                      className={inputCls} placeholder="Naam" />
                  </div>
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input type="email" value={klantForm.email} onChange={e => setKlantForm(f => ({ ...f, email: e.target.value }))}
                      className={inputCls} placeholder="email@bedrijf.nl" />
                  </div>
                  <div>
                    <label className={labelCls}>Telefoon</label>
                    <input type="tel" value={klantForm.telefoon} onChange={e => setKlantForm(f => ({ ...f, telefoon: e.target.value }))}
                      className={inputCls} placeholder="06…" />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveKlant}
                    disabled={saving}
                    className="tap-press w-full h-9 rounded-[10px] bg-[#1A535C] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(26,83,92,0.25)] hover:shadow-[0_4px_12px_rgba(26,83,92,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {saving ? 'Aanmaken…' : 'Klant aanmaken'}
                  </button>
                </div>
              )}
            </FormFrame>
          ) : view === 'taak' ? (
            <FormFrame
              title="Taak aanmaken"
              onBack={() => setOpen(false)}
              onClose={() => setOpen(false)}
            >
              <div className="space-y-2.5">
                <div>
                  <label className={labelCls}>Titel *</label>
                  <input ref={titelInputRef} value={taakForm.titel} onChange={e => setTaakForm(f => ({ ...f, titel: e.target.value }))}
                    className={inputCls} placeholder="Wat moet er gebeuren?" />
                </div>
                <div>
                  <label className={labelCls}>Inplannen op</label>
                  <DatePicker value={taakForm.deadline} onChange={v => setTaakForm(f => ({ ...f, deadline: v }))}
                    asInput className={inputCls} />
                  <div className="flex gap-1.5 mt-1.5">
                    {[
                      { label: 'Vandaag', days: 0 },
                      { label: 'Morgen', days: 1 },
                      { label: '+7d', days: 7 },
                    ].map(({ label, days }) => {
                      const d = new Date(); d.setDate(d.getDate() + days)
                      const val = d.toISOString().split('T')[0]
                      const active = taakForm.deadline === val
                      return (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTaakForm(f => ({ ...f, deadline: val }))}
                          className={cn(
                            'flex-1 py-1.5 rounded-[8px] text-[11px] font-medium transition-all',
                            active ? 'bg-[#1A535C]/[0.10] text-[#1A535C]' : 'bg-background text-foreground/70 hover:bg-muted',
                          )}
                        >{label}</button>
                      )
                    })}
                  </div>
                </div>
                {medewerkers.length > 0 && (
                  <div>
                    <label className={labelCls}>Toewijzen aan</label>
                    <div className="flex flex-wrap gap-1.5">
                      {medewerkers.map(mw => {
                        const selected = taakForm.toegewezen_aan === mw.naam
                        return (
                          <button
                            key={mw.id}
                            type="button"
                            onClick={() => setTaakForm(f => ({ ...f, toegewezen_aan: selected ? '' : mw.naam }))}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-[8px] text-[11px] font-medium border transition-all',
                              selected ? 'border-[#1A535C] bg-[#1A535C]/[0.08] text-[#1A535C]' : 'border-transparent bg-background text-foreground/70 hover:bg-muted',
                            )}
                          >
                            {mw.naam.split(' ')[0]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSaveTaak}
                  disabled={saving}
                  className="tap-press w-full h-9 rounded-[10px] bg-[#1A535C] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(26,83,92,0.25)] hover:shadow-[0_4px_12px_rgba(26,83,92,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {saving ? 'Aanmaken…' : 'Taak aanmaken'}
                </button>
              </div>
            </FormFrame>
          ) : view === 'koppel' ? (
            <FormFrame
              title="Aan project koppelen"
              onBack={() => setOpen(false)}
              onClose={() => setOpen(false)}
            >
              {email?.thread_id ? (
                <EmailProjectKoppelingPanel
                  threadId={email.thread_id}
                  senderEmail={senderEmail}
                />
              ) : (
                <p className="text-[12px] text-muted-foreground py-4 text-center">Geen thread beschikbaar om te koppelen.</p>
              )}
            </FormFrame>
          ) : null}
        </div>
      )}
    </div>
  )
}

function FormFrame({ title, onBack, onClose, children }: { title: string; onBack: () => void; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-150">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-[12px] text-foreground/70 hover:text-foreground hover:bg-black/[0.04] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Terug
        </button>
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-colors"
          aria-label="Sluiten"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3.5">
        {children}
      </div>
    </div>
  )
}
