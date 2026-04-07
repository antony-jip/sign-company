import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  UserPlus, FolderPlus, ListPlus, Bell, BellOff, Clock,
  Building2, Phone, Mail, ChevronRight, Loader2, X,
  ArrowLeft, ExternalLink, Sparkles, Pencil, CheckCircle,
  FileText, Users, ReceiptText, MailQuestion, Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Email, Klant, Medewerker } from '@/types'
import { getKlanten, getProjectenByKlant, getOffertesByKlant, createKlant, createProject, createTaak, getMedewerkers, generateProjectNummer, getAppSettings } from '@/services/supabaseService'
import { chatCompletion } from '@/services/aiService'
import { useAuth } from '@/contexts/AuthContext'
import { KlantContactSelector } from '@/components/shared/KlantContactSelector'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getAvatarStyle, extractSenderName } from './emailHelpers'
import type { AutoFollowUp } from './emailTypes'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

interface EmailContextSidebarProps {
  mode: 'compose' | 'reading' | 'idle'
  composeToAddress?: string
  composeReminder?: string | null
  onComposeReminderChange?: (value: string | null) => void
  allEmails?: Email[]
  email?: Email | null
  senderName?: string
  senderEmail?: string
  onSelectEmail?: (email: Email) => void
  onCompose?: () => void
  autoFollowUp?: AutoFollowUp
  onAutoFollowUpChange?: (value: AutoFollowUp) => void
  unreadCount?: number
  reminderCount?: number
}

// ── Inbox analysis types ──
interface InboxCategory {
  label: string
  icon: React.ElementType
  color: string
  bg: string
  count: number
  subjects: string[]
}

const reminderOptions = [
  { label: '1 uur', value: '1h' },
  { label: 'Morgen 9:00', value: '1d' },
  { label: '2 dagen', value: '2d' },
  { label: '1 week', value: '1w' },
]

function extractCompanyName(senderName: string, email: string): string {
  const pipeMatch = senderName.match(/[|–—-]\s*(.+)$/)
  if (pipeMatch) return pipeMatch[1].trim()
  const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl']
  const domainMatch = email.match(/@([^>]+)/)
  if (domainMatch) {
    const domain = domainMatch[1].toLowerCase()
    if (!genericDomains.includes(domain)) {
      const name = domain.split('.')[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
  }
  return ''
}

export function EmailContextSidebar({
  mode,
  composeToAddress,
  composeReminder,
  onComposeReminderChange,
  allEmails = [],
  email,
  senderName: propSenderName,
  senderEmail: propSenderEmail,
  onSelectEmail,
  onCompose,
  autoFollowUp,
  onAutoFollowUpChange,
  unreadCount = 0,
  reminderCount = 0,
}: EmailContextSidebarProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── Contact info ──
  const contactEmail = mode === 'reading' ? (propSenderEmail || '') : (composeToAddress || '')
  const contactName = mode === 'reading' ? (propSenderName || '') : ''
  const personName = useMemo(() => (contactName || '').replace(/\s*[|–—-]\s*.+$/, '').trim(), [contactName])
  const companyGuess = useMemo(() => contactEmail ? extractCompanyName(contactName, contactEmail) : '', [contactName, contactEmail])

  // ── Klant lookup ──
  const [linkedKlant, setLinkedKlant] = useState<Klant | null>(null)
  const [klantLoading, setKlantLoading] = useState(false)
  const [projectCount, setProjectCount] = useState(0)
  const [offerteCount, setOfferteCount] = useState(0)

  // ── Panels ──
  const [activePanel, setActivePanel] = useState<'none' | 'klant' | 'project' | 'taak'>('none')
  const [saving, setSaving] = useState(false)

  // ── Forms ──
  const [allKlanten, setAllKlanten] = useState<Klant[]>([])
  const [klantSearchMode, setKlantSearchMode] = useState(true)
  const [klantForm, setKlantForm] = useState({ bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '' })
  const [projectForm, setProjectForm] = useState({
    naam: '',
    beschrijving: '',
    klant_id: '',
    contactpersoon_id: '',
    vestiging_id: '',
    status: 'gepland' as 'gepland' | 'actief' | 'in-review' | 'afgerond' | 'on-hold' | 'te-factureren' | 'te-plannen',
    start_datum: '',
    eind_datum: '',
  })
  const [taakForm, setTaakForm] = useState({ titel: '', beschrijving: '', deadline: '', toegewezen_aan: '' })
  const [addToExistingKlant, setAddToExistingKlant] = useState<Klant | null>(null)
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])

  useEffect(() => {
    getMedewerkers().then(m => setMedewerkers(m.filter(mw => mw.status === 'actief'))).catch(() => {})
  }, [])

  const klantDisplayName = linkedKlant?.bedrijfsnaam || linkedKlant?.contactpersoon || companyGuess || personName

  // ── Klant lookup ──
  useEffect(() => {
    if (!contactEmail || contactEmail.length < 3) { setLinkedKlant(null); setKlantLoading(false); return }
    let cancelled = false
    setKlantLoading(true)
    setLinkedKlant(null)
    async function findKlant() {
      try {
        const klanten = await getKlanten(500)
        const addr = contactEmail.toLowerCase()
        const domain = contactEmail.match(/@(.+)/)?.[1]?.toLowerCase()
        let match = klanten.find(k =>
          k.email?.toLowerCase() === addr ||
          k.contactpersonen?.some(c => c.email?.toLowerCase() === addr)
        )
        if (!match && domain) {
          const generic = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl', 'xs4all.nl', 'planet.nl', 'hetnet.nl', 'home.nl', 'upcmail.nl', 'casema.nl', 'quicknet.nl', 'tele2.nl', 'solcon.nl']
          if (!generic.includes(domain)) match = klanten.find(k => k.email?.toLowerCase().endsWith('@' + domain))
        }
        if (!cancelled) setLinkedKlant(match || null)
      } catch (err) { /* silent */ }
      finally { if (!cancelled) setKlantLoading(false) }
    }
    findKlant()
    return () => { cancelled = true }
  }, [contactEmail])

  // ── Counts ──
  useEffect(() => {
    if (!linkedKlant) { setProjectCount(0); setOfferteCount(0); return }
    let cancelled = false
    Promise.all([getProjectenByKlant(linkedKlant.id), getOffertesByKlant(linkedKlant.id)])
      .then(([p, o]) => {
        if (!cancelled) {
          setProjectCount(p.length)
          setOfferteCount(o.filter(x => x.status !== 'afgewezen' && x.status !== 'verlopen').length)
        }
      }).catch(() => {})
    return () => { cancelled = true }
  }, [linkedKlant])

  // ── Reminder ──
  // ── Panel openers ──
  function openPanel(panel: 'klant' | 'project' | 'taak') {
    if (panel === 'klant') {
      setKlantForm({ bedrijfsnaam: companyGuess, contactpersoon: personName, email: contactEmail, telefoon: '' })
      setKlantSearchMode(true)
      getKlanten(500).then(k => setAllKlanten(k)).catch(() => {})
    } else if (panel === 'project') {
      setProjectForm({
        naam: `${klantDisplayName || 'Project'} - ${email?.onderwerp?.slice(0, 40) || ''}`.trim(),
        beschrijving: '',
        klant_id: linkedKlant?.id || '',
        contactpersoon_id: '',
        vestiging_id: '',
        status: 'gepland',
        start_datum: new Date().toISOString().split('T')[0],
        eind_datum: '',
      })
      getKlanten(500).then(k => setAllKlanten(k)).catch(() => {})
    } else if (panel === 'taak') {
      setTaakForm({ titel: email?.onderwerp || 'Opvolging email', beschrijving: `Van: ${contactName} <${contactEmail}>`, deadline: '', toegewezen_aan: '' })
    }
    setActivePanel(panel)
  }

  // ── Saves ──
  async function handleSaveKlant() {
    if (!klantForm.contactpersoon.trim() || !klantForm.email.trim()) { toast.error('Naam en email verplicht'); return }
    setSaving(true)
    try {
      const existing = await getKlanten(500)
      const dupe = existing.find(k => k.email?.toLowerCase() === klantForm.email.toLowerCase())
      if (dupe) { toast.success('Klant gekoppeld'); setLinkedKlant(dupe); setActivePanel('none'); return }
      const domain = klantForm.email.match(/@(.+)/)?.[1]?.toLowerCase()
      const newKlant = await createKlant({
        bedrijfsnaam: klantForm.bedrijfsnaam, contactpersoon: klantForm.contactpersoon,
        email: klantForm.email, telefoon: klantForm.telefoon,
        adres: '', postcode: '', stad: '', land: 'Nederland',
        website: domain ? `www.${domain}` : '',
        kvk_nummer: '', btw_nummer: '', status: 'actief', tags: [], notities: '',
        contactpersonen: [{ id: crypto.randomUUID(), naam: klantForm.contactpersoon, functie: '', email: klantForm.email, telefoon: klantForm.telefoon, is_primair: true }],
      })
      setLinkedKlant(newKlant)
      setActivePanel('none')
      toast.success('Klant aangemaakt')
    } catch (err) { logger.error('Klant aanmaken mislukt:', err); toast.error('Klant aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveProject() {
    if (!projectForm.naam.trim()) { toast.error('Projectnaam is verplicht'); return }
    if (!projectForm.klant_id) { toast.error('Selecteer een klant'); return }
    if (!user) { toast.error('Niet ingelogd'); return }
    if (projectForm.eind_datum && projectForm.start_datum && projectForm.eind_datum < projectForm.start_datum) {
      toast.error('Einddatum kan niet voor de startdatum liggen'); return
    }
    setSaving(true)
    try {
      const settings = await getAppSettings(user.id)
      const projectNummer = await generateProjectNummer(settings?.project_prefix || 'P')
      const geselecteerdeKlant = allKlanten.find(k => k.id === projectForm.klant_id)
      const vestigingNaam = projectForm.vestiging_id
        ? geselecteerdeKlant?.vestigingen?.find(v => v.id === projectForm.vestiging_id)?.naam
        : undefined

      const project = await createProject({
        user_id: user.id,
        klant_id: projectForm.klant_id,
        project_nummer: projectNummer,
        naam: projectForm.naam.trim(),
        beschrijving: projectForm.beschrijving.trim(),
        status: projectForm.status,
        prioriteit: 'medium',
        start_datum: projectForm.start_datum || undefined,
        eind_datum: projectForm.eind_datum || undefined,
        budget: 0,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
        contactpersoon_id: projectForm.contactpersoon_id || undefined,
        vestiging_id: projectForm.vestiging_id || undefined,
        vestiging_naam: vestigingNaam,
      })
      setActivePanel('none')
      toast.success('Project aangemaakt', { action: { label: 'Openen', onClick: () => navigate(`/projecten/${project.id}`) } })
    } catch (err) { logger.error('Project aanmaken mislukt:', err); toast.error('Project aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleSaveTaak() {
    if (!taakForm.titel.trim()) { toast.error('Titel is verplicht'); return }
    setSaving(true)
    try {
      await createTaak({
        titel: taakForm.titel, beschrijving: taakForm.beschrijving,
        status: 'todo', prioriteit: 'medium', toegewezen_aan: taakForm.toegewezen_aan, geschatte_tijd: 0, bestede_tijd: 0,
        klant_id: linkedKlant?.id || '',
        deadline: taakForm.deadline || undefined,
      })
      setActivePanel('none')
      toast.success(`Taak aangemaakt${taakForm.deadline ? ` — deadline ${new Date(taakForm.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}` : ''}`)
    } catch (err) { logger.error('Taak aanmaken mislukt:', err); toast.error('Taak aanmaken mislukt') }
    finally { setSaving(false) }
  }

  async function handleAddContactToKlant() {
    if (!addToExistingKlant || !klantForm.contactpersoon.trim()) { toast.error('Naam is verplicht'); return }
    setSaving(true)
    try {
      const { updateKlant } = await import('@/services/supabaseService')
      const bestaande = addToExistingKlant.contactpersonen || []
      await updateKlant(addToExistingKlant.id, {
        contactpersonen: [...bestaande, {
          id: crypto.randomUUID(),
          naam: klantForm.contactpersoon,
          functie: '',
          email: klantForm.email,
          telefoon: klantForm.telefoon,
          is_primair: false,
        }],
      })
      setLinkedKlant({ ...addToExistingKlant, contactpersonen: [...bestaande, { id: crypto.randomUUID(), naam: klantForm.contactpersoon, functie: '', email: klantForm.email, telefoon: klantForm.telefoon, is_primair: false }] })
      setAddToExistingKlant(null)
      setActivePanel('none')
      toast.success(`${klantForm.contactpersoon} toegevoegd aan ${addToExistingKlant.bedrijfsnaam}`)
    } catch (err) { logger.error('Contact toevoegen mislukt:', err); toast.error('Contact toevoegen mislukt') }
    finally { setSaving(false) }
  }

  // ── Klant search ──
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

  // ── Avatar ──
  const avatarName = linkedKlant?.bedrijfsnaam || linkedKlant?.contactpersoon || personName || contactEmail
  const avatarStyle = getAvatarStyle(avatarName)
  const avatarInitial = avatarName?.[0]?.toUpperCase() || '?'

  const hasContact = contactEmail && contactEmail.length >= 3

  // ── Idle: inbox analysis ──
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<InboxCategory[] | null>(null)
  const [idleTaakForm, setIdleTaakForm] = useState({ titel: '', beschrijving: '' })
  const [showIdleTaakForm, setShowIdleTaakForm] = useState(false)
  const [savingIdleTaak, setSavingIdleTaak] = useState(false)

  const handleAnalyzeInbox = useCallback(async () => {
    if (analysisLoading) return
    setAnalysisLoading(true)
    try {
      const recent = allEmails
        .filter(e => e.map === 'inbox')
        .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
        .slice(0, 20)

      if (recent.length === 0) {
        toast('Geen emails om te analyseren')
        setAnalysisLoading(false)
        return
      }

      const emailList = recent.map((e, i) => `${i + 1}. Van: ${extractSenderName(e.van)} — "${e.onderwerp}"`).join('\n')

      const result = await chatCompletion(
        [{ role: 'user', content: `Categoriseer deze ${recent.length} emails. Antwoord ALLEEN in dit exacte JSON formaat, geen andere tekst:\n[{"category":"offertes","count":N,"subjects":["..."]},{"category":"facturen","count":N,"subjects":["..."]},{"category":"opvolging","count":N,"subjects":["..."]},{"category":"overig","count":N,"subjects":["..."]}]\n\nEmails:\n${emailList}` }],
        'Je bent een email-categorisatie assistent. Categoriseer emails in: offertes (offerte-aanvragen, prijsopgaven), facturen (factuur-gerelateerd, betalingen), opvolging (opvolging nodig, wacht op antwoord), overig. Antwoord ALLEEN met valid JSON array, geen markdown, geen uitleg.'
      )

      // Parse JSON from response
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { category: string; count: number; subjects: string[] }[]
        const categoryMap: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
          offertes: { icon: FileText, color: '#F15025', bg: '#FDE8E4', label: 'Offerte-aanvragen' },
          facturen: { icon: ReceiptText, color: '#2D6B48', bg: '#E8F2EC', label: 'Facturen' },
          opvolging: { icon: MailQuestion, color: '#3A5A9A', bg: '#E8EEF9', label: 'Opvolging nodig' },
          overig: { icon: Mail, color: '#6B6B66', bg: '#F0EFEC', label: 'Overig' },
        }
        const categories: InboxCategory[] = parsed
          .filter(c => c.count > 0)
          .map(c => ({
            ...categoryMap[c.category] || categoryMap.overig,
            count: c.count,
            subjects: c.subjects || [],
          }))
        setAnalysisResult(categories)
      }
    } catch (err) {
      logger.error('Analyse mislukt:', err)
      toast.error('Analyse mislukt')
    } finally {
      setAnalysisLoading(false)
    }
  }, [allEmails, analysisLoading])

  async function handleSaveIdleTaak() {
    if (!idleTaakForm.titel.trim()) { toast.error('Titel is verplicht'); return }
    setSavingIdleTaak(true)
    try {
      await createTaak({
        titel: idleTaakForm.titel, beschrijving: idleTaakForm.beschrijving,
        status: 'todo', prioriteit: 'medium', toegewezen_aan: '', geschatte_tijd: 0, bestede_tijd: 0, klant_id: '',
      })
      setShowIdleTaakForm(false)
      setIdleTaakForm({ titel: '', beschrijving: '' })
      toast.success('Taak aangemaakt')
    } catch (err) { logger.error('Taak aanmaken mislukt:', err); toast.error('Taak aanmaken mislukt') }
    finally { setSavingIdleTaak(false) }
  }

  // ════════════════════════════════════════════
  // IDLE MODE
  // ════════════════════════════════════════════
  if (mode === 'idle') {
    return (
      <div className="w-[280px] border-l border-[#EBEBEB] bg-[#F8F7F5] flex-shrink-0 hidden xl:flex flex-col overflow-y-auto">
        <div className="px-5 py-5 space-y-5 flex-1">

          {/* ── Daan — Inbox analyseren ── */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium mb-2.5">Daan</h3>
            {!analysisResult ? (
              <button
                onClick={handleAnalyzeInbox}
                disabled={analysisLoading}
                className="w-full bg-white rounded-xl p-3.5 flex items-center gap-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 group disabled:opacity-70"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1A535C12' }}>
                  {analysisLoading
                    ? <Loader2 className="h-4 w-4 animate-spin text-[#1A535C]" />
                    : <Sparkles className="h-4 w-4 text-[#1A535C]" />
                  }
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[13px] font-medium text-[#1A1A1A] group-hover:text-[#1A535C] transition-colors duration-150">
                    {analysisLoading ? 'Analyseren...' : 'Inbox analyseren'}
                  </p>
                  <p className="text-[11px] text-[#9B9B95]">Categoriseer je emails</p>
                </div>
              </button>
            ) : (
              <div className="space-y-1.5">
                {analysisResult.map((cat, i) => (
                  <div key={i} className="bg-white rounded-xl px-3.5 py-3 flex items-center gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cat.bg }}>
                      <cat.icon className="h-3.5 w-3.5" style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-[#1A1A1A]">{cat.label}</p>
                      {cat.subjects.length > 0 && (
                        <p className="text-[11px] text-[#9B9B95] truncate mt-0.5">{cat.subjects[0]}</p>
                      )}
                    </div>
                    <span className="text-[13px] font-mono font-semibold flex-shrink-0" style={{ color: cat.color }}>
                      {cat.count}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => setAnalysisResult(null)}
                  className="w-full text-center text-[11px] text-[#9B9B95] hover:text-[#6B6B66] transition-colors duration-150 pt-1"
                >
                  Opnieuw analyseren
                </button>
              </div>
            )}
          </div>

          {/* ── Quick actions ── */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium mb-2.5">Snel</h3>
            <div className="space-y-1.5">
              <button
                onClick={() => onCompose?.()}
                className="w-full bg-white rounded-xl px-3.5 py-3 flex items-center gap-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 group"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#F15025]/10">
                  <Pencil className="h-3.5 w-3.5 text-[#F15025]" />
                </div>
                <span className="text-[12px] font-medium text-[#6B6B66] group-hover:text-[#1A1A1A] transition-colors duration-150">Nieuw bericht</span>
              </button>
              {!showIdleTaakForm ? (
                <button
                  onClick={() => setShowIdleTaakForm(true)}
                  className="w-full bg-white rounded-xl px-3.5 py-3 flex items-center gap-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-150 group"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#1A535C]/10">
                    <ListPlus className="h-3.5 w-3.5 text-[#1A535C]" />
                  </div>
                  <span className="text-[12px] font-medium text-[#6B6B66] group-hover:text-[#1A1A1A] transition-colors duration-150">Taak aanmaken</span>
                </button>
              ) : (
                <div className="bg-white rounded-xl p-3.5 space-y-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium">Nieuwe taak</span>
                    <button onClick={() => setShowIdleTaakForm(false)} className="text-[#9B9B95] hover:text-[#1A1A1A] transition-colors duration-150">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input
                    value={idleTaakForm.titel}
                    onChange={e => setIdleTaakForm(f => ({ ...f, titel: e.target.value }))}
                    className="w-full px-3 py-2 text-[13px] bg-[#F8F7F5] rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors duration-150 placeholder:text-[#9B9B95]"
                    placeholder="Taak titel..."
                    autoFocus
                  />
                  <button onClick={handleSaveIdleTaak} disabled={savingIdleTaak}
                    className="w-full py-2 rounded-lg bg-[#1A535C] text-white text-[12px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {savingIdleTaak ? 'Opslaan...' : 'Toevoegen'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Auto-opvolging (placeholder) ── */}
          <div>
            <h3 className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium mb-2.5">Automatisering</h3>
            <div className="bg-white rounded-xl px-3.5 py-3 flex items-center gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#8A7A4A]/10">
                <Zap className="h-3.5 w-3.5 text-[#8A7A4A]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-[#6B6B66]">Auto-opvolging</p>
                <p className="text-[11px] text-[#9B9B95]">Binnenkort beschikbaar</p>
              </div>
              <div className="w-8 h-[18px] rounded-full bg-[#EBEBEB] flex items-center px-0.5 flex-shrink-0">
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════
  // INLINE PANEL
  // ════════════════════════════════════════════
  function renderInlinePanel() {
    if (activePanel === 'none' || activePanel === 'project') return null

    const inputCls = "w-full px-3 py-2 text-[13px] bg-white rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors duration-150 placeholder:text-[#9B9B95]"

    const configs = {
      klant: {
        title: klantSearchMode ? 'Contact koppelen' : 'Nieuw contact',
        onSave: klantSearchMode ? undefined : handleSaveKlant,
        content: klantSearchMode ? (
          <>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B95]" />
              <input
                value={klantForm.bedrijfsnaam}
                onChange={e => setKlantForm(f => ({ ...f, bedrijfsnaam: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-white rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors duration-150 placeholder:text-[#9B9B95]"
                placeholder="Zoek klant..."
                autoFocus
              />
            </div>
            {addToExistingKlant ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-[#1A535C]/[0.04] rounded-lg">
                  <Building2 className="h-3.5 w-3.5 text-[#1A535C]" />
                  <span className="text-[12px] font-medium text-[#1A535C] truncate">{addToExistingKlant.bedrijfsnaam}</span>
                  <button onClick={() => setAddToExistingKlant(null)} className="ml-auto text-[#9B9B95] hover:text-[#1A1A1A]"><X className="h-3 w-3" /></button>
                </div>
                <input value={klantForm.contactpersoon} onChange={e => setKlantForm(f => ({ ...f, contactpersoon: e.target.value }))}
                  className={inputCls} placeholder="Naam contactpersoon *" autoFocus />
                <input value={klantForm.email} onChange={e => setKlantForm(f => ({ ...f, email: e.target.value }))}
                  className={inputCls} placeholder="Email" />
                <input value={klantForm.telefoon} onChange={e => setKlantForm(f => ({ ...f, telefoon: e.target.value }))}
                  className={inputCls} placeholder="Telefoon" />
                <button onClick={handleAddContactToKlant} disabled={saving}
                  className="w-full py-2 rounded-lg bg-[#1A535C] text-white text-[12px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {saving ? 'Toevoegen...' : 'Contactpersoon toevoegen'}
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-0.5 max-h-[180px] overflow-y-auto -mx-1">
                  {klantSuggestions.length > 0 ? klantSuggestions.map(k => {
                    const style = getAvatarStyle(k.bedrijfsnaam || k.contactpersoon || '')
                    return (
                      <div key={k.id} className="flex items-center gap-1 px-1">
                        <button
                          onClick={() => handleSelectKlant(k)}
                          className="flex-1 flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-white transition-colors duration-150"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ background: style.bg, color: style.text }}>
                            {(k.bedrijfsnaam || k.contactpersoon)?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-[#1A1A1A] truncate">{k.bedrijfsnaam || k.contactpersoon}</p>
                            <p className="text-[11px] text-[#9B9B95] truncate">{k.email}</p>
                          </div>
                        </button>
                        <button
                          onClick={() => { setAddToExistingKlant(k); setKlantForm(f => ({ ...f, contactpersoon: personName, email: contactEmail })) }}
                          className="p-1.5 rounded-lg hover:bg-[#E8F2EC] transition-colors flex-shrink-0"
                          title={`Contactpersoon toevoegen aan ${k.bedrijfsnaam}`}
                        >
                          <UserPlus className="h-3.5 w-3.5 text-[#3A7D52]" />
                        </button>
                      </div>
                    )
                  }) : (
                    <p className="text-[11px] text-[#9B9B95] px-3 py-2">Geen resultaten</p>
                  )}
                </div>
                <button
                  onClick={() => setKlantSearchMode(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] text-[#F15025] hover:underline transition-colors duration-150"
                >
                  <UserPlus className="h-3 w-3" />
                  Nieuw contact aanmaken
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setKlantSearchMode(true)}
              className="flex items-center gap-1 text-[11px] text-[#9B9B95] hover:text-[#1A1A1A] transition-colors duration-150 mb-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Terug naar zoeken
            </button>
            {([
              { key: 'bedrijfsnaam' as const, placeholder: 'Bedrijfsnaam' },
              { key: 'contactpersoon' as const, placeholder: 'Contactpersoon *' },
              { key: 'email' as const, placeholder: 'Email *' },
              { key: 'telefoon' as const, placeholder: 'Telefoon' },
            ] as const).map(({ key, placeholder }) => (
              <input key={key} value={klantForm[key]} onChange={e => setKlantForm(f => ({ ...f, [key]: e.target.value }))}
                className={inputCls} placeholder={placeholder} />
            ))}
          </>
        ),
      },
      taak: {
        title: 'Taak toevoegen',
        onSave: handleSaveTaak,
        content: (
          <>
            <input value={taakForm.titel} onChange={e => setTaakForm(f => ({ ...f, titel: e.target.value }))}
              className={inputCls} placeholder="Taak titel *" />
            <textarea value={taakForm.beschrijving} onChange={e => setTaakForm(f => ({ ...f, beschrijving: e.target.value }))}
              className={`${inputCls} resize-none h-16`} placeholder="Beschrijving" />
            <div>
              <label className="text-[10px] text-[#9B9B95] block mb-1">Inplannen op</label>
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
                  return (
                    <button key={days} type="button" onClick={() => setTaakForm(f => ({ ...f, deadline: val }))}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${taakForm.deadline === val ? 'bg-[#1A535C]/[0.08] text-[#1A535C]' : 'bg-[#F8F7F5] text-[#6B6B66] hover:bg-[#F0EFEC]'}`}
                    >{label}</button>
                  )
                })}
              </div>
            </div>
            {medewerkers.length > 0 && (
              <div>
                <label className="text-[10px] text-[#9B9B95] block mb-1">Toewijzen aan</label>
                <div className="flex flex-wrap gap-1.5">
                  {medewerkers.map((mw) => {
                    const selected = taakForm.toegewezen_aan === mw.naam
                    const c = mw.naam.charCodeAt(0) % 5
                    const colors = ['bg-[#E8F2EC] text-[#3A7D52]', 'bg-[#E8EEF9] text-[#3A5A9A]', 'bg-[#F5F2E8] text-[#8A7A4A]', 'bg-[#F0EFEC] text-[#6B6B66]', 'bg-[#EDE8F4] text-[#6A5A8A]']
                    return (
                      <button
                        key={mw.id}
                        type="button"
                        onClick={() => setTaakForm(f => ({ ...f, toegewezen_aan: selected ? '' : mw.naam }))}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${selected ? 'border-[#1A535C] bg-[#1A535C]/[0.08] text-[#1A535C]' : 'border-transparent bg-[#F8F7F5] text-[#6B6B66] hover:bg-[#F0EFEC]'}`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold uppercase ${colors[c]}`}>
                          {mw.naam.charAt(0)}
                        </span>
                        {mw.naam.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ),
      },
    }

    const cfg = configs[activePanel as 'klant' | 'taak']
    return (
      <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium">{cfg.title}</h3>
          <button onClick={() => setActivePanel('none')} className="text-[#9B9B95] hover:text-[#1A1A1A] transition-colors duration-150 p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {cfg.content}
          {cfg.onSave && (
            <button onClick={cfg.onSave} disabled={saving}
              className="w-full py-2 rounded-lg bg-[#1A535C] text-white text-[12px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity mt-1">
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════
  // COMPOSE + READING MODE
  // ════════════════════════════════════════════
  return (
    <div className="w-[280px] border-l border-[#EBEBEB] bg-[#F8F7F5] flex-shrink-0 overflow-y-auto hidden xl:flex flex-col">
      <div className="px-5 py-5 space-y-4 flex-1">

        {/* ── CONTACT SECTION ── */}
        {klantLoading ? (
          <div className="flex items-center gap-2 py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9B9B95]" />
            <span className="text-[12px] text-[#9B9B95]">Contact zoeken...</span>
          </div>
        ) : linkedKlant ? (
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[14px] font-bold"
                style={{ background: avatarStyle.bg, color: avatarStyle.text }}>
                {avatarInitial}
              </div>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => navigate(`/klanten/${linkedKlant.id}`)}
                  className="group flex items-center gap-1"
                >
                  <p className="text-[14px] font-bold text-[#1A1A1A] group-hover:text-[#1A535C] transition-colors truncate">
                    {linkedKlant.bedrijfsnaam || linkedKlant.contactpersoon}
                  </p>
                  <ExternalLink className="h-3 w-3 text-[#9B9B95] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
                {linkedKlant.bedrijfsnaam && linkedKlant.contactpersoon && (
                  <p className="text-[12px] text-[#6B6B66] truncate">{linkedKlant.contactpersoon}</p>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#F0EFEC] space-y-2">
              {linkedKlant.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 text-[#9B9B95] flex-shrink-0" />
                  <p className="text-[12px] text-[#6B6B66] truncate">{linkedKlant.email}</p>
                </div>
              )}
              {linkedKlant.telefoon && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-3.5 w-3.5 text-[#9B9B95] flex-shrink-0" />
                  <p className="text-[12px] font-mono text-[#6B6B66]">{linkedKlant.telefoon}</p>
                </div>
              )}
              {(linkedKlant.adres || linkedKlant.stad) && (
                <div className="flex items-start gap-2.5">
                  <Building2 className="h-3.5 w-3.5 text-[#9B9B95] flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#6B6B66]">{[linkedKlant.adres, linkedKlant.postcode, linkedKlant.stad].filter(Boolean).join(', ')}</p>
                </div>
              )}
            </div>

            {(projectCount > 0 || offerteCount > 0) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0EFEC]">
                {projectCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#1A535C] bg-[#1A535C]/[0.06]">
                    <span className="font-mono font-bold">{projectCount}</span>
                    <span>{projectCount === 1 ? 'project' : 'projecten'}</span>
                  </span>
                )}
                {offerteCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#F15025] bg-[#F15025]/[0.06]">
                    <span className="font-mono font-bold">{offerteCount}</span>
                    <span>{offerteCount === 1 ? 'offerte' : 'offertes'}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        ) : hasContact && activePanel !== 'klant' ? (
          /* ── Onbekend contact — snelkoppeling ── */
          <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                style={{ background: avatarStyle.bg, color: avatarStyle.text }}>
                {avatarInitial}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                {personName && <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{personName}</p>}
                <p className="text-[12px] text-[#9B9B95] truncate">{contactEmail}</p>
              </div>
            </div>
            <button
              onClick={() => openPanel('klant')}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-[#EBEBEB] text-[12px] text-[#1A535C] font-medium hover:border-[#1A535C]/30 hover:bg-[#1A535C]/[0.03] transition-colors duration-150"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Contact toevoegen
            </button>
          </div>
        ) : !hasContact ? (
          <div className="text-center py-4">
            <p className="text-[12px] text-[#9B9B95]">
              {mode === 'compose' ? 'Vul een ontvanger in' : 'Geen contactinfo'}
            </p>
          </div>
        ) : null}

        {/* ── QUICK ACTIONS ── */}
        {activePanel === 'none' && (
          <div>
            <h3 className="text-[11px] uppercase tracking-widest text-[#9B9B95] font-semibold mb-2.5">Acties</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => openPanel('klant')}
                className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl py-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 border border-[#F0EFEC]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#E8EEF9] flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-[#3A5A9A]" />
                </div>
                <span className="text-[10px] font-medium text-[#6B6B66]">Klant</span>
              </button>
              <button
                onClick={() => openPanel('project')}
                className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl py-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 border border-[#F0EFEC]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#E8F2EC] flex items-center justify-center">
                  <FolderPlus className="h-4 w-4 text-[#3A7D52]" />
                </div>
                <span className="text-[10px] font-medium text-[#6B6B66]">Project</span>
              </button>
              <button
                onClick={() => openPanel('taak')}
                className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl py-3 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 border border-[#F0EFEC]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#F5F2E8] flex items-center justify-center">
                  <ListPlus className="h-4 w-4 text-[#8A7A4A]" />
                </div>
                <span className="text-[10px] font-medium text-[#6B6B66]">Taak</span>
              </button>
            </div>
          </div>
        )}

        {/* ── INLINE PANEL ── */}
        {activePanel !== 'none' && renderInlinePanel()}

        {/* ── PROJECT MODAL ── */}
        <Dialog open={activePanel === 'project'} onOpenChange={(open) => !open && setActivePanel('none')}>
          <DialogContent className="max-w-2xl bg-white rounded-2xl p-0">
            <div className="px-8 pt-7 pb-6">
              <DialogHeader className="mb-5">
                <DialogTitle className="text-[22px] font-bold tracking-tight text-[#1A1A1A]">
                  Nieuw project<span className="text-[#F15025]">.</span>
                </DialogTitle>
                <p className="text-[13px] text-[#9B9B95] mt-1">Vul de gegevens in om te starten</p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider text-[#9B9B95]">
                      Projectnaam *
                    </label>
                    <input
                      value={projectForm.naam}
                      onChange={e => setProjectForm(f => ({ ...f, naam: e.target.value }))}
                      placeholder="Bijv. Gevelbelettering Bakkerij Jansen"
                      className="w-full h-10 px-3 text-[14px] bg-[#FAFAF8] rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors placeholder:text-[#9B9B95]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider text-[#9B9B95]">
                      Beschrijving
                    </label>
                    <input
                      value={projectForm.beschrijving}
                      onChange={e => setProjectForm(f => ({ ...f, beschrijving: e.target.value }))}
                      placeholder="Korte omschrijving..."
                      className="w-full h-10 px-3 text-[14px] bg-[#FAFAF8] rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors placeholder:text-[#9B9B95]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider text-[#9B9B95]">Status</label>
                    <select
                      value={projectForm.status}
                      onChange={e => setProjectForm(f => ({ ...f, status: e.target.value as typeof projectForm.status }))}
                      className="w-full h-10 px-3 text-[13px] bg-[#FAFAF8] rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors"
                    >
                      <option value="gepland">Gepland</option>
                      <option value="actief">Actief</option>
                      <option value="in-review">In review</option>
                      <option value="afgerond">Afgerond</option>
                      <option value="on-hold">On hold</option>
                      <option value="te-factureren">Te factureren</option>
                      <option value="te-plannen">Te plannen</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider text-[#9B9B95]">Startdatum</label>
                    <input
                      type="date"
                      value={projectForm.start_datum}
                      onChange={e => setProjectForm(f => ({ ...f, start_datum: e.target.value }))}
                      className="w-full h-10 px-3 text-[13px] font-mono bg-[#FAFAF8] rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider text-[#9B9B95]">Einddatum</label>
                    <input
                      type="date"
                      value={projectForm.eind_datum}
                      onChange={e => setProjectForm(f => ({ ...f, eind_datum: e.target.value }))}
                      className="w-full h-10 px-3 text-[13px] font-mono bg-[#FAFAF8] rounded-lg outline-none border border-[#EBEBEB] focus:border-[#1A535C] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-wider text-[#9B9B95]">Klant & contact</label>
                  <KlantContactSelector
                    klantId={projectForm.klant_id}
                    onKlantChange={(id) => setProjectForm(f => ({ ...f, klant_id: id, contactpersoon_id: '', vestiging_id: '' }))}
                    contactpersoonId={projectForm.contactpersoon_id}
                    onContactpersoonChange={(id) => setProjectForm(f => ({ ...f, contactpersoon_id: id }))}
                    vestigingId={projectForm.vestiging_id}
                    onVestigingChange={(id) => setProjectForm(f => ({ ...f, vestiging_id: id }))}
                    klanten={allKlanten}
                    onKlantenRefresh={() => getKlanten(500).then(k => setAllKlanten(k)).catch(() => {})}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActivePanel('none')}
                    className="h-10 px-5 text-[13px] font-medium rounded-lg border border-[#EBEBEB] text-[#6B6B66] hover:bg-[#F8F7F5] transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={saving}
                    className="h-10 px-6 text-[14px] font-bold text-white rounded-lg bg-[#1A535C] hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Opslaan...' : 'Project aanmaken'}
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── AUTO-OPVOLGING (alleen compose) ── */}
        {mode === 'compose' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium">Auto-opvolging</h3>
              <button
                onClick={() => onAutoFollowUpChange?.({ ...autoFollowUp ?? { enabled: false, dagen: 3, mode: 'auto' }, enabled: !(autoFollowUp?.enabled) })}
                className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${autoFollowUp?.enabled ? 'bg-[#1A535C]' : 'bg-[#D4D4D0]'}`}
              >
                <div className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 ${autoFollowUp?.enabled ? 'translate-x-[14px]' : ''}`} style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }} />
              </button>
            </div>

            {autoFollowUp?.enabled && (
              <div className="space-y-3">
                {/* Slider */}
                <div className="bg-white rounded-lg px-3 py-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-[#F15025]" />
                      <span className="text-[12px] font-medium text-[#1A1A1A]">Na {autoFollowUp.dagen} {autoFollowUp.dagen === 1 ? 'dag' : 'dagen'}</span>
                    </div>
                    <span className="text-[11px] text-[#9B9B95]">{autoFollowUp.dagen === 1 ? 'morgen' : `${autoFollowUp.dagen}d`}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={autoFollowUp.dagen}
                    onChange={(e) => onAutoFollowUpChange?.({ ...autoFollowUp, dagen: parseInt(e.target.value) })}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #1A535C 0%, #1A535C ${((autoFollowUp.dagen - 1) / 13) * 100}%, #EBEBEB ${((autoFollowUp.dagen - 1) / 13) * 100}%, #EBEBEB 100%)`,
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>

                {/* Mode pills */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onAutoFollowUpChange?.({ ...autoFollowUp, mode: 'auto' })}
                    className={`flex-1 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors duration-150 ${
                      (autoFollowUp.mode ?? 'auto') === 'auto'
                        ? 'bg-[#1A535C] text-white border-[#1A535C]'
                        : 'bg-white text-[#6B6B66] border-[#EBEBEB] hover:border-[#D4D4D0]'
                    }`}
                  >
                    Daan schrijft
                  </button>
                  <button
                    onClick={() => onAutoFollowUpChange?.({ ...autoFollowUp, mode: 'handmatig' })}
                    className={`flex-1 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors duration-150 ${
                      autoFollowUp.mode === 'handmatig'
                        ? 'bg-[#1A535C] text-white border-[#1A535C]'
                        : 'bg-white text-[#6B6B66] border-[#EBEBEB] hover:border-[#D4D4D0]'
                    }`}
                  >
                    Zelf schrijven
                  </button>
                </div>

                {/* Auto mode description */}
                {(autoFollowUp.mode ?? 'auto') === 'auto' && (
                  <div className="bg-[#F8F7F5] rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-[#9B9B95] leading-relaxed">
                      Daan genereert een persoonlijke opvolging op basis van je email als er geen reply binnen {autoFollowUp.dagen} {autoFollowUp.dagen === 1 ? 'dag' : 'dagen'} is.
                    </p>
                  </div>
                )}

                {/* Handmatig mode: editable textarea */}
                {autoFollowUp.mode === 'handmatig' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-wider text-[#9B9B95] font-medium">Opvolg-bericht</label>
                    <textarea
                      value={autoFollowUp.customTekst ?? `Hoi${composeToAddress ? ` ${composeToAddress.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}` : ''},\n\nik wilde even checken of je mijn bericht hebt kunnen bekijken. Mocht je nog vragen hebben, hoor ik het graag.`}
                      onChange={(e) => onAutoFollowUpChange?.({ ...autoFollowUp, customTekst: e.target.value })}
                      className="w-full bg-white rounded-lg p-3 text-[13px] text-[#1A1A1A] border border-[#EBEBEB] min-h-[100px] resize-y focus:border-[#1A535C] focus:outline-none transition-colors duration-150"
                      placeholder="Schrijf je opvolg-bericht..."
                    />
                    <button
                      onClick={() => onAutoFollowUpChange?.({ ...autoFollowUp, mode: 'auto', customTekst: undefined })}
                      className="text-[11px] text-[#F15025] hover:underline"
                    >
                      Of laat Daan het automatisch genereren
                    </button>
                  </div>
                )}

                {/* Handtekening bevestiging */}
                <div className="flex items-center gap-1.5 px-1">
                  <CheckCircle className="h-3 w-3 text-[#9B9B95]" />
                  <span className="text-[11px] text-[#9B9B95]">Wordt verzonden met je handtekening</span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
