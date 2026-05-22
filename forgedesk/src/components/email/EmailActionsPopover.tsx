import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MoreHorizontal, UserPlus, FolderPlus, ListPlus, Link2,
  ArrowLeft, X, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Email, Medewerker } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { createKlant, createTaak, getMedewerkers } from '@/services/supabaseService'
import { logCreate } from '@/utils/auditLogger'
import { logger } from '@/utils/logger'
import { extractSenderName, extractSenderEmail } from './emailHelpers'
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
  const [taakForm, setTaakForm] = useState({ titel: '', deadline: '', toegewezen_aan: '' })
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])

  useEffect(() => {
    getMedewerkers().then(m => setMedewerkers(m.filter(mw => mw.status === 'actief'))).catch(() => {})
  }, [])

  // Reset bij sluiten
  useEffect(() => {
    if (!open) setView('menu')
  }, [open])

  // Auto-fill bij wisselen naar form-view
  useEffect(() => {
    if (view === 'klant') {
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

  const inputCls = "w-full px-3 py-2 text-[13px] bg-white rounded-[8px] outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors duration-150 placeholder:text-[#B0ADA8]"
  const labelCls = "text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9B9B95] block mb-1"

  // Breedte morpht per view voor smooth animation
  const widthClass = view === 'menu' ? 'w-[240px]' : view === 'koppel' ? 'w-[380px]' : 'w-[340px]'

  return (
    <div ref={containerRef} className="relative">
      <div className="w-px h-5 bg-[#EBEBEB] mx-2 hidden md:inline-block" />
      <Button
        variant="ghost"
        size="icon"
        className="tap-press h-10 w-10 md:h-8 md:w-8 text-[#F15025] hover:text-[#C0451A] hover:bg-[#F15025]/[0.08] rounded-[10px] transition-colors duration-150"
        onClick={() => { hapticLight(); setOpen(v => !v) }}
        title="Acties — klant, project of taak aanmaken vanuit deze mail"
        aria-label="Acties"
      >
        <MoreHorizontal className="h-[18px] w-[18px] md:h-4 md:w-4" />
      </Button>

      {open && (
        <div
          className={cn(
            'absolute top-full right-0 mt-1.5 bg-white/95 backdrop-blur-xl rounded-[14px] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.20),0_0_0_0.5px_rgba(0,0,0,0.06)] z-50 overflow-hidden transition-[width] duration-200 ease-out',
            widthClass,
          )}
        >
          {view === 'menu' ? (
            <div className="py-1.5">
              <p className="px-3.5 pt-1.5 pb-1 text-[10px] uppercase tracking-[0.08em] text-[#9B9B95] font-semibold">Acties</p>
              <MenuItem icon={<UserPlus className="h-3.5 w-3.5" />} label="Klant aanmaken" onClick={() => setView('klant')} />
              <MenuItem icon={<FolderPlus className="h-3.5 w-3.5" />} label="Project aanmaken" onClick={() => { setOpen(false); onOpenProjectDialog() }} />
              <MenuItem icon={<ListPlus className="h-3.5 w-3.5" />} label="Taak aanmaken" onClick={() => setView('taak')} />
              <div className="my-1 mx-3.5 h-px bg-black/[0.06]" aria-hidden />
              <MenuItem icon={<Link2 className="h-3.5 w-3.5" />} label="Aan project koppelen" onClick={() => setView('koppel')} />
            </div>
          ) : view === 'klant' ? (
            <FormFrame
              title="Klant aanmaken"
              onBack={() => setView('menu')}
              onClose={() => setOpen(false)}
            >
              <div className="space-y-2.5">
                <div>
                  <label className={labelCls}>Bedrijf</label>
                  <input ref={klantInputRef} value={klantForm.bedrijfsnaam} onChange={e => setKlantForm(f => ({ ...f, bedrijfsnaam: e.target.value }))}
                    className={inputCls} placeholder="Bedrijfsnaam" />
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
                    className={inputCls} placeholder="06..." />
                </div>
                <button
                  type="button"
                  onClick={handleSaveKlant}
                  disabled={saving}
                  className="tap-press w-full h-9 rounded-[10px] bg-[#F15025] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_12px_rgba(241,80,37,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {saving ? 'Aanmaken…' : 'Klant aanmaken'}
                </button>
              </div>
            </FormFrame>
          ) : view === 'taak' ? (
            <FormFrame
              title="Taak aanmaken"
              onBack={() => setView('menu')}
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
                  <input type="date" value={taakForm.deadline} onChange={e => setTaakForm(f => ({ ...f, deadline: e.target.value }))}
                    className={inputCls} />
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
                            active ? 'bg-[#1A535C]/[0.10] text-[#1A535C]' : 'bg-[#F8F7F5] text-[#6B6B66] hover:bg-[#F0EFEC]',
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
                              selected ? 'border-[#1A535C] bg-[#1A535C]/[0.08] text-[#1A535C]' : 'border-transparent bg-[#F8F7F5] text-[#6B6B66] hover:bg-[#F0EFEC]',
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
                  className="tap-press w-full h-9 rounded-[10px] bg-[#F15025] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_12px_rgba(241,80,37,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {saving ? 'Aanmaken…' : 'Taak aanmaken'}
                </button>
              </div>
            </FormFrame>
          ) : view === 'koppel' ? (
            <FormFrame
              title="Aan project koppelen"
              onBack={() => setView('menu')}
              onClose={() => setOpen(false)}
            >
              {email?.thread_id ? (
                <EmailProjectKoppelingPanel
                  threadId={email.thread_id}
                  senderEmail={senderEmail}
                />
              ) : (
                <p className="text-[12px] text-[#9B9B95] py-4 text-center">Geen thread beschikbaar om te koppelen.</p>
              )}
            </FormFrame>
          ) : null}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13px] text-[#1A1A1A] hover:bg-[#1A535C]/[0.06] transition-colors duration-150 active:scale-[0.99]"
    >
      <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 bg-[#1A535C]/[0.08] text-[#1A535C]">
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  )
}

function FormFrame({ title, onBack, onClose, children }: { title: string; onBack: () => void; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-150">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-black/[0.04] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Terug
        </button>
        <h3 className="text-[13px] font-semibold text-[#1A1A1A]">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-[8px] text-[#9B9B95] hover:text-[#1A1A1A] hover:bg-black/[0.04] transition-colors"
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
