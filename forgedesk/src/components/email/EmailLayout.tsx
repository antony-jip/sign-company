import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search, Pencil, Inbox, Send, FileEdit, Trash2, Star,
  Loader2, Clock, Archive, Mail, MailOpen, CheckCheck, X,
  Pin, AlarmClock, RefreshCw, Keyboard, Eye, Zap, BarChart3,
  Users, Tag, ChevronDown, Info, Paperclip,
} from 'lucide-react'
import { createEmail, createKlant, createTaak, createProject, createDeal } from '@/services/supabaseService'
import { sendEmail as sendEmailViaApi } from '@/services/gmailService'
import { formatDateTime, cn, truncate, getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailCompose } from './EmailCompose'
import { ContactSidebar } from './ContactSidebar'
import { EmailTracking } from './EmailTracking'
import { EmailSequences } from './EmailSequences'
import { EmailAnalytics } from './EmailAnalytics'
import { GedeeldeInboxLayout } from './GedeeldeInboxLayout'
import { EmailListItem } from './EmailListItem'
import type { AddCustomerData, QuickProjectData, QuickTaskData, QuickDealData } from './ContactSidebar'
import { extractEmailAddress } from '@/utils/emailUtils'
import type { EmailContact } from '@/utils/emailUtils'
import type { Email } from '@/types'
import { logger } from '../../utils/logger'
import { useEmailData } from './hooks/useEmailData'
import { useEmailActions } from './hooks/useEmailActions'
import { useEmailSelection } from './hooks/useEmailSelection'
import { useEmailFilters } from './hooks/useEmailFilters'
import { useEmailKeyboard } from './hooks/useEmailKeyboard'
import type { EmailFolder, FilterType, FontSize, EmailTab, ViewMode } from './emailTypes'
import {
  extractSenderName, extractSenderEmail, fontSizeClasses,
  KEYBOARD_SHORTCUTS, SEARCH_OPERATORS,
} from './emailHelpers'

// ─── Folder config ───────────────────────────────────────────────

const folderTabs: { id: EmailFolder; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'verzonden', label: 'Verzonden', icon: Send },
  { id: 'concepten', label: 'Concepten', icon: FileEdit },
  { id: 'gepland', label: 'Gepland', icon: Clock },
  { id: 'gesnoozed', label: 'Gesnoozed', icon: AlarmClock },
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

// ═════════════════════════════════════════════════════════════════════
// ─── Main Layout ─────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

export function EmailLayout() {
  // ── Core state ──
  const [viewMode, setViewMode] = useState<ViewMode>('idle')
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('alle')
  const [activeTab, setActiveTab] = useState<EmailTab>('email')
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<string | null>(null)
  const [showSearchHelp, setShowSearchHelp] = useState(false)

  // Compose defaults (for reply/forward)
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string; subject?: string; body?: string
  }>({})

  // Recently created klant (for chaining: email → klant → project/deal)
  const [recentlyCreatedKlantId, setRecentlyCreatedKlantId] = useState<string | null>(null)

  // ── Hooks ──
  const {
    emails, setEmails, klanten, setKlanten,
    isLoading, isRefreshing, useIMAP, isLoadingBody,
    handleRefresh, handleFolderLoad, loadEmailBody, user,
  } = useEmailData()

  const emailActions = useEmailActions({
    setEmails,
    setSelectedEmail,
    setViewMode,
  })

  const { filteredEmails, folderCounts, filterCounts, threadedEmails } = useEmailFilters(
    emails, selectedFolder, searchQuery, filter
  )

  const selection = useEmailSelection({
    filteredEmails,
    setEmails,
  })

  // ── Contact lookup ──
  const findContactByEmail = useCallback((emailAddr: string): EmailContact | null => {
    const clean = extractEmailAddress(emailAddr).toLowerCase()
    if (!clean) return null

    const klant = klanten.find((k) => {
      if (k.email?.toLowerCase() === clean) return true
      if (k.contactpersonen?.some((cp: { email?: string }) => cp.email?.toLowerCase() === clean)) return true
      return false
    })
    if (!klant) return null

    const matchedCP = klant.contactpersonen?.find((cp: { email?: string; naam?: string; telefoon?: string }) => cp.email?.toLowerCase() === clean)

    return {
      name: matchedCP?.naam || klant.contactpersoon || klant.bedrijfsnaam || clean,
      email: clean,
      company: klant.bedrijfsnaam,
      phone: matchedCP?.telefoon || klant.telefoon,
      isCustomer: true,
      subscribedNewsletter: false,
      tags: klant.tags || [],
      notes: klant.notities,
    }
  }, [klanten])

  const currentContact = useMemo<EmailContact | null>(() => {
    if (viewMode === 'reading' && selectedEmail) return findContactByEmail(selectedEmail.van)
    if (viewMode === 'composing' && composeDefaults.to) return findContactByEmail(composeDefaults.to)
    return null
  }, [viewMode, selectedEmail, composeDefaults.to, findContactByEmail])

  const currentSenderName = useMemo(() => {
    if (viewMode === 'reading' && selectedEmail) return extractSenderName(selectedEmail.van)
    if (viewMode === 'composing' && composeDefaults.to) return composeDefaults.to
    return ''
  }, [viewMode, selectedEmail, composeDefaults.to])

  const currentSenderEmail = useMemo(() => {
    if (viewMode === 'reading' && selectedEmail) return extractSenderEmail(selectedEmail.van)
    if (viewMode === 'composing' && composeDefaults.to) return composeDefaults.to
    return ''
  }, [viewMode, selectedEmail, composeDefaults.to])

  // ── Email selection handler ──
  const handleSelectEmail = useCallback(async (email: Email) => {
    setSelectedEmail(email)
    setViewMode('reading')
    selection.setCheckedEmails(new Set())

    // Mark as read locally
    if (!email.gelezen) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, gelezen: true } : e))
      )
    }

    // Load body if IMAP
    const updated = await loadEmailBody(email, selectedFolder)
    if (updated !== email) {
      setSelectedEmail(updated)
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? updated : e))
      )
    } else if (!useIMAP && !email.gelezen) {
      const { updateEmail } = await import('@/services/supabaseService')
      updateEmail(email.id, { gelezen: true }).catch(() => {})
    }
  }, [loadEmailBody, selectedFolder, useIMAP, setEmails, selection])

  // ── Compose/Reply/Forward handlers ──
  const handleReply = useCallback((email: Email) => {
    const senderEmail = email.van.match(/<([^>]+)>/)?.[1] || email.van
    setComposeDefaults({
      to: senderEmail,
      subject: `Re: ${email.onderwerp}`,
      body: `\n\n---\nOp ${formatDateTime(email.datum)} schreef ${extractSenderName(email.van)}:\n\n${email.inhoud}`,
    })
    setViewMode('composing')
  }, [])

  const handleForward = useCallback((email: Email) => {
    setComposeDefaults({
      to: '',
      subject: `Fwd: ${email.onderwerp}`,
      body: `\n\n---\nDoorgestuurd bericht\nVan: ${email.van}\nDatum: ${formatDateTime(email.datum)}\nOnderwerp: ${email.onderwerp}\n\n${email.inhoud}`,
    })
    setViewMode('composing')
  }, [])

  const handleCompose = useCallback(() => {
    setComposeDefaults({})
    setViewMode('composing')
    setSelectedEmail(null)
  }, [])

  // ── Quick reply via send ref ──
  const sendEmailRef = useRef<(data: { to: string; subject: string; body: string }) => void>()

  const handleQuickReply = useCallback((email: Email, text: string) => {
    if (!text.trim()) return
    const senderEmail = email.van.match(/<([^>]+)>/)?.[1] || email.van
    sendEmailRef.current?.({
      to: senderEmail,
      subject: `Re: ${email.onderwerp}`,
      body: text,
    })
  }, [])

  // ── Keyboard shortcuts ──
  const keyboard = useEmailKeyboard({
    viewMode,
    filteredEmails,
    onSelectEmail: handleSelectEmail,
    onToggleStar: emailActions.handleToggleStar,
    onTogglePin: emailActions.handleTogglePin,
    onArchive: emailActions.handleArchive,
    onDelete: emailActions.handleDelete,
    onCompose: handleCompose,
    onReply: handleReply,
    onForward: handleForward,
    onShowSnooze: (id) => setShowSnoozeMenu(id),
  })

  // ── Send email ──
  const handleSendEmail = useCallback(async (data: { to: string; subject: string; body: string; scheduledAt?: string }) => {
    const isScheduled = !!data.scheduledAt
    try {
      await sendEmailViaApi(data.to, data.subject, data.body, {
        html: data.body,
      })
      const newEmail: Omit<Email, 'id' | 'created_at'> = {
        user_id: user?.id || '',
        gmail_id: '',
        van: user?.email || '',
        aan: data.to,
        onderwerp: data.subject,
        inhoud: data.body,
        datum: isScheduled ? data.scheduledAt! : new Date().toISOString(),
        gelezen: true,
        starred: false,
        labels: isScheduled ? ['gepland'] : ['verzonden'],
        bijlagen: 0,
        map: isScheduled ? 'gepland' : 'verzonden',
        scheduled_at: data.scheduledAt,
      }
      const saved = await createEmail(newEmail)
      setEmails((prev) => [saved, ...prev])
      toast.success(isScheduled ? 'Email ingepland' : 'Email verzonden')
    } catch (err: unknown) {
      logger.error('Email verzenden mislukt:', err)
      toast.error(err instanceof Error ? err.message : 'Email kon niet worden verzonden')
    }
    setViewMode('idle')
  }, [user, setEmails])

  sendEmailRef.current = handleSendEmail

  // ── Folder change ──
  const handleFolderChange = useCallback(async (folder: EmailFolder) => {
    setSelectedFolder(folder)
    setSelectedEmail(null)
    setViewMode('idle')
    setFilter('alle')
    selection.setCheckedEmails(new Set())
    await handleFolderLoad(folder)
  }, [handleFolderLoad, selection])

  const handleBack = useCallback(() => {
    setSelectedEmail(null)
    setViewMode('idle')
  }, [])

  const handleCancelCompose = useCallback(() => {
    setViewMode(selectedEmail ? 'reading' : 'idle')
  }, [selectedEmail])

  // ── CRM sidebar actions ──
  const handleAddCustomer = useCallback(async (email: string, data?: AddCustomerData) => {
    try {
      const newKlant = await createKlant({
        user_id: user?.id || '',
        bedrijfsnaam: data?.bedrijfsnaam || '',
        contactpersoon: data?.contactpersoon || extractSenderName(email),
        email: data?.email || email,
        telefoon: data?.telefoon || '',
        adres: data?.adres || '',
        postcode: data?.postcode || '',
        stad: data?.stad || '',
        land: data?.land || 'Nederland',
        website: data?.website || '',
        kvk_nummer: data?.kvk_nummer || '',
        btw_nummer: data?.btw_nummer || '',
        status: data?.status || 'prospect',
        tags: data?.tags || [],
        notities: data?.notities || '',
        contactpersonen: [{
          id: '',
          naam: data?.contactpersoon || extractSenderName(email),
          functie: '',
          email: data?.email || email,
          telefoon: data?.telefoon || '',
          is_primair: true,
        }],
      })
      setKlanten((prev) => [...prev, newKlant])
      setRecentlyCreatedKlantId(newKlant.id)
      toast.success(`${data?.contactpersoon || email} toegevoegd aan klanten`)
    } catch (err: unknown) {
      logger.error('Klant aanmaken mislukt:', err)
      toast.error('Kon contact niet opslaan')
    }
  }, [user, setKlanten])

  const handleSubscribeNewsletter = useCallback((_email: string) => {
    toast.success('Geabonneerd op nieuwsbrief')
  }, [])

  const handleCreateTaskFromEmail = useCallback(async (email: Email, description: string) => {
    try {
      await createTaak({
        user_id: user?.id || '',
        project_id: '',
        titel: description,
        beschrijving: `Aangemaakt vanuit email: "${email.onderwerp}"\nVan: ${email.van}\nDatum: ${email.datum}`,
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: '',
        deadline: undefined,
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
    } catch (err: unknown) {
      logger.error('Taak aanmaken mislukt:', err)
      toast.error('Kon taak niet aanmaken')
    }
  }, [user])

  // Clear recently created klant when switching emails
  useEffect(() => {
    setRecentlyCreatedKlantId(null)
  }, [selectedEmail?.id])

  // Clear checked when changing folder/filter
  useEffect(() => {
    selection.setCheckedEmails(new Set())
  }, [selectedFolder, filter])

  const handleCreateProjectFromEmail = useCallback(async (data: QuickProjectData) => {
    try {
      await createProject({
        user_id: user?.id || '',
        klant_id: data.klant_id || recentlyCreatedKlantId || '',
        naam: data.naam,
        beschrijving: data.beschrijving,
        status: 'gepland',
        prioriteit: 'medium',
        start_datum: new Date().toISOString().split('T')[0],
        eind_datum: undefined,
        budget: 0,
        besteed: 0,
        voortgang: 0,
        team_leden: [],
      })
      toast.success('Project aangemaakt')
    } catch (err: unknown) {
      logger.error('Project aanmaken mislukt:', err)
      toast.error('Kon project niet aanmaken')
    }
  }, [user?.id, recentlyCreatedKlantId])

  const handleCreateDealFromEmail = useCallback(async (data: QuickDealData) => {
    try {
      await createDeal({
        user_id: user?.id || '',
        klant_id: data.klant_id || recentlyCreatedKlantId || '',
        titel: data.titel,
        beschrijving: data.beschrijving,
        verwachte_waarde: data.verwachte_waarde,
        fase: 'nieuw',
        fase_sinds: new Date().toISOString(),
        status: 'open',
        bron: 'email',
      })
      toast.success('Deal aangemaakt')
    } catch (err: unknown) {
      logger.error('Deal aanmaken mislukt:', err)
      toast.error('Kon deal niet aanmaken')
    }
  }, [user?.id, recentlyCreatedKlantId])

  const handleQuickTaskFromEmail = useCallback(async (data: { titel: string; beschrijving: string }) => {
    try {
      await createTaak({
        user_id: user?.id || '',
        project_id: '',
        titel: data.titel,
        beschrijving: data.beschrijving + (selectedEmail ? `\n\nVanuit email: "${selectedEmail.onderwerp}"` : ''),
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: '',
        deadline: undefined,
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success('Taak aangemaakt')
    } catch (err: unknown) {
      logger.error('Taak aanmaken mislukt:', err)
      toast.error('Kon taak niet aanmaken')
    }
  }, [user?.id, selectedEmail])

  const handleNavigateToOfferte = useCallback((_klantId?: string) => {
    window.location.hash = '#/offertes/nieuw'
    toast.info('Ga naar Offertes om een nieuwe offerte te maken')
  }, [])

  // ── Computed ──
  const showSidebar = viewMode === 'reading' || viewMode === 'composing'
  const fs = fontSizeClasses[fontSize]

  // ═════════════════════════════════════════════════════════════════
  // ─── Render ────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col">
      {/* ── Top Tab Bar ── */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {([
          { id: 'email' as EmailTab, label: 'Email', icon: Mail },
          { id: 'gedeelde-inbox' as EmailTab, label: 'Team Inbox', icon: Users },
          { id: 'tracking' as EmailTab, label: 'Tracking', icon: Eye },
          { id: 'sequences' as EmailTab, label: 'Sequences', icon: Zap },
          { id: 'analytics' as EmailTab, label: 'Analytics', icon: BarChart3 },
        ]).map((tab) => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'gedeelde-inbox' ? (
        <GedeeldeInboxLayout />
      ) : activeTab === 'tracking' ? (
        <EmailTracking emails={emails} />
      ) : activeTab === 'sequences' ? (
        <EmailSequences />
      ) : activeTab === 'analytics' ? (
        <EmailAnalytics emails={emails} />
      ) : isLoading ? (
        <Card className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="p-3 flex items-center gap-2">
              <div className="flex-1 h-9 rounded-lg animate-shimmer" />
              <div className="h-9 w-20 rounded-lg animate-shimmer" />
            </div>
            <div className="px-3 pb-2 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-7 w-20 rounded-md animate-shimmer" />
              ))}
            </div>
            <div className="px-3 pb-2 flex items-center gap-1 border-b">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 w-16 rounded-full animate-shimmer" />
              ))}
            </div>
            <div className="flex-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/30">
                  <div className="w-2 h-2 rounded-full animate-shimmer" />
                  <div className="w-32 h-4 rounded animate-shimmer" />
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-4 rounded animate-shimmer" style={{ width: `${30 + Math.random() * 30}%` }} />
                    <div className="h-3 rounded animate-shimmer flex-1" />
                  </div>
                  <div className="w-12 h-3 rounded animate-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           3-Column Gmail-style Layout:
           Col 1: Folder sidebar (narrow, always visible on desktop)
           Col 2: Email list (flexible)
           Col 3: Reading pane / Compose / CRM sidebar
           On mobile: single column with navigation
           ═══════════════════════════════════════════════════════════════ */
        <Card className="flex-1 flex overflow-hidden">

          {/* ═══ Column 1: Folder Sidebar (desktop only) ═══ */}
          <div className={cn(
            'border-r flex-shrink-0 flex flex-col bg-muted/20 dark:bg-muted/10',
            // Hide on mobile when reading/composing
            viewMode !== 'idle' ? 'hidden lg:flex w-[200px]' : 'hidden md:flex w-[200px]'
          )}>
            {/* Compose button */}
            <div className="p-3">
              <Button onClick={handleCompose} className="w-full gap-1.5 h-10 shadow-sm">
                <Pencil className="w-4 h-4" />
                Nieuw
              </Button>
            </div>

            {/* Folder list */}
            <nav className="flex-1 px-2">
              {folderTabs.map((tab) => {
                const isActive = selectedFolder === tab.id
                const count = folderCounts[tab.id]
                const FolderIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleFolderChange(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <FolderIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        'text-[10px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center',
                        isActive
                          ? 'bg-primary text-white'
                          : 'bg-muted-foreground/15 text-muted-foreground'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Label section */}
            <div className="border-t px-3 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Labels</span>
              </div>
              {['offerte', 'klant', 'project', 'leverancier'].map((label) => {
                const labelCount = emails.filter((e) => e.labels.includes(label)).length
                return (
                  <button
                    key={label}
                    onClick={() => setSearchQuery(`label:${label}`)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <span className={cn(
                      'w-2.5 h-2.5 rounded-sm flex-shrink-0',
                      label === 'offerte' && 'bg-blue-400',
                      label === 'klant' && 'bg-emerald-400',
                      label === 'project' && 'bg-primary',
                      label === 'leverancier' && 'bg-amber-400',
                    )} />
                    <span className="flex-1 text-left capitalize">{label}</span>
                    {labelCount > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">{labelCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ═══ Column 2: Email List ═══ */}
          <div className={cn(
            'flex flex-col min-w-0',
            // On mobile: full width when idle, hidden when reading/composing
            // On desktop: fixed width list panel
            viewMode === 'idle'
              ? 'flex-1 lg:w-[420px] lg:flex-none'
              : 'hidden lg:flex lg:w-[420px] lg:flex-none',
            viewMode !== 'idle' && 'lg:border-r'
          )}>
            {/* Search + actions */}
            <div className="p-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchHelp(true)}
                  onBlur={() => setTimeout(() => setShowSearchHelp(false), 200)}
                  placeholder="Zoek emails... (probeer from: to: has: label:)"
                  className="pl-10 pr-8 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {/* Search operators help dropdown */}
                {showSearchHelp && !searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg p-3 z-50">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Geavanceerd zoeken
                    </p>
                    <div className="space-y-1.5">
                      {SEARCH_OPERATORS.map((op) => (
                        <button
                          key={op.key}
                          onClick={() => { setSearchQuery(op.key); setShowSearchHelp(false) }}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-muted transition-colors text-left"
                        >
                          <code className="font-mono text-primary bg-primary/10 px-1 rounded">{op.key}</code>
                          <span className="text-muted-foreground">{op.description}</span>
                          <span className="ml-auto text-muted-foreground/50 font-mono text-[10px]">{op.example}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={() => handleRefresh(selectedFolder)}
                size="sm"
                variant="outline"
                className="h-9 w-9 flex-shrink-0 p-0"
                disabled={isRefreshing}
                title="Vernieuwen"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              </Button>
              {/* Mobile compose button (visible when folder sidebar is hidden) */}
              <Button onClick={handleCompose} size="sm" className="gap-1.5 h-9 flex-shrink-0 md:hidden">
                <Pencil className="w-3.5 h-3.5" />
                Nieuw
              </Button>
            </div>

            {/* Mobile folder tabs (visible when sidebar hidden) */}
            <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto md:hidden">
              {folderTabs.map((tab) => {
                const isActive = selectedFolder === tab.id
                const count = folderCounts[tab.id]
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleFolderChange(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {count > 0 && (
                      <span className={cn(
                        'text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center',
                        isActive ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Filter chips + Font size */}
            <div className="px-3 pb-2 flex items-center justify-between border-b">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {(['alle', 'ongelezen', 'met-ster', 'vastgepind', 'bijlagen'] as FilterType[]).map((f) => {
                  const labels: Record<FilterType, string> = {
                    alle: 'Alle',
                    ongelezen: 'Ongelezen',
                    'met-ster': 'Met ster',
                    vastgepind: 'Vastgepind',
                    bijlagen: 'Bijlagen',
                  }
                  const count = filterCounts[f]
                  const isActive = filter === f
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {labels[f]}
                      {f !== 'alle' && count > 0 && (
                        <span className={cn(
                          'text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center',
                          isActive ? 'bg-background/20 text-background' : 'bg-muted-foreground/15 text-muted-foreground'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Font size control */}
              <div className="flex items-center gap-0.5 ml-2">
                {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={cn(
                      'w-6 h-6 rounded flex items-center justify-center font-bold transition-colors',
                      size === 'small' ? 'text-[10px]' : size === 'medium' ? 'text-xs' : 'text-sm',
                      fontSize === size
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                    title={size === 'small' ? 'Klein' : size === 'medium' ? 'Normaal' : 'Groot'}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk action toolbar */}
            {selection.hasChecked ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 dark:bg-primary/10 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selection.allChecked ? true : selection.someChecked ? 'indeterminate' : false}
                    onCheckedChange={selection.toggleCheckAll}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-xs font-medium text-foreground">
                    {selection.checkedEmails.size} geselecteerd
                  </span>
                </div>
                <div className="h-4 w-px bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={selection.handleBulkMarkRead}>
                  <MailOpen className="w-3.5 h-3.5" /> Gelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={selection.handleBulkMarkUnread}>
                  <Mail className="w-3.5 h-3.5" /> Ongelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={selection.handleBulkArchive}>
                  <Archive className="w-3.5 h-3.5" /> Archiveren
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={selection.handleBulkDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Verwijderen
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={selection.clearChecked}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-muted/10 dark:bg-muted/5">
                <Checkbox
                  checked={false}
                  onCheckedChange={selection.toggleCheckAll}
                  className="transition-opacity"
                />
                <button onClick={selection.toggleCheckAll} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  Alles selecteren
                </button>
                <span className="text-[11px] text-muted-foreground/50 ml-auto">
                  {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Email list */}
            <ScrollArea className="flex-1">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  {selectedFolder === 'gepland' ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Clock className="w-7 h-7 text-primary/40" />
                      </div>
                      <p className="text-sm font-medium">Geen ingeplande emails</p>
                      <p className="text-xs mt-1">Plan een email in bij het verzenden</p>
                    </>
                  ) : selectedFolder === 'gesnoozed' ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                        <AlarmClock className="w-7 h-7 text-amber-500/40" />
                      </div>
                      <p className="text-sm font-medium">Geen gesnoozede emails</p>
                      <p className="text-xs mt-1">Snooze een email om deze later terug te zien</p>
                    </>
                  ) : filter !== 'alle' ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                        <CheckCheck className="w-7 h-7 text-emerald-500/40" />
                      </div>
                      <p className="text-sm font-medium">Alles bijgewerkt</p>
                      <p className="text-xs mt-1">Geen {filter === 'ongelezen' ? 'ongelezen' : filter === 'met-ster' ? 'emails met ster' : filter === 'vastgepind' ? 'vastgepinde emails' : 'emails met bijlagen'}</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Inbox className="w-7 h-7 opacity-30" />
                      </div>
                      <p className="text-sm font-medium">Geen emails</p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {threadedEmails.map((email, idx) => {
                    const senderAddr = email.map === 'verzonden' || email.map === 'concepten'
                      ? extractSenderEmail(email.aan)
                      : extractSenderEmail(email.van)

                    return (
                      <EmailListItem
                        key={email.id}
                        email={email}
                        isActive={selectedEmail?.id === email.id && viewMode === 'reading'}
                        isChecked={selection.checkedEmails.has(email.id)}
                        isFocused={keyboard.focusedIndex === idx}
                        hasChecked={selection.hasChecked}
                        fontSize={fontSize}
                        isUnknownContact={!findContactByEmail(senderAddr)}
                        onSelect={handleSelectEmail}
                        onToggleStar={emailActions.handleToggleStar}
                        onTogglePin={emailActions.handleTogglePin}
                        onToggleCheck={selection.toggleCheckEmail}
                        onSnooze={emailActions.handleSnooze}
                        onUnsnooze={emailActions.handleUnsnooze}
                        onQuickReply={handleQuickReply}
                        showSnoozeMenu={showSnoozeMenu === email.id}
                        onShowSnoozeMenu={setShowSnoozeMenu}
                      />
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ═══ Column 3: Content Area (reading/composing) + CRM Sidebar ═══ */}
          {viewMode !== 'idle' && (
            <div className="flex-1 min-w-0 flex">
              {/* Main content */}
              <div className="flex-1 min-w-0 flex flex-col">
                {viewMode === 'composing' ? (
                  <EmailCompose
                    open={viewMode === 'composing'}
                    onOpenChange={(isOpen) => { if (!isOpen) handleCancelCompose() }}
                    defaultTo={composeDefaults.to}
                    defaultSubject={composeDefaults.subject}
                    defaultBody={composeDefaults.body}
                    onSend={handleSendEmail}
                  />
                ) : viewMode === 'reading' && selectedEmail ? (
                  <EmailReader
                    email={selectedEmail}
                    isLoadingBody={isLoadingBody}
                    onToggleStar={emailActions.handleToggleStar}
                    onToggleRead={emailActions.handleToggleRead}
                    onDelete={emailActions.handleDelete}
                    onReply={handleReply}
                    onForward={handleForward}
                    onArchive={emailActions.handleArchive}
                    onBack={handleBack}
                    onCreateTask={handleCreateTaskFromEmail}
                  />
                ) : null}
              </div>

              {/* CRM Sidebar */}
              {showSidebar && (
                <div className="border-l hidden xl:block">
                  <ContactSidebar
                    contact={currentContact}
                    senderName={currentSenderName}
                    senderEmail={currentSenderEmail}
                    senderCompany={currentContact?.company}
                    emailSubject={selectedEmail?.onderwerp}
                    onAddCustomer={handleAddCustomer}
                    onSubscribeNewsletter={handleSubscribeNewsletter}
                    onCreateProject={handleCreateProjectFromEmail}
                    onCreateTask={handleQuickTaskFromEmail}
                    onCreateDeal={handleCreateDealFromEmail}
                    onNavigateToOfferte={handleNavigateToOfferte}
                    recentlyCreatedKlantId={recentlyCreatedKlantId}
                    width={280}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Desktop: When idle and no email selected, show welcome pane ── */}
          {viewMode === 'idle' && (
            <div className="flex-1 hidden lg:flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Mail className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-sm font-medium mb-1">Selecteer een email</p>
              <p className="text-xs">Klik op een email om deze te lezen</p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/50">
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">j</kbd>
                <span>/</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">k</kbd>
                <span>navigeer</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono ml-2">Enter</kbd>
                <span>open</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono ml-2">c</kbd>
                <span>nieuw</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Keyboard shortcut hint button */}
      <button
        onClick={() => keyboard.setShowShortcuts(true)}
        className="fixed bottom-4 right-4 w-8 h-8 rounded-full bg-muted border shadow-sm flex items-center justify-center hover:bg-muted/80 transition-colors z-40"
        title="Sneltoetsen (?)"
      >
        <Keyboard className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Keyboard shortcuts overlay */}
      {keyboard.showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => keyboard.setShowShortcuts(false)}>
          <div className="bg-popover rounded-lg border shadow-xl p-6 w-80 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sneltoetsen</h3>
              <button onClick={() => keyboard.setShowShortcuts(false)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{shortcut.action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono font-medium">{shortcut.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
