import { useState, useMemo, memo, useEffect } from 'react'
import {
  UserPlus, FolderPlus, FileText, Check, X, Building2, Mail,
  Calendar, Phone, Plus, CheckCircle2, Bell, BellOff, Clock,
  ChevronRight, Send, Paperclip, Loader2, ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Email, Klant } from '@/types'
import { getKlanten, createKlant, createOfferte, createProject, createTaak } from '@/services/supabaseService'
import { extractSenderEmail, formatShortDate } from './emailHelpers'
import { toast } from 'sonner'

// ─── Helper: extract company name from sender ───
export function extractCompanyName(senderName: string, email: string): string {
  // Try "Name | Company" or "Name - Company" format
  const pipeMatch = senderName.match(/[|–—-]\s*(.+)$/)
  if (pipeMatch) return pipeMatch[1].trim()

  // Try email domain (skip generic providers)
  const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl', 'casema.nl', 'quicknet.nl', 'tele2.nl', 'solcon.nl']
  const domainMatch = email.match(/@([^>]+)/)
  if (domainMatch) {
    const domain = domainMatch[1].toLowerCase()
    if (!genericDomains.includes(domain)) {
      // Capitalize domain name without TLD
      const name = domain.split('.')[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
  }
  return ''
}

// ─── CRM Sidebar with inline actions ───
export type InlinePanel = 'none' | 'klant' | 'offerte' | 'project' | 'taak'

export const reminderOptions = [
  { value: '1h', label: 'Over 1 uur', pastel: 'bg-flame-light hover:bg-flame-light/80' },
  { value: '1d', label: 'Morgen 9:00', pastel: 'bg-mod-taken-light hover:bg-mod-taken-light/80' },
  { value: '2d', label: 'Over 2 dagen', pastel: 'bg-mod-facturen-light hover:bg-mod-facturen-light/80' },
  { value: '1w', label: 'Over 1 week', pastel: 'bg-mod-email-light hover:bg-mod-email-light/80' },
]

export const CRMSidebar = memo(function CRMSidebar({
  email,
  senderName,
  senderEmail,
  avatarColor,
  avatarRingColor,
  allEmails,
  onSelectEmail,
}: {
  email: Email
  senderName: string
  senderEmail: string
  avatarColor: string
  avatarRingColor?: string
  allEmails?: Email[]
  onSelectEmail?: (email: Email) => void
}) {
  const navigate = useNavigate()
  const [activePanel, setActivePanel] = useState<InlinePanel>('none')
  const [saving, setSaving] = useState(false)
  const [linkedKlant, setLinkedKlant] = useState<Klant | null>(null)
  const [klantLoading, setKlantLoading] = useState(true)

  // Opvolg-herinnering state
  const [reminder, setReminder] = useState<string | null>(null)

  // Klant form
  const [klantForm, setKlantForm] = useState({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '' })
  // Klant search/autocomplete
  const [allKlanten, setAllKlanten] = useState<Klant[]>([])
  const [klantSearchMode, setKlantSearchMode] = useState(true) // true = zoeken, false = nieuw aanmaken
  // Offerte form
  const [offerteForm, setOfferteForm] = useState({ titel: '', notities: '' })
  // Project form
  const [projectForm, setProjectForm] = useState({ naam: '', beschrijving: '' })
  // Taak form
  const [taakForm, setTaakForm] = useState({ titel: '', beschrijving: '' })

  const personName = useMemo(() => senderName.replace(/\s*[|–—-]\s*.+$/, '').trim(), [senderName])
  const companyGuess = useMemo(() => extractCompanyName(senderName, senderEmail), [senderName, senderEmail])

  // Look up existing klant
  useEffect(() => {
    let cancelled = false
    setKlantLoading(true)
    setLinkedKlant(null)
    async function findKlant() {
      try {
        const klanten = await getKlanten(500)
        const emailDomain = senderEmail.match(/@(.+)/)?.[1]?.toLowerCase()
        let match = klanten.find(k =>
          k.email?.toLowerCase() === senderEmail.toLowerCase() ||
          k.contactpersonen?.some(c => c.email?.toLowerCase() === senderEmail.toLowerCase())
        )
        if (!match && emailDomain) {
          const generic = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl']
          if (!generic.includes(emailDomain)) {
            match = klanten.find(k => k.email?.toLowerCase().endsWith('@' + emailDomain))
          }
        }
        if (!cancelled) setLinkedKlant(match || null)
      } catch { /* silent */ }
      finally { if (!cancelled) setKlantLoading(false) }
    }
    findKlant()
    return () => { cancelled = true }
  }, [senderEmail])

  const klantDisplayName = linkedKlant?.bedrijfsnaam || linkedKlant?.contactpersoon || companyGuess || personName

  // Open panels with pre-filled data
  function openPanel(panel: InlinePanel) {
    if (panel === 'klant') {
      setKlantForm({ bedrijfsnaam: companyGuess, contactpersoon: personName, email: senderEmail, telefoon: '' })
      setKlantSearchMode(true)
      // Load all klanten for autocomplete
      getKlanten(500).then(k => setAllKlanten(k)).catch(() => {})
    } else if (panel === 'offerte') {
      setOfferteForm({ titel: `Offerte - ${klantDisplayName}`, notities: `n.a.v. email: ${email.onderwerp}` })
    } else if (panel === 'project') {
      setProjectForm({ naam: `${klantDisplayName} - ${email.onderwerp?.slice(0, 40) || 'Nieuw project'}`, beschrijving: `n.a.v. email: ${email.onderwerp}` })
    } else if (panel === 'taak') {
      setTaakForm({ titel: email.onderwerp || 'Opvolging email', beschrijving: `Van: ${senderName} <${senderEmail}>\nOnderwerp: ${email.onderwerp}` })
    }
    setActivePanel(panel)
  }

  // ── Save handlers ──
  async function handleSaveKlant() {
    if (!klantForm.contactpersoon.trim() || !klantForm.email.trim()) { toast.error('Naam en email zijn verplicht'); return }
    setSaving(true)
    try {
      const existing = await getKlanten(500)
      const dupe = existing.find(k =>
        k.email?.toLowerCase() === klantForm.email.toLowerCase() ||
        (klantForm.bedrijfsnaam && k.bedrijfsnaam?.toLowerCase() === klantForm.bedrijfsnaam.toLowerCase())
      )
      if (dupe) { toast('Klant bestaat al — gekoppeld', { icon: '🔗' }); setLinkedKlant(dupe); setActivePanel('none'); return }
      const emailDomain = klantForm.email.match(/@(.+)/)?.[1]?.toLowerCase()
      const newKlant = await createKlant({
        bedrijfsnaam: klantForm.bedrijfsnaam, contactpersoon: klantForm.contactpersoon,
        email: klantForm.email, telefoon: klantForm.telefoon,
        adres: '', postcode: '', stad: '', land: 'Nederland',
        website: emailDomain ? `www.${emailDomain}` : '',
        kvk_nummer: '', btw_nummer: '', status: 'actief', tags: [], notities: '',
        contactpersonen: [{ id: crypto.randomUUID(), naam: klantForm.contactpersoon, functie: '', email: klantForm.email, telefoon: klantForm.telefoon, is_primair: true }],
      })
      setLinkedKlant(newKlant)
      setActivePanel('none')
      toast.success('Klant aangemaakt')
    } catch { toast.error('Klant aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveOfferte() {
    if (!offerteForm.titel.trim()) { toast.error('Titel is verplicht'); return }
    if (!linkedKlant) { toast.error('Eerst een klant koppelen'); openPanel('klant'); return }
    setSaving(true)
    try {
      const nr = `OFF-${Date.now().toString(36).toUpperCase()}`
      const offerte = await createOfferte({
        klant_id: linkedKlant.id, klant_naam: klantDisplayName,
        nummer: nr, titel: offerteForm.titel, status: 'concept',
        subtotaal: 0, btw_bedrag: 0, totaal: 0,
        geldig_tot: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: offerteForm.notities, voorwaarden: '',
      })
      setActivePanel('none')
      toast.success('Offerte aangemaakt', {
        action: { label: 'Openen', onClick: () => navigate(`/offertes/${offerte.id}`) },
      })
    } catch { toast.error('Offerte aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveProject() {
    if (!projectForm.naam.trim()) { toast.error('Naam is verplicht'); return }
    if (!linkedKlant) { toast.error('Eerst een klant koppelen'); openPanel('klant'); return }
    setSaving(true)
    try {
      const project = await createProject({
        klant_id: linkedKlant.id, naam: projectForm.naam,
        beschrijving: projectForm.beschrijving, status: 'gepland',
        prioriteit: 'medium', budget: 0, besteed: 0, voortgang: 0, team_leden: [],
      })
      setActivePanel('none')
      toast.success('Project aangemaakt', {
        action: { label: 'Openen', onClick: () => navigate(`/projecten/${project.id}`) },
      })
    } catch { toast.error('Project aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveTaak() {
    if (!taakForm.titel.trim()) { toast.error('Titel is verplicht'); return }
    setSaving(true)
    try {
      await createTaak({
        titel: taakForm.titel, beschrijving: taakForm.beschrijving,
        status: 'todo', prioriteit: 'medium', toegewezen_aan: '', geschatte_tijd: 0, bestede_tijd: 0,
        klant_id: linkedKlant?.id || '',
      })
      setActivePanel('none')
      toast.success('Taak aangemaakt')
    } catch { toast.error('Taak aanmaken mislukt') }
    finally { setSaving(false) }
  }

  const emailDate = useMemo(() => {
    if (!email.datum) return null
    try {
      const d = new Date(email.datum)
      return {
        date: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      }
    } catch { return null }
  }, [email.datum])

  // ── Klant search suggestions ──
  const klantSearchQuery = klantForm.bedrijfsnaam.toLowerCase().trim()
  const klantSuggestions = useMemo(() => {
    if (!klantSearchQuery || klantSearchQuery.length < 1) return allKlanten.slice(0, 5)
    return allKlanten.filter(k =>
      k.bedrijfsnaam?.toLowerCase().includes(klantSearchQuery) ||
      k.contactpersoon?.toLowerCase().includes(klantSearchQuery) ||
      k.email?.toLowerCase().includes(klantSearchQuery)
    ).slice(0, 5)
  }, [klantSearchQuery, allKlanten])

  function handleSelectKlant(klant: Klant) {
    setLinkedKlant(klant)
    setActivePanel('none')
    toast.success(`Gekoppeld aan ${klant.bedrijfsnaam || klant.contactpersoon}`)
  }

  function setFollowUpReminder(value: string) {
    setReminder(value)
    const label = reminderOptions.find(r => r.value === value)?.label || value
    toast.success(`Herinnering ingesteld: ${label}`)
  }

  // Eerdere emails from same sender
  const previousEmails = useMemo(() => {
    if (!allEmails || !senderEmail) return []
    return allEmails
      .filter(e => e.id !== email.id && (
        extractSenderEmail(e.van).toLowerCase() === senderEmail.toLowerCase() ||
        e.aan?.toLowerCase().includes(senderEmail.toLowerCase())
      ))
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .slice(0, 5)
  }, [allEmails, senderEmail, email.id])

  // ── Module accent colors (from design system) ──
  const moduleColors = {
    klant: '#8BAFD4',    // mist blue (klanten module)
    offerte: '#9B8EC4',  // lavender (offertes module)
    project: '#7EB5A6',  // sage (projecten module)
    taak: '#C4A882',     // cream/gold (taken module)
  }

  // ── Inline form panel ──
  function renderInlinePanel() {
    if (activePanel === 'none') return null

    const panelConfig = {
      klant: {
        title: klantSearchMode ? 'Contact koppelen' : 'Nieuw contact',
        accent: moduleColors.klant,
        onSave: klantSearchMode ? undefined : handleSaveKlant,
        fields: klantSearchMode ? (
          <>
            {/* Search input */}
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/20" />
              <input
                value={klantForm.bedrijfsnaam}
                onChange={e => setKlantForm(f => ({ ...f, bedrijfsnaam: e.target.value }))}
                className="w-full pl-8 pr-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20"
                placeholder="Zoek klant op naam of email..."
                autoFocus
              />
            </div>
            {/* Results */}
            <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
              {klantSuggestions.length > 0 ? klantSuggestions.map(k => (
                <button
                  key={k.id}
                  onClick={() => handleSelectKlant(k)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-left hover:bg-background transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style={{ background: moduleColors.klant }}>
                    {(k.bedrijfsnaam || k.contactpersoon)?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-foreground/70 truncate">{k.bedrijfsnaam || k.contactpersoon}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{k.bedrijfsnaam ? k.contactpersoon : k.email}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-foreground/10 group-hover:text-foreground/30 flex-shrink-0" />
                </button>
              )) : (
                <p className="text-[11px] text-muted-foreground px-2 py-2">Geen klanten gevonden</p>
              )}
            </div>
            {/* Switch to create mode */}
            <button
              onClick={() => setKlantSearchMode(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[8px] border border-dashed border-border text-[12px] text-muted-foreground hover:border-accent/30 hover:text-accent transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nieuw contact aanmaken
            </button>
          </>
        ) : (
          <>
            {/* Back to search */}
            <button
              onClick={() => setKlantSearchMode(true)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Terug naar zoeken
            </button>
            {[
              { key: 'bedrijfsnaam' as const, placeholder: 'Bedrijfsnaam', icon: Building2 },
              { key: 'contactpersoon' as const, placeholder: 'Contactpersoon *', icon: UserPlus },
              { key: 'email' as const, placeholder: 'Email *', icon: Mail },
              { key: 'telefoon' as const, placeholder: 'Telefoon', icon: Phone },
            ].map(({ key, placeholder, icon: Icon }) => (
              <div key={key} className="relative">
                <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/20" />
                <input value={klantForm[key]} onChange={e => setKlantForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full pl-8 pr-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20"
                  placeholder={placeholder} />
              </div>
            ))}
          </>
        ),
      },
      offerte: {
        title: 'Offerte aanmaken',
        accent: moduleColors.offerte,
        onSave: handleSaveOfferte,
        fields: (
          <>
            {linkedKlant && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-mod-offertes-light rounded-[8px] text-[11px]" style={{ color: moduleColors.offerte }}>
                <Building2 className="h-3 w-3" />
                <span className="truncate">{klantDisplayName}</span>
              </div>
            )}
            <input value={offerteForm.titel} onChange={e => setOfferteForm(f => ({ ...f, titel: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20"
              placeholder="Titel *" />
            <textarea value={offerteForm.notities} onChange={e => setOfferteForm(f => ({ ...f, notities: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20 resize-none h-16"
              placeholder="Notities" />
          </>
        ),
      },
      project: {
        title: 'Project aanmaken',
        accent: moduleColors.project,
        onSave: handleSaveProject,
        fields: (
          <>
            {linkedKlant && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-mod-projecten-light rounded-[8px] text-[11px]" style={{ color: moduleColors.project }}>
                <Building2 className="h-3 w-3" />
                <span className="truncate">{klantDisplayName}</span>
              </div>
            )}
            <input value={projectForm.naam} onChange={e => setProjectForm(f => ({ ...f, naam: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20"
              placeholder="Projectnaam *" />
            <textarea value={projectForm.beschrijving} onChange={e => setProjectForm(f => ({ ...f, beschrijving: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20 resize-none h-16"
              placeholder="Beschrijving" />
          </>
        ),
      },
      taak: {
        title: 'Taak toevoegen',
        accent: moduleColors.taak,
        onSave: handleSaveTaak,
        fields: (
          <>
            {linkedKlant && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-mod-taken-light rounded-[8px] text-[11px]" style={{ color: moduleColors.taak }}>
                <Building2 className="h-3 w-3" />
                <span className="truncate">{klantDisplayName}</span>
              </div>
            )}
            <input value={taakForm.titel} onChange={e => setTaakForm(f => ({ ...f, titel: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20"
              placeholder="Taak titel *" />
            <textarea value={taakForm.beschrijving} onChange={e => setTaakForm(f => ({ ...f, beschrijving: e.target.value }))}
              className="w-full px-2.5 py-2 text-[13px] bg-background border border-border/60 rounded-[8px] outline-none focus:border-accent/40 focus:bg-card transition-colors placeholder:text-foreground/20 resize-none h-16"
              placeholder="Beschrijving" />
          </>
        ),
      },
    }

    const cfg = panelConfig[activePanel]
    return (
      <div className="bg-card rounded-[10px] border border-border/50 overflow-hidden" style={{ boxShadow: `0 2px 12px -2px ${cfg.accent}15` }}>
        <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background: `${cfg.accent}0C`, borderBottom: `1px solid ${cfg.accent}15` }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.accent }} />
            <h4 className="text-[12px] font-semibold text-foreground/70">{cfg.title}</h4>
          </div>
          <button onClick={() => setActivePanel('none')} className="text-foreground/25 hover:text-foreground/50 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          {cfg.fields}
          {cfg.onSave && (
            <button onClick={cfg.onSave} disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-white text-[12px] font-medium disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: cfg.accent, boxShadow: `0 1px 4px ${cfg.accent}30` }}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-[300px] border-l border-amber-900/[0.06] flex-shrink-0 overflow-y-auto hidden xl:flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(30 35% 93%) 0%, hsl(28 30% 91%) 100%)' }}>
      <div className="p-5 space-y-4 flex-1">

        {/* ── Contact header ── */}
        <div className="rounded-xl p-4 border border-white/60 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(30 40% 97%) 0%, hsl(28 35% 94%) 100%)', boxShadow: '0 2px 12px rgba(140,100,50,0.08), 0 0 0 1px rgba(140,100,50,0.04)' }}>
          {/* Subtle decorative accent */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, hsl(30 60% 50%), transparent)', transform: 'translate(30%, -30%)' }} />
          <div className="flex items-start gap-3.5 relative">
            <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ring-2', avatarColor, avatarRingColor || 'ring-white/70')} style={{ boxShadow: '0 3px 12px rgba(120,90,50,0.2)' }}>
              <span className="text-base font-bold text-white">{senderName[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[14px] font-semibold text-foreground leading-tight truncate">{personName}</p>
              {companyGuess && (
                <p className="text-[12px] text-amber-800/50 truncate mt-0.5 font-medium">{companyGuess}</p>
              )}
              <p className="text-[11px] text-foreground/40 truncate mt-1">{senderEmail}</p>
            </div>
          </div>
          <div className="mt-3.5 pt-3 border-t border-amber-900/[0.06] space-y-2 relative">
            {email.aan && (
              <div className="flex items-center gap-2.5 text-[11px] text-foreground/45">
                <Send className="h-3 w-3 flex-shrink-0 text-amber-700/30" />
                <span className="truncate">Aan: {email.aan}</span>
              </div>
            )}
            {emailDate && (
              <div className="flex items-center gap-2.5 text-[11px] text-foreground/45">
                <Calendar className="h-3 w-3 flex-shrink-0 text-amber-700/30" />
                <span>{emailDate.date}, {emailDate.time}</span>
              </div>
            )}
            {email.bijlagen > 0 && (
              <div className="flex items-center gap-2.5 text-[11px] text-foreground/45">
                <Paperclip className="h-3 w-3 flex-shrink-0 text-amber-700/30" />
                <span>{email.bijlagen} bijlage{email.bijlagen > 1 ? 'n' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Linked klant ── */}
        {klantLoading ? (
          <div className="flex items-center gap-2 text-[11px] text-foreground/40 px-1 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Klant zoeken...</span>
          </div>
        ) : linkedKlant ? (
          <button
            onClick={() => navigate(`/klanten/${linkedKlant.id}`)}
            className="w-full rounded-xl p-3.5 border border-white/60 hover:border-white/80 transition-all duration-200 text-left group"
            style={{ background: 'linear-gradient(135deg, hsl(30 40% 97%) 0%, hsl(28 35% 94%) 100%)', boxShadow: '0 2px 12px rgba(140,100,50,0.08), 0 0 0 1px rgba(140,100,50,0.04)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${moduleColors.klant}18`, boxShadow: `0 1px 4px ${moduleColors.klant}15` }}>
                <Building2 className="h-4 w-4" style={{ color: moduleColors.klant }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground truncate">{linkedKlant.bedrijfsnaam || linkedKlant.contactpersoon}</p>
                <p className="text-[11px] text-foreground/40 truncate">{linkedKlant.bedrijfsnaam ? linkedKlant.contactpersoon : linkedKlant.email}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-semibold',
                  linkedKlant.status === 'actief' ? 'bg-mod-facturen-light text-mod-facturen-text' :
                  linkedKlant.status === 'prospect' ? 'bg-mod-taken-light text-mod-taken-text' : 'bg-muted text-muted-foreground'
                )}>{linkedKlant.status || 'actief'}</span>
                <ChevronRight className="h-3 w-3 text-foreground/15 group-hover:text-amber-700/40 transition-colors" />
              </div>
            </div>
            {linkedKlant.telefoon && (
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-amber-900/[0.06]">
                <Phone className="h-3 w-3 text-amber-700/25" />
                <span className="text-[11px] text-foreground/40">{linkedKlant.telefoon}</span>
              </div>
            )}
          </button>
        ) : activePanel !== 'klant' ? (
          <button onClick={() => openPanel('klant')}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 border-dashed border-amber-800/[0.1] text-[12px] font-medium text-amber-800/40 hover:border-amber-800/20 hover:text-amber-800/60 hover:bg-white/30 transition-all duration-200">
            <UserPlus className="h-3.5 w-3.5" />
            Contact koppelen
          </button>
        ) : null}

        {/* ── Labels ── */}
        {email.labels && email.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-0.5">
            {email.labels.map(label => (
              <span key={label} className="px-2.5 py-0.5 bg-amber-100/60 text-amber-800/60 rounded-full text-[10px] font-semibold border border-amber-200/40">{label}</span>
            ))}
          </div>
        )}

        {/* ── Eerdere emails ── */}
        <div className="rounded-xl border border-white/60 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(30 40% 97%) 0%, hsl(28 35% 94%) 100%)', boxShadow: '0 2px 12px rgba(140,100,50,0.08), 0 0 0 1px rgba(140,100,50,0.04)' }}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-900/[0.06]">
            <Mail className="h-3.5 w-3.5 text-amber-700/30" />
            <h4 className="text-[12px] font-semibold text-foreground/60">Eerdere emails</h4>
            {previousEmails.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-amber-800/40 font-mono tabular-nums bg-amber-100/50 px-2 py-0.5 rounded-full border border-amber-200/30">{previousEmails.length}</span>
            )}
          </div>
          <div className="p-2">
            {previousEmails.length === 0 ? (
              <p className="text-[11px] text-foreground/35 px-2 py-3 text-center italic">Geen eerdere emails gevonden</p>
            ) : (
              <div className="space-y-0.5">
                {previousEmails.map(e => (
                  <button
                    key={e.id}
                    onClick={() => onSelectEmail?.(e)}
                    className="w-full px-3 py-2.5 rounded-lg hover:bg-white/60 transition-all duration-150 text-left group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-foreground/50 group-hover:text-foreground/80 truncate flex-1 transition-colors">{e.onderwerp || '(geen onderwerp)'}</p>
                      <span className="text-[9px] text-foreground/25 tabular-nums flex-shrink-0">{formatShortDate(e.datum)}</span>
                    </div>
                    <p className="text-[10px] text-foreground/30 truncate mt-0.5">
                      {e.inhoud?.replace(/<[^>]*>/g, '').slice(0, 60) || '...'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Opvolg-herinnering ── */}
        <div className="rounded-xl border border-white/60 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(30 40% 97%) 0%, hsl(28 35% 94%) 100%)', boxShadow: '0 2px 12px rgba(140,100,50,0.08), 0 0 0 1px rgba(140,100,50,0.04)' }}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-900/[0.06]">
            <Bell className="h-3.5 w-3.5 text-amber-700/30" />
            <h4 className="text-[12px] font-semibold text-foreground/60">Herinnering</h4>
            {reminder && (
              <button onClick={() => { setReminder(null); toast('Herinnering verwijderd') }} className="ml-auto text-foreground/25 hover:text-foreground/50 transition-colors" title="Verwijder herinnering">
                <BellOff className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="p-2.5">
            {reminder ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-medium" style={{ background: 'hsl(30 40% 92%)', color: 'hsl(30 50% 35%)' }}>
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{reminderOptions.find(r => r.value === reminder)?.label}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {reminderOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFollowUpReminder(opt.value)}
                    className={cn('px-2.5 py-2 rounded-lg text-[11px] font-medium text-foreground/45 hover:text-foreground/70 transition-all duration-150 text-center', opt.pastel)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Inline panel ── */}
        {renderInlinePanel()}

        {/* ── Quick action buttons ── */}
        {activePanel === 'none' && (
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-amber-800/25 uppercase tracking-[0.08em] px-1 mb-2">Snel aanmaken</h3>
            {([
              { panel: 'offerte' as const, icon: FileText, label: 'Offerte', desc: linkedKlant ? `voor ${klantDisplayName}` : 'offerte opmaken', accent: moduleColors.offerte },
              { panel: 'project' as const, icon: FolderPlus, label: 'Project', desc: linkedKlant ? `voor ${klantDisplayName}` : 'project starten', accent: moduleColors.project },
              { panel: 'taak' as const, icon: CheckCircle2, label: 'Taak', desc: 'opvolging plannen', accent: moduleColors.taak },
            ]).map(({ panel, icon: Icon, label, desc, accent }) => (
              <button key={panel} onClick={() => openPanel(panel)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-white/40 transition-all duration-150 group text-left">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${accent}18`, boxShadow: `0 1px 4px ${accent}15` }}>
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground/55 group-hover:text-foreground/85 transition-colors">{label}</p>
                  <p className="text-[10px] text-foreground/30 truncate">{desc}</p>
                </div>
                <Plus className="h-3.5 w-3.5 text-foreground/10 group-hover:text-foreground/30 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
