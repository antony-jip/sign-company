import { useState, useEffect, useMemo, useCallback } from 'react'
import { Sparkles, Loader2, Wand2, Minimize2, Globe, Bell, BellOff, Clock, Mail, Link2, Search, Building2, FolderOpen, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Email, Klant, Project } from '@/types'
import { getKlanten, getProjectenByKlant } from '@/services/supabaseService'
import { extractSenderEmail, formatShortDate } from './emailHelpers'
import { toast } from 'sonner'
import { CRMSidebar } from './EmailCRMSidebar'

export interface ComposeActions {
  forgieWrite: () => void
  forgieRewrite: (action: string, label: string) => void
}

interface EmailContextSidebarProps {
  mode: 'compose' | 'reading'
  // Compose mode props
  composeToAddress?: string
  composeReminder?: string | null
  onComposeReminderChange?: (value: string | null) => void
  forgieLoading?: boolean
  onForgieWrite?: () => void
  onForgieRewrite?: (action: string, label: string) => void
  allEmails?: Email[]
  // Reading mode props
  email?: Email | null
  senderName?: string
  senderEmail?: string
  avatarColor?: string
  avatarRingColor?: string
  onSelectEmail?: (email: Email) => void
}

const reminderOptions = [
  { label: 'Over 1 uur', value: '1h' },
  { label: 'Morgen 9:00', value: '1d' },
  { label: 'Over 2 dagen', value: '2d' },
  { label: 'Over 1 week', value: '1w' },
]

const aiAccent = '#B8860B' // warm gold for AI section

const sectionStyle = {
  background: 'linear-gradient(135deg, hsl(30 40% 97%) 0%, hsl(28 35% 94%) 100%)',
  boxShadow: '0 2px 12px rgba(140,100,50,0.08), 0 0 0 1px rgba(140,100,50,0.04)',
}

export function EmailContextSidebar({
  mode,
  composeToAddress,
  composeReminder,
  onComposeReminderChange,
  forgieLoading,
  onForgieWrite,
  onForgieRewrite,
  allEmails = [],
  email,
  senderName,
  senderEmail,
  avatarColor,
  avatarRingColor,
  onSelectEmail,
}: EmailContextSidebarProps) {
  // ── Koppelen state ──
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [selectedKlant, setSelectedKlant] = useState<Klant | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [klantSearch, setKlantSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [showKlantDropdown, setShowKlantDropdown] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  // Fetch klanten on mount
  useEffect(() => {
    if (mode === 'compose') {
      getKlanten().then(setKlanten).catch(() => {})
    }
  }, [mode])

  // Fetch projecten when klant selected
  useEffect(() => {
    if (selectedKlant) {
      setProjecten([])
      setSelectedProject(null)
      setProjectSearch('')
      getProjectenByKlant(selectedKlant.id).then(setProjecten).catch(() => {})
    } else {
      setProjecten([])
      setSelectedProject(null)
    }
  }, [selectedKlant])

  // Previous emails with this contact
  const previousEmails = useMemo(() => {
    if (!composeToAddress?.trim() || composeToAddress.length < 3) return []
    const toAddr = composeToAddress.toLowerCase()
    return allEmails
      .filter(e => {
        const from = extractSenderEmail(e.van)?.toLowerCase()
        const toField = e.aan?.toLowerCase() || ''
        return from === toAddr || toField.includes(toAddr)
      })
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .slice(0, 5)
  }, [composeToAddress, allEmails])

  const filteredKlanten = useMemo(() => {
    if (!klantSearch.trim()) return klanten
    const q = klantSearch.toLowerCase()
    return klanten.filter(k =>
      k.bedrijfsnaam?.toLowerCase().includes(q) ||
      k.contactpersoon?.toLowerCase().includes(q)
    )
  }, [klantSearch, klanten])

  const filteredProjecten = useMemo(() => {
    if (!projectSearch.trim()) return projecten
    const q = projectSearch.toLowerCase()
    return projecten.filter(p =>
      p.naam?.toLowerCase().includes(q) ||
      p.project_nummer?.toLowerCase().includes(q)
    )
  }, [projectSearch, projecten])

  const handleSetReminder = useCallback((value: string) => {
    onComposeReminderChange?.(value)
    const labels: Record<string, string> = { '1h': '1 uur', '1d': 'morgen 9:00', '2d': '2 dagen', '1w': '1 week' }
    toast.success(`Herinnering ingesteld: ${labels[value]}`)
  }, [onComposeReminderChange])

  // ── Reading mode ──
  if (mode === 'reading') {
    return (
      <CRMSidebar
        email={email!}
        senderName={senderName || ''}
        senderEmail={senderEmail || ''}
        avatarColor={avatarColor || 'bg-amber-500'}
        avatarRingColor={avatarRingColor}
        allEmails={allEmails}
        onSelectEmail={onSelectEmail}
      />
    )
  }

  // ── Compose mode ──
  return (
    <div
      className="w-[300px] border-l border-[hsl(35,15%,87%)] flex-shrink-0 overflow-y-auto hidden xl:flex flex-col"
      style={{ background: 'hsl(36 18% 97%)' }}
    >
      <div className="p-4 space-y-3 flex-1">

        {/* ── Daan AI Tools ── */}
        <div className="rounded-xl border border-white/60 overflow-hidden" style={sectionStyle}>
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5"
            style={{ background: `${aiAccent}0C`, borderBottom: `1px solid ${aiAccent}15` }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: aiAccent }} />
            <h4 className="text-[12px] font-semibold text-foreground/60">Daan AI</h4>
            {forgieLoading && <Loader2 className="h-3 w-3 animate-spin text-foreground/30 ml-auto" />}
          </div>
          <div className="p-2 space-y-0.5">
            <button
              onClick={() => onForgieWrite?.()}
              disabled={forgieLoading}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-background transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: `${aiAccent}12` }}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: aiAccent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground/65 group-hover:text-foreground transition-colors">Schrijf mijn e-mail</p>
                <p className="text-[10px] text-muted-foreground">Genereer volledige email</p>
              </div>
            </button>
            <button
              onClick={() => onForgieRewrite?.('rewrite-professional', 'Professioneler herschreven')}
              disabled={forgieLoading}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-background transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: `${aiAccent}12` }}>
                <Wand2 className="h-3.5 w-3.5" style={{ color: aiAccent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground/65 group-hover:text-foreground transition-colors">Professioneler</p>
                <p className="text-[10px] text-muted-foreground">Formele toon</p>
              </div>
            </button>
            <button
              onClick={() => onForgieRewrite?.('rewrite-shorter', 'Korter herschreven')}
              disabled={forgieLoading}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-background transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: `${aiAccent}12` }}>
                <Minimize2 className="h-3.5 w-3.5" style={{ color: aiAccent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground/65 group-hover:text-foreground transition-colors">Korter maken</p>
                <p className="text-[10px] text-muted-foreground">Beknopter formuleren</p>
              </div>
            </button>
            <button
              onClick={() => onForgieRewrite?.('translate-en', 'Vertaald naar Engels')}
              disabled={forgieLoading}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-background transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: `${aiAccent}12` }}>
                <Globe className="h-3.5 w-3.5" style={{ color: aiAccent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground/65 group-hover:text-foreground transition-colors">Vertaal Engels</p>
                <p className="text-[10px] text-muted-foreground">Translate to English</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── Opvolg-herinnering ── */}
        <div className="rounded-xl border border-white/60 overflow-hidden" style={sectionStyle}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-900/[0.06]">
            <Bell className="h-3.5 w-3.5 text-amber-700/30" />
            <h4 className="text-[12px] font-semibold text-foreground/60">Opvolg-herinnering</h4>
            {composeReminder && (
              <button
                onClick={() => { onComposeReminderChange?.(null); toast('Herinnering verwijderd') }}
                className="ml-auto text-foreground/25 hover:text-foreground/50 transition-colors"
                title="Verwijder herinnering"
              >
                <BellOff className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="p-2">
            {composeReminder ? (
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-[8px] bg-mod-taken-light text-mod-taken-text text-[12px]">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Herinnering: {reminderOptions.find(r => r.value === composeReminder)?.label}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {reminderOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleSetReminder(opt.value)}
                    className="px-2 py-1.5 rounded-[6px] text-[11px] text-foreground/50 hover:text-foreground/80 hover:bg-background transition-colors text-center"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Eerdere emails ── */}
        <div className="rounded-xl border border-white/60 overflow-hidden" style={sectionStyle}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-900/[0.06]">
            <Mail className="h-3.5 w-3.5 text-amber-700/30" />
            <h4 className="text-[12px] font-semibold text-foreground/60">Eerdere emails</h4>
            {previousEmails.length > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground font-mono tabular-nums">{previousEmails.length}</span>
            )}
          </div>
          <div className="p-2">
            {!composeToAddress?.trim() ? (
              <p className="text-[11px] text-muted-foreground px-2 py-2">Vul een ontvanger in om eerdere emails te zien</p>
            ) : previousEmails.length === 0 ? (
              <p className="text-[11px] text-muted-foreground px-2 py-2">Geen eerdere emails gevonden</p>
            ) : (
              <div className="space-y-0.5">
                {previousEmails.map(e => (
                  <div key={e.id} className="px-2.5 py-1.5 rounded-[6px] hover:bg-background transition-colors cursor-default">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-foreground/60 truncate flex-1">{e.onderwerp || '(geen onderwerp)'}</p>
                      <span className="text-[9px] text-muted-foreground tabular-nums flex-shrink-0">{formatShortDate(e.datum)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {e.inhoud?.replace(/<[^>]*>/g, '').slice(0, 60) || '...'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Koppelen ── */}
        <div className="rounded-xl border border-white/60 overflow-hidden" style={sectionStyle}>
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-amber-900/[0.06]">
            <Link2 className="h-3.5 w-3.5 text-amber-700/30" />
            <h4 className="text-[11px] font-semibold text-foreground/60 uppercase tracking-wider">Koppelen</h4>
          </div>
          <div className="p-2 space-y-2">

            {/* Klant dropdown */}
            <div className="relative">
              <label className="text-[10px] text-muted-foreground px-1 mb-0.5 block">Klant</label>
              {selectedKlant ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[hsl(35,15%,87%)] bg-white/60 text-[12px]">
                  <Building2 className="h-3.5 w-3.5 text-foreground/40 flex-shrink-0" />
                  <span className="text-foreground/70 truncate flex-1">{selectedKlant.bedrijfsnaam}</span>
                  <button
                    onClick={() => { setSelectedKlant(null); setKlantSearch(''); setShowKlantDropdown(false) }}
                    className="text-foreground/30 hover:text-foreground/60 transition-colors"
                  >
                    <ChevronDown className="h-3 w-3 rotate-180" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30" />
                  <input
                    type="text"
                    value={klantSearch}
                    onChange={e => { setKlantSearch(e.target.value); setShowKlantDropdown(true) }}
                    onFocus={() => setShowKlantDropdown(true)}
                    onBlur={() => setTimeout(() => setShowKlantDropdown(false), 200)}
                    placeholder="Zoek klant..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[hsl(35,15%,87%)] bg-white/60 text-[12px] text-foreground/70 placeholder:text-foreground/30 outline-none focus:border-amber-700/20 transition-colors"
                  />
                </div>
              )}
              {showKlantDropdown && !selectedKlant && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-[hsl(35,15%,87%)] bg-white shadow-lg max-h-[140px] overflow-y-auto">
                  {filteredKlanten.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground px-2.5 py-2">Geen klanten gevonden</p>
                  ) : (
                    filteredKlanten.map(k => (
                      <button
                        key={k.id}
                        onMouseDown={() => { setSelectedKlant(k); setKlantSearch(''); setShowKlantDropdown(false) }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] text-foreground/70 hover:bg-amber-50 transition-colors"
                      >
                        {k.bedrijfsnaam}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Project dropdown (only when klant selected) */}
            {selectedKlant && (
              <div className="relative">
                <label className="text-[10px] text-muted-foreground px-1 mb-0.5 block">Project</label>
                {selectedProject ? (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[hsl(35,15%,87%)] bg-white/60 text-[12px]">
                    <FolderOpen className="h-3.5 w-3.5 text-foreground/40 flex-shrink-0" />
                    <span className="text-foreground/70 truncate flex-1">{selectedProject.naam}</span>
                    <button
                      onClick={() => { setSelectedProject(null); setProjectSearch(''); setShowProjectDropdown(false) }}
                      className="text-foreground/30 hover:text-foreground/60 transition-colors"
                    >
                      <ChevronDown className="h-3 w-3 rotate-180" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={e => { setProjectSearch(e.target.value); setShowProjectDropdown(true) }}
                      onFocus={() => setShowProjectDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                      placeholder="Zoek project..."
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[hsl(35,15%,87%)] bg-white/60 text-[12px] text-foreground/70 placeholder:text-foreground/30 outline-none focus:border-amber-700/20 transition-colors"
                    />
                  </div>
                )}
                {showProjectDropdown && !selectedProject && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-[hsl(35,15%,87%)] bg-white shadow-lg max-h-[140px] overflow-y-auto">
                    {filteredProjecten.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground px-2.5 py-2">Geen projecten gevonden</p>
                    ) : (
                      filteredProjecten.map(p => (
                        <button
                          key={p.id}
                          onMouseDown={() => { setSelectedProject(p); setProjectSearch(''); setShowProjectDropdown(false) }}
                          className="w-full text-left px-2.5 py-1.5 text-[11px] text-foreground/70 hover:bg-amber-50 transition-colors"
                        >
                          <span>{p.naam}</span>
                          {p.project_nummer && (
                            <span className="ml-1.5 text-[10px] text-muted-foreground">#{p.project_nummer}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
