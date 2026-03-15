import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search, Pencil, Inbox, Send, FileEdit, Trash2, Star,
  Loader2, Clock, Archive, Mail, MailOpen, CheckCheck, X,
  Pin, AlarmClock, RefreshCw, Keyboard, Eye, Zap, BarChart3,
  Users, Tag, ChevronDown, Info, Paperclip, Timer, Check,
} from 'lucide-react'
import { createEmail, createKlant, createTaak, createProject, createDeal } from '@/services/supabaseService'
import { sendEmail as sendEmailViaApi } from '@/services/gmailService'
import { formatDateTime, cn, truncate, getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailCompose } from './EmailCompose'
import { ContactSidebar } from './ContactSidebar'
// Lazy load heavy tab components (only loaded when user clicks the tab)
const EmailTracking = lazy(() => import('./EmailTracking').then(m => ({ default: m.EmailTracking })))
const EmailSequences = lazy(() => import('./EmailSequences').then(m => ({ default: m.EmailSequences })))
const EmailAnalytics = lazy(() => import('./EmailAnalytics').then(m => ({ default: m.EmailAnalytics })))
const GedeeldeInboxLayout = lazy(() => import('./GedeeldeInboxLayout').then(m => ({ default: m.GedeeldeInboxLayout })))
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
import type { EmailFolder, FilterType, FontSize, EmailTab, ViewMode, NoReplyRange } from './emailTypes'
import {
  extractSenderName, extractSenderEmail,
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
  const [noReplyRange, setNoReplyRange] = useState<NoReplyRange>('0-3')
  const [showNoReplyDropdown, setShowNoReplyDropdown] = useState(false)
  const [mobileShowReader, setMobileShowReader] = useState(false)

  // Compose defaults (for reply/forward)
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string; subject?: string; body?: string
  }>({})

  // Recently created klant (for chaining: email → klant → project/deal)
  const [recentlyCreatedKlantId, setRecentlyCreatedKlantId] = useState<string | null>(null)

  // ── Hooks ──
  const {
    emails, setEmails, klanten, setKlanten,
    isLoading, isRefreshing, useIMAP, imapTotal, isLoadingBody,
    isLoadingMore, handleRefresh, handleFolderLoad, loadEmailBody,
    loadMoreEmails, user,
  } = useEmailData()

  const emailActions = useEmailActions({
    setEmails,
    setSelectedEmail,
    setViewMode,
  })

  const { filteredEmails, folderCounts, filterCounts, threadedEmails } = useEmailFilters(
    emails, selectedFolder, searchQuery, filter, noReplyRange
  )

  const selection = useEmailSelection({
    filteredEmails,
    setEmails,
  })

  // ── Contact lookup (pre-built Map for O(1) lookups) ──
  const contactMap = useMemo(() => {
    const map = new Map<string, EmailContact>()
    for (const klant of klanten) {
      const addEntry = (email: string, cp?: { naam?: string; telefoon?: string }) => {
        const clean = email.toLowerCase()
        if (!clean || map.has(clean)) return
        map.set(clean, {
          name: cp?.naam || klant.contactpersoon || klant.bedrijfsnaam || clean,
          email: clean,
          company: klant.bedrijfsnaam,
          phone: cp?.telefoon || klant.telefoon,
          klantId: klant.id,
          isCustomer: true,
          subscribedNewsletter: false,
          tags: klant.tags || [],
          notes: klant.notities,
        })
      }
      if (klant.email) addEntry(klant.email)
      if (klant.contactpersonen) {
        for (const cp of klant.contactpersonen) {
          if (cp.email) addEntry(cp.email, cp)
        }
      }
    }
    return map
  }, [klanten])

  const findContactByEmail = useCallback((emailAddr: string): EmailContact | null => {
    const clean = extractEmailAddress(emailAddr).toLowerCase()
    if (!clean) return null
    return contactMap.get(clean) || null
  }, [contactMap])

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

  // ── Emails for this contact (sent + received) ──
  const contactEmails = useMemo(() => {
    const addr = currentSenderEmail?.toLowerCase()
    if (!addr) return []
    return emails
      .filter((e) => {
        const from = extractSenderEmail(e.van).toLowerCase()
        const to = extractSenderEmail(e.aan).toLowerCase()
        return from === addr || to === addr
      })
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .map((e) => ({ id: e.id, onderwerp: e.onderwerp, datum: e.datum, map: e.map, van: e.van, aan: e.aan }))
  }, [emails, currentSenderEmail])

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
  const handleSendEmail = useCallback(async (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string }) => {
    const isScheduled = !!data.scheduledAt
    try {
      await sendEmailViaApi(data.to, data.subject, data.body, {
        html: data.html || data.body,
        scheduledAt: data.scheduledAt,
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
    const matchedContact = findContactByEmail(email.van)
    try {
      await createTaak({
        user_id: user?.id || '',
        project_id: '',
        klant_id: matchedContact?.klantId || recentlyCreatedKlantId || '',
        titel: description,
        beschrijving: `Aangemaakt vanuit email: "${email.onderwerp}"\nVan: ${email.van}\nDatum: ${email.datum}\nEmail ID: ${email.id}`,
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
  }, [user, findContactByEmail, recentlyCreatedKlantId])

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
    const matchedContact = selectedEmail ? findContactByEmail(selectedEmail.van) : null
    try {
      await createTaak({
        user_id: user?.id || '',
        project_id: '',
        klant_id: matchedContact?.klantId || recentlyCreatedKlantId || '',
        titel: data.titel,
        beschrijving: data.beschrijving + (selectedEmail ? `\n\nVanuit email: "${selectedEmail.onderwerp}"\nEmail ID: ${selectedEmail.id}` : ''),
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
  }, [user?.id, selectedEmail, findContactByEmail, recentlyCreatedKlantId])

  const handleNavigateToOfferte = useCallback((_klantId?: string) => {
    window.location.hash = '#/offertes/nieuw'
    toast.info('Ga naar Offertes om een nieuwe offerte te maken')
  }, [])

  // Close no-reply dropdown on outside click
  useEffect(() => {
    if (!showNoReplyDropdown) return
    const handleClick = () => setShowNoReplyDropdown(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showNoReplyDropdown])

  // ── Computed ──
  // Mobile-aware select handler wrapper
  const handleSelectEmailMobile = useCallback((email: Email) => {
    handleSelectEmail(email)
    setMobileShowReader(true)
  }, [handleSelectEmail])

  const handleBackMobile = useCallback(() => {
    handleBack()
    setMobileShowReader(false)
  }, [handleBack])

  // ═════════════════════════════════════════════════════════════════
  // ─── Render ────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col mod-strip mod-strip-email">
      {/* ── Minimal Header ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-stone-200/60 dark:border-stone-800/40 bg-background flex-shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8BAFD4, #6A8DB8)' }}>
            <Mail className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#1a1a1a] dark:text-stone-100 truncate">Email</h1>
          </div>
        </div>
        {/* Module tabs — compact, right-aligned */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {([
            { id: 'email' as EmailTab, label: 'Email', icon: Mail },
            { id: 'gedeelde-inbox' as EmailTab, label: 'Team Inbox', icon: Users },
            { id: 'tracking' as EmailTab, label: 'Tracking', icon: Eye },
            { id: 'sequences' as EmailTab, label: 'Sequences', icon: Zap },
            { id: 'analytics' as EmailTab, label: 'Analytics', icon: BarChart3 },
          ]).map((tab) => {
            const TabIcon = tab.icon
            const isActiveTab = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all whitespace-nowrap',
                  isActiveTab
                    ? 'bg-[#1a1a1a] text-white dark:bg-stone-200 dark:text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300'
                )}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab Content (non-email tabs) ── */}
      {activeTab === 'gedeelde-inbox' ? (
        <Suspense fallback={<Card className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Card>}>
          <GedeeldeInboxLayout />
        </Suspense>
      ) : activeTab === 'tracking' ? (
        <Suspense fallback={<Card className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Card>}>
          <EmailTracking emails={emails} />
        </Suspense>
      ) : activeTab === 'sequences' ? (
        <Suspense fallback={<Card className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Card>}>
          <EmailSequences />
        </Suspense>
      ) : activeTab === 'analytics' ? (
        <Suspense fallback={<Card className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></Card>}>
          <EmailAnalytics emails={emails} />
        </Suspense>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           Superhuman 3-Panel Layout:
           Panel 1: Sidebar (200px) — folders, labels, compose
           Panel 2: Email list (flex) — always visible on desktop
           Panel 3: Reader (45%) — always visible on desktop, empty state when idle
           Mobile: stacked list → reader navigation
           ═══════════════════════════════════════════════════════════════ */
        <Card className="flex-1 flex overflow-hidden border-stone-200/60 dark:border-stone-800/40">

          {/* ═══ Panel 1: Sidebar ═══ */}
          <div className={cn(
            'border-r border-stone-200/60 dark:border-stone-800/40 flex-shrink-0 flex flex-col bg-stone-50/40 dark:bg-stone-900/30',
            'hidden md:flex w-[200px]'
          )}>
            {/* Compose button — black, full width, primary action */}
            <div className="p-3 sticky top-0 z-10">
              <button
                onClick={handleCompose}
                className="w-full flex items-center justify-center gap-2 h-10 bg-[#1a1a1a] dark:bg-stone-100 text-white dark:text-stone-900 rounded-md text-sm font-semibold hover:bg-[#2a2a2a] dark:hover:bg-stone-200 transition-colors shadow-sm"
              >
                <Pencil className="w-4 h-4" />
                Nieuw
              </button>
            </div>

            {/* Folder list */}
            <nav className="flex-1 px-2 overflow-y-auto">
              {folderTabs.map((tab) => {
                const isActiveFolder = selectedFolder === tab.id
                const count = folderCounts[tab.id]
                const FolderIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleFolderChange(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-all duration-100 mb-0.5',
                      isActiveFolder
                        ? 'bg-stone-100/80 dark:bg-stone-800/60 text-[#1a1a1a] dark:text-stone-100 font-medium border-l-2 border-l-[#8BAFD4] -ml-px pl-[11px]'
                        : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100/50 dark:hover:bg-stone-800/30 hover:text-stone-700 dark:hover:text-stone-300'
                    )}
                  >
                    <FolderIcon className={cn('w-[18px] h-[18px] flex-shrink-0', isActiveFolder ? 'text-stone-600 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500')} />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        'text-[10px] font-medium min-w-[20px] h-[20px] rounded-full flex items-center justify-center tabular-nums font-mono',
                        isActiveFolder
                          ? 'bg-[#8BAFD4] text-white'
                          : 'bg-stone-200/60 dark:bg-stone-700/60 text-stone-500 dark:text-stone-400'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Labels section */}
            <div className="border-t border-stone-100 dark:border-stone-800/40 mt-4 pt-4 px-3 pb-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Tag className="w-3 h-3 text-stone-400" />
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.08em]">Labels</span>
              </div>
              {[
                { id: 'offerte', color: 'bg-[#D5CCE6]' },
                { id: 'klant', color: 'bg-[#BCCAD6]' },
                { id: 'project', color: 'bg-[#B8CCBE]' },
                { id: 'leverancier', color: 'bg-[#E8866A]' },
              ].map(({ id: label, color }) => {
                const labelCount = emails.filter((e) => e.labels.includes(label)).length
                const isActiveLabel = searchQuery === `label:${label}`
                return (
                  <button
                    key={label}
                    onClick={() => setSearchQuery(isActiveLabel ? '' : `label:${label}`)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] transition-all duration-100',
                      isActiveLabel
                        ? 'bg-stone-100/80 dark:bg-stone-800/60 text-[#1a1a1a] dark:text-stone-100 font-medium'
                        : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100/40 dark:hover:bg-stone-800/20 hover:text-stone-700 dark:hover:text-stone-300'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', color)} />
                    <span className="flex-1 text-left capitalize">{label}</span>
                    {labelCount > 0 && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums font-mono">{labelCount}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ═══ Panel 2: Email List — ALWAYS visible on desktop ═══ */}
          <div className={cn(
            'flex flex-col min-w-0 border-r border-stone-200/60 dark:border-stone-800/40',
            // On desktop: fixed width for list, reader takes remaining
            'md:w-[380px] lg:w-[420px] md:flex-shrink-0',
            // On mobile: full width, hidden when viewing reader
            mobileShowReader ? 'hidden md:flex' : 'flex-1 md:flex-initial'
          )}>
            {/* Search bar */}
            <div className="p-3 flex items-center gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchHelp(true)}
                  onBlur={() => setTimeout(() => setShowSearchHelp(false), 200)}
                  placeholder="Zoek in emails..."
                  className="pl-10 pr-8 h-9 bg-stone-50/50 dark:bg-stone-800/30 border-stone-200/60 dark:border-stone-700/40 rounded-md focus:bg-white dark:focus:bg-stone-900 focus:ring-[#8BAFD4]/30 focus:border-[#8BAFD4]/50 transition-all text-sm placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <X className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                )}
                {/* Search operators help dropdown */}
                {showSearchHelp && !searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md shadow-lg p-3 z-50">
                    <p className="text-xs font-medium text-stone-500 mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Geavanceerd zoeken
                    </p>
                    <div className="space-y-1">
                      {SEARCH_OPERATORS.map((op) => (
                        <button
                          key={op.key}
                          onClick={() => { setSearchQuery(op.key); setShowSearchHelp(false) }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-left"
                        >
                          <code className="font-mono text-[#8BAFD4] bg-[#8BAFD4]/10 px-1.5 py-0.5 rounded text-[11px]">{op.key}</code>
                          <span className="text-stone-500">{op.description}</span>
                          <span className="ml-auto text-stone-400 font-mono text-[10px]">{op.example}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Geen antwoord filter */}
              <div className="relative flex-shrink-0 hidden sm:block">
                <button
                  onClick={() => {
                    if (filter === 'geen-antwoord') {
                      setFilter('alle')
                    } else {
                      setFilter('geen-antwoord')
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[12px] font-medium transition-all border',
                    filter === 'geen-antwoord'
                      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                      : 'bg-white dark:bg-stone-900 border-stone-200/60 dark:border-stone-700/40 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300'
                  )}
                >
                  <Timer className="w-3.5 h-3.5" />
                  {filter === 'geen-antwoord' ? (
                    <ChevronDown
                      className="w-3 h-3 opacity-60 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setShowNoReplyDropdown(!showNoReplyDropdown) }}
                    />
                  ) : null}
                </button>
                {filter === 'geen-antwoord' && (
                  <button
                    onClick={() => setFilter('alle')}
                    className="ml-1 p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 transition-colors"
                    title="Filter verwijderen"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* No-reply range dropdown */}
                {showNoReplyDropdown && filter === 'geen-antwoord' && (
                  <div className="absolute top-full right-0 mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md shadow-lg p-1.5 z-50 min-w-[220px]">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2.5 py-1.5">
                      Je hebt geen antwoord gestuurd:
                    </p>
                    {([
                      { value: '0-3' as NoReplyRange, label: 'Gedurende 0-3 dagen' },
                      { value: '4-7' as NoReplyRange, label: 'Gedurende 4-7 dagen' },
                      { value: '8-30' as NoReplyRange, label: 'Gedurende 8-30 dagen' },
                    ]).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => { setNoReplyRange(option.value); setShowNoReplyDropdown(false) }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[13px] transition-colors text-left',
                          noReplyRange === option.value
                            ? 'font-medium text-[#1a1a1a] dark:text-stone-100 bg-stone-50 dark:bg-stone-800'
                            : 'text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300'
                        )}
                      >
                        {option.label}
                        {noReplyRange === option.value && <Check className="w-4 h-4 text-[#8BAFD4]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleRefresh(selectedFolder)}
                size="sm"
                variant="outline"
                className="h-9 w-9 flex-shrink-0 p-0 border-stone-200/60 dark:border-stone-700/40 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                disabled={isRefreshing}
                title="Vernieuwen"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
              </Button>
              {/* Mobile compose button */}
              <button
                onClick={handleCompose}
                className="h-9 w-9 flex-shrink-0 flex items-center justify-center bg-[#1a1a1a] text-white rounded-md md:hidden hover:bg-[#2a2a2a] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile folder tabs */}
            <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-hide md:hidden flex-shrink-0">
              {folderTabs.map((tab) => {
                const isActiveFolder = selectedFolder === tab.id
                const count = folderCounts[tab.id]
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleFolderChange(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                      isActiveFolder
                        ? 'bg-[#8BAFD4]/15 text-[#6A8DB8] dark:bg-[#8BAFD4]/20 dark:text-[#8BAFD4]'
                        : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300'
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {count > 0 && (
                      <span className={cn(
                        'text-[10px] font-medium min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-mono',
                        isActiveFolder ? 'bg-[#8BAFD4] text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Filter pills */}
            <div className="px-3 pb-2 flex items-center justify-between border-b border-stone-100 dark:border-stone-800/40 flex-shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {(['alle', 'ongelezen', 'met-ster', 'vastgepind', 'bijlagen'] as FilterType[]).map((f) => {
                  const labels: Record<string, string> = {
                    alle: 'Alle',
                    ongelezen: 'Ongelezen',
                    'met-ster': 'Met ster',
                    vastgepind: 'Vastgepind',
                    bijlagen: 'Bijlagen',
                  }
                  const count = filterCounts[f] || 0
                  const isActiveFilter = filter === f
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-100',
                        isActiveFilter
                          ? 'bg-[#8BAFD4] text-white shadow-sm'
                          : 'bg-stone-100/60 dark:bg-stone-800/40 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300'
                      )}
                    >
                      {labels[f]}
                      {f !== 'alle' && count > 0 && (
                        <span className={cn(
                          'text-[9px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center tabular-nums font-mono',
                          isActiveFilter ? 'bg-white/25 text-white' : 'bg-stone-200/60 dark:bg-stone-700/60 text-stone-500 dark:text-stone-400'
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Bulk action toolbar */}
            {selection.hasChecked ? (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-100 dark:border-stone-800/40 bg-stone-50 dark:bg-stone-900/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selection.allChecked ? true : selection.someChecked ? 'indeterminate' : false}
                    onCheckedChange={selection.toggleCheckAll}
                  />
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                    {selection.checkedEmails.size} geselecteerd
                  </span>
                </div>
                <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1" />
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={selection.handleBulkMarkRead}>
                  <MailOpen className="w-3.5 h-3.5" /> Gelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={selection.handleBulkMarkUnread}>
                  <Mail className="w-3.5 h-3.5" /> Ongelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800" onClick={selection.handleBulkArchive}>
                  <Archive className="w-3.5 h-3.5" /> Archiveren
                </Button>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={selection.handleBulkDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Verwijderen
                </Button>
                <div className="flex-1" />
                <button onClick={selection.clearChecked} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-stone-100/60 dark:border-stone-800/30 flex-shrink-0">
                <Checkbox
                  checked={false}
                  onCheckedChange={selection.toggleCheckAll}
                  className="opacity-40 hover:opacity-100 transition-opacity"
                />
                <button onClick={selection.toggleCheckAll} className="text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors cursor-pointer">
                  Alles selecteren
                </button>
                <span className="text-[11px] text-stone-400 ml-auto tabular-nums font-mono">
                  {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Email list */}
            <ScrollArea className="flex-1">
              {isLoading ? (
                /* Skeleton loading — 5 rows matching 3-line format */
                <div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 px-4 py-3 min-h-[72px] border-b border-stone-100 dark:border-stone-800/40">
                      <div className="w-5 flex-shrink-0 pt-1">
                        <div className="w-2 h-2 rounded-full animate-shimmer" />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-28 rounded animate-shimmer" />
                          <div className="flex-1" />
                          <div className="h-3 w-12 rounded animate-shimmer" />
                        </div>
                        <div className="h-4 rounded animate-shimmer" style={{ width: `${50 + Math.random() * 30}%` }} />
                        <div className="h-3 rounded animate-shimmer" style={{ width: `${60 + Math.random() * 30}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  {selectedFolder === 'gepland' ? (
                    <>
                      <Clock className="w-16 h-16 text-stone-300 dark:text-stone-600 mb-4" />
                      <p className="text-base text-stone-400 dark:text-stone-500">Geen ingeplande emails</p>
                      <p className="text-sm mt-1 text-stone-400/60 dark:text-stone-500/60">Plan een email in bij het verzenden</p>
                    </>
                  ) : selectedFolder === 'gesnoozed' ? (
                    <>
                      <AlarmClock className="w-16 h-16 text-stone-300 dark:text-stone-600 mb-4" />
                      <p className="text-base text-stone-400 dark:text-stone-500">Geen gesnoozede emails</p>
                    </>
                  ) : filter === 'geen-antwoord' ? (
                    <>
                      <CheckCheck className="w-16 h-16 text-stone-300 dark:text-stone-600 mb-4" />
                      <p className="text-base text-stone-400 dark:text-stone-500">Alles beantwoord</p>
                    </>
                  ) : filter !== 'alle' ? (
                    <>
                      <CheckCheck className="w-16 h-16 text-stone-300 dark:text-stone-600 mb-4" />
                      <p className="text-base text-stone-400 dark:text-stone-500">Alles bijgewerkt</p>
                    </>
                  ) : (
                    <>
                      <Inbox className="w-16 h-16 text-stone-300 dark:text-stone-600 mb-4" />
                      <p className="text-lg text-stone-400 dark:text-stone-500">Inbox is leeg</p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {threadedEmails.map((email, idx) => {
                    const senderAddr = email.map === 'verzonden' || email.map === 'concepten'
                      ? extractSenderEmail(email.aan)
                      : extractSenderEmail(email.van)
                    const contact = findContactByEmail(senderAddr)

                    return (
                      <EmailListItem
                        key={email.id}
                        email={email}
                        isActive={selectedEmail?.id === email.id}
                        isChecked={selection.checkedEmails.has(email.id)}
                        isFocused={keyboard.focusedIndex === idx}
                        hasChecked={selection.hasChecked}
                        fontSize={fontSize}
                        isUnknownContact={!contact}
                        isCrmMatched={!!contact}
                        onSelect={handleSelectEmailMobile}
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
                  {/* Load more */}
                  {useIMAP && emails.length < imapTotal && (
                    <div className="p-3 text-center border-t border-stone-100 dark:border-stone-800/40">
                      <button
                        onClick={() => loadMoreEmails(selectedFolder)}
                        disabled={isLoadingMore}
                        className="text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                      >
                        {isLoadingMore ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Laden...</>
                        ) : (
                          <>Meer laden ({emails.length} van {imapTotal})</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ═══ Panel 3: Reader — ALWAYS visible on desktop ═══ */}
          <div className={cn(
            'flex-1 min-w-0 flex flex-col',
            // Mobile: only show when reading
            mobileShowReader ? 'flex' : 'hidden md:flex'
          )}>
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
                onBack={handleBackMobile}
                onCreateTask={handleCreateTaskFromEmail}
              />
            ) : (
              /* Empty state — no email selected */
              <div className="flex-1 flex flex-col items-center justify-center text-stone-400 dark:text-stone-500">
                <Mail className="w-16 h-16 text-stone-300 dark:text-stone-600 mb-4" />
                <p className="text-base">Selecteer een email</p>
                <p className="text-sm mt-1 text-stone-400/60">of druk <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-xs font-mono font-medium text-stone-500">c</kbd> voor een nieuwe email</p>
              </div>
            )}
          </div>

        </Card>
      )}

      {/* Keyboard shortcut hint */}
      <button
        onClick={() => keyboard.setShowShortcuts(true)}
        className="fixed bottom-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-sm flex items-center justify-center hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors z-40"
        title="Sneltoetsen (?)"
      >
        <Keyboard className="w-4 h-4 text-stone-400" />
      </button>

      {/* Keyboard shortcuts overlay */}
      {keyboard.showShortcuts && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => keyboard.setShowShortcuts(false)}>
          <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 shadow-xl p-6 w-80 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1a1a1a] dark:text-stone-100">Sneltoetsen</h3>
              <button onClick={() => keyboard.setShowShortcuts(false)} className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800">
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 dark:text-stone-400">{shortcut.action}</span>
                  <kbd className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-xs font-mono font-medium text-stone-600 dark:text-stone-300">{shortcut.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
