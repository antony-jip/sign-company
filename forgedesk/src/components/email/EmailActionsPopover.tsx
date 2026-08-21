import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  UserPlus, FolderPlus, ListPlus, Link2,
  ArrowLeft, X, Loader2, Building2, Search, Check,
} from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Email, Medewerker, Klant, Project } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { createKlant, createTaak, getMedewerkers, getKlanten, updateKlant, getProjecten } from '@/services/supabaseService'
import { getKlantIdByContactEmail } from '@/services/klantService'
import { parseHandtekening, heeftGegevens } from './handtekeningParser'
import { zoekKlantVoorAfzender } from './emailHelpers'
import { getProjectVoorThread } from '@/services/emailProjectService'
import { ProjectCombobox } from '@/components/shared/ProjectCombobox'
import { SchattingSelect } from '@/components/shared/TaakVelden'
import { logCreate } from '@/utils/auditLogger'
import { logger } from '@/utils/logger'
import { extractSenderName, extractSenderEmail, getAvatarStyle } from './emailHelpers'
import { EmailProjectKoppelingPanel } from './EmailProjectKoppelingPanel'
import { hapticLight } from '@/utils/haptic'

// Status van de afzender t.o.v. de klantendatabase, voor de banner in de
// reader en de knoppen in het popover.
function normaliseerBedrijf(naam: string): string {
  return naam.toLowerCase().replace(/\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|holding|group|groep|bv|nv)\b/g, '').replace(/[^a-z0-9]/g, '')
}

// "Appelman, Annemiek" (Outlook-stijl) wordt "Annemiek Appelman".
export function netteNaam(naam: string): string {
  const m = naam.match(/^([^,|<]+),\s*([^,|<]+)$/)
  return m ? `${m[2].trim()} ${m[1].trim()}` : naam
}

// Eén klantenfetch per minuut voor banner én popover samen (de tabel is groot).
let klantenCache: { op: number; belofte: Promise<Klant[]> } | null = null
export function getKlantenGedeeld(): Promise<Klant[]> {
  if (!klantenCache || Date.now() - klantenCache.op > 60_000) {
    klantenCache = { op: Date.now(), belofte: getKlanten().catch(() => { klantenCache = null; return [] as Klant[] }) }
  }
  return klantenCache.belofte
}

export function useAfzenderStatus(email: Email | null) {
  const senderName = email ? extractSenderName(email.van) : ''
  const senderEmail = email ? extractSenderEmail(email.van) : ''
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klantenGeladen, setKlantenGeladen] = useState(false)
  useEffect(() => { getKlantenGedeeld().then(k => { setKlanten(k); setKlantenGeladen(true) }) }, [])
  const handtekening = useMemo(() => {
    if (!email?.inhoud) return null
    try { return parseHandtekening(email.inhoud, { naam: senderName, email: senderEmail }) } catch { return null }
  }, [email?.inhoud, senderName, senderEmail])
  // De losse contactpersonen-tabel telt ook mee; een deel van de contacten
  // staat alleen daar en niet in de embedded lijst op de klant.
  const [losKlantId, setLosKlantId] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let actueel = true
    setLosKlantId(undefined)
    if (!senderEmail) { setLosKlantId(null); return }
    getKlantIdByContactEmail(senderEmail).then(id => { if (actueel) setLosKlantId(id) }).catch(() => { if (actueel) setLosKlantId(null) })
    return () => { actueel = false }
  }, [senderEmail])
  const klant = useMemo(() => {
    if (!senderEmail) return null
    if (losKlantId) { const k = klanten.find(x => x.id === losKlantId); if (k) return k }
    const opAdres = zoekKlantVoorAfzender(klanten, senderEmail)
    if (opAdres) return opAdres
    // Geen adres- of domeinmatch: probeer de bedrijfsnaam uit de handtekening.
    const kern = normaliseerBedrijf(handtekening?.bedrijfsnaam || '')
    if (kern.length < 4) return null
    return klanten.find(k => normaliseerBedrijf(k.bedrijfsnaam || '') === kern) || null
  }, [klanten, senderEmail, losKlantId, handtekening?.bedrijfsnaam])
  const bekend = useMemo(() => {
    if (!klant) return false
    if (losKlantId && klant.id === losKlantId) return true
    const a = senderEmail.toLowerCase()
    return klant.email?.toLowerCase() === a || !!klant.contactpersonen?.some(c => c.email?.toLowerCase() === a)
  }, [klant, senderEmail, losKlantId])
  return { senderName: netteNaam(senderName), senderEmail, handtekening, handtekeningBruikbaar: !!handtekening && heeftGegevens(handtekening), klant, bekend, geladen: klantenGeladen && losKlantId !== undefined }
}

interface Props {
  email: Email | null
  openKlantSignal?: number
  // Project flow blijft via bestaande Dialog · callback opent die centered modal
  onOpenProjectDialog: () => void
}

type View = 'menu' | 'klant' | 'taak' | 'koppel'

export function EmailActionsPopover({ email, onOpenProjectDialog, openKlantSignal }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const titelInputRef = useRef<HTMLInputElement | null>(null)
  const klantInputRef = useRef<HTMLInputElement | null>(null)

  const senderName = email ? netteNaam(extractSenderName(email.van)) : ''
  const senderEmail = email ? extractSenderEmail(email.van) : ''
  const senderDomain = senderEmail.match(/@(.+)/)?.[1]?.toLowerCase() || ''
  // Gegevens uit de handtekening onder de mail, als voorinvulling.
  const handtekening = useMemo(() => {
    if (!email?.inhoud) return null
    try { return parseHandtekening(email.inhoud, { naam: senderName, email: senderEmail }) } catch { return null }
  }, [email?.inhoud, senderName, senderEmail])
  const handtekeningBruikbaar = !!handtekening && heeftGegevens(handtekening)
  const vulUitHandtekening = useCallback((basis: Partial<typeof LEEG_KLANTFORM> = {}) => ({
    ...LEEG_KLANTFORM,
    bedrijfsnaam: handtekening?.bedrijfsnaam || '',
    contactpersoon: handtekening?.naam || senderName || '',
    functie: handtekening?.functie || '',
    email: senderEmail,
    telefoon: handtekening?.telefoon || '',
    mobiel: handtekening?.mobiel || '',
    adres: handtekening?.adres || '',
    postcode: handtekening?.postcode || '',
    stad: handtekening?.stad || '',
    website: handtekening?.website || '',
    kvk: handtekening?.kvk || '',
    ...basis,
  }), [handtekening, senderName, senderEmail])
  const guessedBedrijf = senderDomain && !['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl'].includes(senderDomain)
    ? senderDomain.split('.')[0].charAt(0).toUpperCase() + senderDomain.split('.')[0].slice(1)
    : ''

  // Form state · auto-filled wanneer view opent
  const LEEG_KLANTFORM = { bedrijfsnaam: '', contactpersoon: '', functie: '', email: '', telefoon: '', mobiel: '', adres: '', postcode: '', stad: '', website: '', kvk: '' }
  const [klantForm, setKlantForm] = useState(LEEG_KLANTFORM)
  const [klantStep, setKlantStep] = useState<'search' | 'add-to-existing' | 'create-new'>('search')
  const [klantSearch, setKlantSearch] = useState('')
  const [addToKlant, setAddToKlant] = useState<Klant | null>(null)
  const [allKlanten, setAllKlanten] = useState<Klant[]>([])
  const [taakForm, setTaakForm] = useState({ titel: '', deadline: '', toegewezen_aan: '' })
  const [taakProjectId, setTaakProjectId] = useState('')
  const [taakSchatting, setTaakSchatting] = useState(0)
  const [projecten, setProjecten] = useState<Project[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])

  useEffect(() => {
    getMedewerkers().then(m => setMedewerkers(m.filter(mw => mw.status === 'actief'))).catch(() => {})
    getKlantenGedeeld().then(setAllKlanten)
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

  // Klant die bij de afzender hoort (exact adres, contactpersoon of domein).
  const { klant: afzenderKlant, bekend: afzenderBekend } = useAfzenderStatus(email)

  // Reset bij sluiten
  useEffect(() => {
    if (!open) setView('menu')
  }, [open])

  // Van buiten (banner onder de afzender) het klant-venster openen.
  useEffect(() => {
    if (openKlantSignal) { setView('klant'); setOpen(true) }
  }, [openKlantSignal])

  // Auto-fill bij wisselen naar form-view
  useEffect(() => {
    if (view === 'klant') {
      setKlantStep('search')
      setKlantSearch('')
      setAddToKlant(null)
      setKlantForm(vulUitHandtekening({ bedrijfsnaam: handtekening?.bedrijfsnaam || guessedBedrijf }))
      setTimeout(() => klantInputRef.current?.focus(), 50)
    } else if (view === 'taak') {
      setTaakForm({ titel: email?.onderwerp || '', deadline: '', toegewezen_aan: '' })
      setTaakProjectId('')
      // Hangt deze thread al aan een project, dan is dat het antwoord. Verder
      // niet gokken: een verkeerde koppeling is lastiger terug te draaien dan
      // er zelf één kiezen.
      void (async () => {
        try {
          const [alle, gekoppeld] = await Promise.all([
            getProjecten(),
            email?.thread_id ? getProjectVoorThread(email.thread_id).catch(() => null) : Promise.resolve(null),
          ])
          setProjecten(alle)
          if (gekoppeld?.project) setTaakProjectId(gekoppeld.project.id)
        } catch (err) {
          logger.warn('Projecten laden mislukt:', err)
        }
      })()
      setTimeout(() => titelInputRef.current?.focus(), 50)
    }
  }, [view, senderName, senderEmail, guessedBedrijf, email?.onderwerp, vulUitHandtekening, handtekening?.bedrijfsnaam])

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
        functie: klantForm.functie,
        email: klantForm.email,
        telefoon: klantForm.mobiel || klantForm.telefoon,
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
        telefoon: klantForm.telefoon || klantForm.mobiel,
        adres: klantForm.adres, postcode: klantForm.postcode, stad: klantForm.stad, land: 'Nederland',
        website: klantForm.website || (senderDomain ? `www.${senderDomain}` : ''),
        debiteurennummer: '', kvk_nummer: klantForm.kvk, btw_nummer: '', status: 'actief', tags: [], notities: '',
        contactpersonen: [{ id: crypto.randomUUID(), naam: klantForm.contactpersoon, functie: klantForm.functie, email: klantForm.email, telefoon: klantForm.mobiel || klantForm.telefoon, is_primair: true }],
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
        geschatte_tijd: taakSchatting,
        bestede_tijd: 0,
        klant_id: '',
        ...(taakProjectId ? { project_id: taakProjectId } : {}),
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
  }, [taakForm, taakProjectId, taakSchatting, user, medewerkers])

  const inputCls = "w-full px-3 py-2 text-[13px] bg-white dark:bg-white/[0.05] rounded-[8px] outline-none border border-border focus:border-petrol transition-colors duration-150 placeholder:text-muted-foreground/80"
  const labelCls = "text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground block mb-1"

  const quickActionCls = "tap-press inline-flex items-center justify-center gap-1.5 h-9 md:h-8 px-2 lg:px-2.5 rounded-[10px] text-[12px] font-medium whitespace-nowrap text-foreground/70 border border-transparent hover:text-flame hover:bg-flame/[0.07] hover:border-flame/20 transition-colors duration-150"

  // Breedte morpht per view voor smooth animation
  const widthClass = view === 'menu' ? 'w-[240px]' : view === 'koppel' ? 'w-[380px]' : 'w-[340px]'

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {/* Aanmaken vanuit deze mail · label erbij zodat de actie leesbaar is
          zonder eerst te moeten hoveren; op smalle panelen valt hij terug
          op alleen het icoon. */}
      <span className="hidden xl:inline font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mr-1.5 whitespace-nowrap">
        Maak
      </span>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { hapticLight(); setView('klant'); setOpen(true) }}
              className={quickActionCls}
              aria-label="Klant aanmaken"
            >
              <UserPlus className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.9} />
              <span className="hidden lg:inline">Klant</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[12px]">Klant aanmaken</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { hapticLight(); onOpenProjectDialog() }}
              className={quickActionCls}
              aria-label="Project aanmaken"
            >
              <FolderPlus className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.9} />
              <span className="hidden lg:inline">Project</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[12px]">Project aanmaken</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { hapticLight(); setView('taak'); setOpen(true) }}
              className={quickActionCls}
              aria-label="Taak aanmaken"
            >
              <ListPlus className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.9} />
              <span className="hidden lg:inline">Taak</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[12px]">Taak aanmaken</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { hapticLight(); setView('koppel'); setOpen(true) }}
              className={quickActionCls}
              aria-label="Aan project koppelen"
            >
              <Link2 className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.9} />
              <span className="hidden lg:inline">Koppelen</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[12px]">Aan project koppelen</TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
                  {senderEmail && (
                    <div className="rounded-[10px] border border-border bg-background p-2.5 space-y-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-foreground truncate">{senderName || senderEmail}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{senderEmail}</p>
                        {handtekeningBruikbaar && handtekening && (
                          <p className="text-[11px] text-foreground/70 mt-1 leading-relaxed">
                            <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mr-1">Handtekening</span>
                            {[[handtekening.bedrijfsnaam, handtekening.functie].filter(Boolean).join(' · '), handtekening.mobiel || handtekening.telefoon, [handtekening.adres, handtekening.postcode, handtekening.stad].filter(Boolean).join(', '), handtekening.website].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      {afzenderKlant ? (
                        afzenderBekend ? (
                          <p className="flex items-center gap-1.5 text-[11px] text-[#3A7D52]"><Check className="h-3 w-3" /> Al bekend bij {afzenderKlant.bedrijfsnaam || afzenderKlant.contactpersoon}</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setAddToKlant(afzenderKlant); setKlantForm(vulUitHandtekening()); setKlantStep('add-to-existing') }}
                            className="tap-press w-full h-9 rounded-[10px] bg-petrol text-white text-[12px] font-semibold flex items-center justify-center gap-2 hover:-translate-y-px transition-all"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span className="truncate">Toevoegen als contactpersoon bij {afzenderKlant.bedrijfsnaam || afzenderKlant.contactpersoon}?</span>
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setKlantForm(vulUitHandtekening({ bedrijfsnaam: handtekening?.bedrijfsnaam || guessedBedrijf })); setKlantStep('create-new') }}
                          className="tap-press w-full h-9 rounded-[10px] bg-petrol text-white text-[12px] font-semibold flex items-center justify-center gap-2 hover:-translate-y-px transition-all"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Klant toevoegen{handtekeningBruikbaar ? ' uit handtekening' : ''}
                        </button>
                      )}
                    </div>
                  )}
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
                            setKlantForm(vulUitHandtekening())
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
                          <UserPlus className="h-3.5 w-3.5 text-petrol flex-shrink-0" />
                        </button>
                      )
                    }) : (
                      <p className="text-[11px] text-muted-foreground px-3 py-3 text-center">Geen klanten gevonden</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setKlantStep('create-new')}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-[12px] font-medium text-petrol hover:bg-petrol/[0.06] transition-colors duration-150"
                  >
                    <UserPlus className="h-3 w-3" />
                    Nieuwe klant aanmaken
                  </button>
                </div>
              ) : klantStep === 'add-to-existing' && addToKlant ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-2.5 py-2 bg-petrol/[0.06] rounded-[8px]">
                    <Building2 className="h-3.5 w-3.5 text-petrol flex-shrink-0" />
                    <span className="text-[12px] font-semibold text-petrol truncate flex-1">{addToKlant.bedrijfsnaam || addToKlant.contactpersoon}</span>
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
                    <label className={labelCls}>Functie</label>
                    <input value={klantForm.functie} onChange={e => setKlantForm(f => ({ ...f, functie: e.target.value }))}
                      className={inputCls} placeholder="Bijv. inkoper" />
                  </div>
                  <div>
                    <label className={labelCls}>Telefoon</label>
                    <input type="tel" value={klantForm.mobiel || klantForm.telefoon} onChange={e => setKlantForm(f => ({ ...f, mobiel: e.target.value, telefoon: '' }))}
                      className={inputCls} placeholder="06…" />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddContactToExisting}
                    disabled={saving}
                    className="tap-press w-full h-9 rounded-[10px] bg-petrol text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(26,83,92,0.25)] hover:shadow-[0_4px_12px_rgba(26,83,92,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
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
                    <label className={labelCls}>Functie</label>
                    <input value={klantForm.functie} onChange={e => setKlantForm(f => ({ ...f, functie: e.target.value }))}
                      className={inputCls} placeholder="Bijv. eigenaar" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Telefoon</label>
                      <input type="tel" value={klantForm.telefoon} onChange={e => setKlantForm(f => ({ ...f, telefoon: e.target.value }))}
                        className={inputCls} placeholder="0229…" />
                    </div>
                    <div>
                      <label className={labelCls}>Mobiel</label>
                      <input type="tel" value={klantForm.mobiel} onChange={e => setKlantForm(f => ({ ...f, mobiel: e.target.value }))}
                        className={inputCls} placeholder="06…" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Adres</label>
                    <input value={klantForm.adres} onChange={e => setKlantForm(f => ({ ...f, adres: e.target.value }))}
                      className={inputCls} placeholder="Straat en nummer" />
                  </div>
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <div>
                      <label className={labelCls}>Postcode</label>
                      <input value={klantForm.postcode} onChange={e => setKlantForm(f => ({ ...f, postcode: e.target.value }))}
                        className={inputCls} placeholder="1234 AB" />
                    </div>
                    <div>
                      <label className={labelCls}>Plaats</label>
                      <input value={klantForm.stad} onChange={e => setKlantForm(f => ({ ...f, stad: e.target.value }))}
                        className={inputCls} placeholder="Plaats" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_110px] gap-2">
                    <div>
                      <label className={labelCls}>Website</label>
                      <input value={klantForm.website} onChange={e => setKlantForm(f => ({ ...f, website: e.target.value }))}
                        className={inputCls} placeholder="www.bedrijf.nl" />
                    </div>
                    <div>
                      <label className={labelCls}>KvK</label>
                      <input value={klantForm.kvk} onChange={e => setKlantForm(f => ({ ...f, kvk: e.target.value }))}
                        className={inputCls} placeholder="12345678" />
                    </div>
                  </div>
                  {handtekeningBruikbaar && (
                    <p className="flex items-center gap-1.5 text-[11px] text-[#3A7D52]"><Check className="h-3 w-3" /> Voorgevuld uit de handtekening. Kijk even na.</p>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveKlant}
                    disabled={saving}
                    className="tap-press w-full h-9 rounded-[10px] bg-petrol text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(26,83,92,0.25)] hover:shadow-[0_4px_12px_rgba(26,83,92,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
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
                  <label className={labelCls}>Bij project</label>
                  <ProjectCombobox
                    projecten={projecten}
                    value={taakProjectId}
                    onChange={setTaakProjectId}
                    leegLabel="Geen project"
                    placeholder="Kies een project"
                  />
                </div>
                <div>
                  <label className={labelCls}>Schatting</label>
                  <SchattingSelect waarde={taakSchatting} onChange={setTaakSchatting} />
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
                            active ? 'bg-petrol/[0.10] text-petrol' : 'bg-background text-foreground/70 hover:bg-muted',
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
                              selected ? 'border-petrol bg-petrol/[0.08] text-petrol' : 'border-transparent bg-background text-foreground/70 hover:bg-muted',
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
                  className="tap-press w-full h-9 rounded-[10px] bg-petrol text-white text-[13px] font-semibold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(26,83,92,0.25)] hover:shadow-[0_4px_12px_rgba(26,83,92,0.35)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 transition-all duration-150 mt-2"
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-[12px] text-foreground/70 hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
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
