import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import {
  Search, Pencil, Inbox, Send, FileEdit, Trash2,
  Loader2, Archive, RefreshCw, CheckCheck, X, Mail, MailOpen,
  Rows3, StretchHorizontal, Clock, Moon, Menu, Edit3, ChevronLeft, Target,
} from 'lucide-react'
import { IngeplandeBerichtenLijst } from './IngeplandeBerichtenLijst'
import { LeadsPaneel } from './LeadsPaneel'
import { sendEmail as sendEmailViaApi, fetchEmailsFromIMAP, readEmailFromIMAP, backfillEmailsFromIMAP } from '@/services/gmailService'
import { getEmails, getEmailBody, searchEmailsFTS, updateEmail, deleteEmail as deleteEmailDb } from '@/services/supabaseService'
import { getCached, setCached } from '@/lib/queryCache'
import { getSalesInboxWachtend, getSalesInboxBeantwoord, markeerHandmatigBeantwoord, wisWachtFlag, terugZettenNaarWacht, getEmailsPage, getMapTellers } from '@/services/emailService'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailContextSidebar } from './EmailContextSidebar'
import { koppelEmailAanProject } from '@/services/emailProjectService'
import { updateLeadStatus } from '@/services/leadsService'
import { EmailCompose } from './EmailCompose'
import type { ComposeActions } from './EmailCompose'
import { EmailListItem } from './EmailListItem'
import { EmailMobileTopBar } from './EmailMobileTopBar'
import { EmailFocusKaart } from './EmailFocusKaart'
import type { Email, EmailAttachment } from '@/types'
import { logger } from '../../utils/logger'
import type { EmailFolder, FilterType, FontSize, ViewMode } from './emailTypes'
import { extractSenderEmail, extractSenderName, parseSearchQuery, IMAP_FOLDER_MAP, KEYBOARD_SHORTCUTS, SEARCH_OPERATORS, SNOOZE_OPTIONS, calculateSnoozeDate, getAvatarStyle, formatRelativeSync } from './emailHelpers'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { Skeleton } from '@/components/ui/skeleton'
import { hapticLight } from '@/utils/haptic'
import { viewTransition } from '@/utils/viewTransition'

// Folder config
const folderTabs: { id: EmailFolder; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'verzonden', label: 'Verzonden', icon: Send },
  { id: 'sales-wacht', label: 'Opvolgen', icon: Clock },
  { id: 'sales-beantwoord', label: 'Beantwoord', icon: CheckCheck },
  { id: 'gesnoozed', label: 'Gesnoozed', icon: Moon },
  { id: 'concepten', label: 'Concepten', icon: FileEdit },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

// Filter config
const filtersList: { id: FilterType; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'ongelezen', label: 'Ongelezen' },
  { id: 'vastgepind', label: 'Vastgepind' },
  { id: 'bijlagen', label: 'Bijlagen' },
]

const folderIds: EmailFolder[] = ['inbox', 'verzonden', 'concepten', 'gepland', 'gesnoozed', 'prullenbak', 'sales-wacht', 'sales-beantwoord', 'leads']

// Mobile drawer surfaces these two as primary; the rest sits below a divider.
const PRIMARY_FOLDER_IDS = new Set<EmailFolder>(['inbox', 'sales-wacht'])

// Mappen die in de DB (kolom `map`) leven en dus DB-gepagineerd kunnen
// worden; afgeleide mappen (sales/gesnoozed/gepland) filteren client-side.
const DB_MAP_FOLDERS: Partial<Record<EmailFolder, string>> = {
  inbox: 'inbox',
  verzonden: 'verzonden',
  concepten: 'concepten',
  prullenbak: 'prullenbak',
}

export function EmailLayout() {
  const { user } = useAuth()
  const { emailFetchLimit } = useAppSettings()

  // ─── Core state ───
  const [emails, setEmails] = useState<Email[]>(() => getCached<Email[]>('emails') ?? [])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [viewMode, setViewMode] = useState<ViewMode>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 5s undo-buffer voor delete: pending DB-mutaties worden hier vastgehouden
  // zodat undo-toast de mutatie kan annuleren. Flush (= alsnog uitvoeren)
  // op unmount, anders zou de UI-delete niet persisten.
  const pendingDeleteTimersRef = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; flush: () => void }>>(new Map())
  const [searchResults, setSearchResults] = useState<Email[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [filter, setFilter] = useState<FilterType>('alle')
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const stored = localStorage.getItem('doen_email_font_size')
      if (stored === 'small' || stored === 'medium' || stored === 'large') return stored
    } catch { /* localStorage geblokkeerd, val terug op default */ }
    return 'medium'
  })
  useEffect(() => {
    try { localStorage.setItem('doen_email_font_size', fontSize) } catch { /* no-op */ }
  }, [fontSize])
  // Density-toggle: 'inline' = 3-regel ruim, 'stacked' = 1-regel compact.
  // Persistente keuze via localStorage zodat refresh de selectie behoudt.
  const [listStyle, setListStyle] = useState<'inline' | 'stacked'>(() => {
    try {
      const stored = localStorage.getItem('doen_email_list_style')
      if (stored === 'inline' || stored === 'stacked') return stored
    } catch { /* no-op */ }
    return 'inline'
  })
  useEffect(() => {
    try { localStorage.setItem('doen_email_list_style', listStyle) } catch { /* no-op */ }
  }, [listStyle])

  const [listWidth, setListWidth] = useState<number>(() => {
    try {
      const stored = parseInt(localStorage.getItem('doen_email_list_width') || '', 10)
      if (stored >= 280 && stored <= 640) return stored
    } catch { /* no-op */ }
    return 360
  })
  useEffect(() => {
    try { localStorage.setItem('doen_email_list_width', String(listWidth)) } catch { /* no-op */ }
  }, [listWidth])
  // Sidebar is ephemeral: opent alleen wanneer een actie in de drie-puntjes
  // dropdown wordt geklikt (Klant/Project/Taak aanmaken). Geen localStorage
  // persistentie · anders zou hij open blijven na refresh zodra je 'm één
  // keer hebt geopend, wat de hele point van "dropdown ipv sidebar" tegenwerkt.
  const [contextOpen, setContextOpen] = useState<boolean>(false)

  // Acties-dropdown rechtsboven in reader: trigger om de context-sidebar te
  // openen op een specifiek panel (Klant/Project/Taak aanmaken) of voor
  // project-koppeling (default panel met EmailProjectKoppelingPanel).
  // Versie-counter forceert remount zodat herhaalde clicks hetzelfde panel
  // opnieuw openen.
  const [requestedPanel, setRequestedPanel] = useState<'klant' | 'project' | 'taak' | undefined>(undefined)
  const [panelKey, setPanelKey] = useState(0)
  const handleOpenContextPanel = useCallback((panel: 'klant' | 'project' | 'taak' | 'koppel') => {
    // 'koppel' = sidebar openen op default panel ('none') waar de auto-search
    // project-koppeling panel verschijnt voor reading-mode threads.
    setRequestedPanel(panel === 'koppel' ? undefined : panel)
    setPanelKey(k => k + 1)
    setContextOpen(true)
  }, [])

  // Belt-and-suspenders: forceer sidebar dicht bij elke mount, ongeacht of
  // er nog state-residue is uit Fast Refresh of een eerdere mount-iteratie.
  // Zonder dit hield Vite's HMR de oude contextOpen=true vast ondanks
  // useState(false) in de declaratie.
  useEffect(() => {
    setContextOpen(false)
    setRequestedPanel(undefined)
  }, [])
  const handleListResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = listWidth
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const handleMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.max(320, Math.min(640, startWidth + (ev.clientX - startX)))
      setListWidth(newWidth)
    }
    const handleMouseUp = () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [listWidth])
  const [focusModus, setFocusModus] = useState<boolean>(() => {
    try { return localStorage.getItem('doen_email_focus_modus') === 'true' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('doen_email_focus_modus', String(focusModus)) } catch { /* no-op */ }
  }, [focusModus])
  const [folderDrawerOpen, setFolderDrawerOpen] = useState(false)

  // ─── Loading state ───
  const [isLoading, setIsLoading] = useState(() => getCached('emails') === undefined)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [isLoadingBody, setIsLoadingBody] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [useIMAP, setUseIMAP] = useState(false)
  const [imapTotal, setImapTotal] = useState(0)

  // ─── Compose state ───
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string; subject?: string; body?: string; bodyIsBericht?: boolean; replyToText?: string
  }>({})
  const [composeProjectId, setComposeProjectId] = useState<string | null>(null)
  // Ref-mirror zodat handleSendEmail (lege deps) de actuele waarde leest
  const composeProjectIdRef = useRef<string | null>(null)
  composeProjectIdRef.current = composeProjectId
  // Lead waarvoor deze mail wordt opgesteld; na verzenden gaat die op benaderd.
  const [composeLeadId, setComposeLeadId] = useState<string | null>(null)
  const [benaderdeLeadId, setBenaderdeLeadId] = useState<string | null>(null)
  const composeLeadIdRef = useRef<string | null>(null)
  composeLeadIdRef.current = composeLeadId

  // ─── Compose-sidebar communication ───
  const [composeToAddress, setComposeToAddress] = useState('')
  const [composeReminder, setComposeReminder] = useState<string | null>(null)
  const [composeForgieLoading, setComposeForgieLoading] = useState(false)
  const composeActionsRef = useRef<ComposeActions | null>(null)

  // ─── Sales Inbox v1: aparte data-bron voor de twee sales-tabs ───
  const [salesEmails, setSalesEmails] = useState<Email[]>([])
  const [salesBannerDismissed, setSalesBannerDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem('doen_email_sales_inbox_banner_v1') === 'dismissed' } catch { return false }
  })
  const [salesTabSeen, setSalesTabSeen] = useState<boolean>(() => {
    try { return localStorage.getItem('doen_email_sales_tab_seen_v1') === 'true' } catch { return false }
  })

  // ─── Location-based compose detection ───
  const location = useLocation()
  const navigate = useNavigate()
  // Mobile always uses the spacious two-line row layout regardless of the
  // user's persisted listStyle preference (which only governs desktop).
  const isDesktop = useMediaQuery('(min-width: 768px)')
  useEffect(() => {
    if (location.pathname.endsWith('/email/compose')) {
      const params = new URLSearchParams(location.search)
      setComposeDefaults({
        to: params.get('to') || undefined,
        subject: params.get('subject') || undefined,
        body: params.get('body') || undefined,
        bodyIsBericht: true,
      })
      setComposeLeadId(null)
      setViewMode('composing')
    }
  }, [location.pathname, location.search])

  // ─── Selection state (bulk actions) ───
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set())
  const lastCheckedIdRef = useRef<string | null>(null)

  // ─── Keyboard state ───
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ─── Refs ───
  const emailListRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bodyCacheRef = useRef<Map<string, string>>(new Map())
  const attachmentCacheRef = useRef<Map<string, EmailAttachment[]>>(new Map())
  // Inline image-bytes meegestuurd door /api/read-email (cold-pad first-open).
  // Bewaard per email-id zodat EmailReader meteen thumbnails kan tonen
  // zonder tweede IMAP-roundtrip naar /api/email-attachment.
  const attachmentBytesCacheRef = useRef<Map<string, Record<string, string>>>(new Map())
  // Signed URLs uit de persistent attachment-cache (sprint 3). Snelst van
  // alledrie: direct als <img src>, geen base64-decode of bulk-fetch nodig.
  const attachmentUrlsCacheRef = useRef<Map<string, Record<string, string>>>(new Map())

  const fetchLimit = emailFetchLimit || 200

  // Refs for values used in loadEmails · prevents effect re-runs on auth/settings changes
  const userIdRef = useRef(user?.id)
  userIdRef.current = user?.id
  const fetchLimitRef = useRef(fetchLimit)
  fetchLimitRef.current = fetchLimit

  // ─── Ensure emails from Supabase have required fields ───
  function normalizeEmails(raw: Email[]): Email[] {
    return raw.map(e => ({
      ...e,
      labels: e.labels ?? [],
      pinned: e.pinned ?? false,
      gmail_id: e.gmail_id || String((e as unknown as Record<string, unknown>).uid || e.id),
    }))
  }

  // ─── Read emails from Supabase (fast, no IMAP needed) ───
  async function readFromSupabase(): Promise<Email[]> {
    const raw = await getEmails(fetchLimitRef.current).catch(() => [])
    const normalized = normalizeEmails(raw)
    setCached('emails', normalized)
    return normalized
  }

  // ─── Trigger IMAP sync (background, writes to Supabase) ───
  // Incrementele sync levert max ~600 nieuwe mails per call (oudste eerst);
  // bij een grote achterstand geeft de API `remaining` terug en halen we
  // door tot alles binnen is (met een ruime veiligheidsgrens).
  async function triggerImapSync(folder: string): Promise<{ total: number; synced: number }> {
    let total = 0
    let synced = 0
    for (let i = 0; i < 10; i++) {
      const result = await fetchEmailsFromIMAP(folder, fetchLimitRef.current, 0)
      if (result.errors) {
        logger.warn('[Email] Sync errors:', result.errors)
      }
      total = result.total || 0
      synced += result.synced || 0
      if (!result.remaining || result.remaining <= 0) break
    }
    return { total, synced }
  }

  // ─── Historie-backfill: rustig op de achtergrond oudere mail binnenhalen ───
  // Max 8 batches (±2400 mails) per map per sessie, met pauze tussen batches
  // zodat de IMAP-server en de UI er geen last van hebben. Stopt vanzelf op
  // backfill_done (cutoff bereikt of UID 1) of als de state nog niet klaar is.
  const backfillStartedRef = useRef(false)
  const runBackfillAchtergrond = useCallback(async () => {
    if (backfillStartedRef.current) return
    backfillStartedRef.current = true
    let opgehaald = 0
    try {
      for (const map of ['inbox', 'verzonden']) {
        for (let i = 0; i < 8; i++) {
          const r = await backfillEmailsFromIMAP(map)
          opgehaald += r.synced || 0
          if (r.done || r.pending) break
          await new Promise((rust) => setTimeout(rust, 1500))
        }
      }
      if (opgehaald > 0) {
        const fresh = await readFromSupabase()
        if (fresh.length > 0) setEmails(fresh)
        logger.log(`[Email] Backfill: ${opgehaald} oudere mails binnengehaald`)
      }
    } catch (err) {
      logger.warn('[Email] Backfill gestopt:', err instanceof Error ? err.message : err)
    }
  }, [])

  // ─── Initial load: Supabase first, then IMAP sync in background ───
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    async function init() {
      try {
        // Step 1: Try reading from Supabase (instant)
        const dbEmails = await readFromSupabase()
        if (dbEmails.length > 0) {
          setEmails(dbEmails)
          setIsLoading(false)
          // Step 2: Background IMAP sync for fresh data
          triggerImapSync('INBOX')
            .then(async ({ total, synced }) => {
              logger.log(`[Email] Sync klaar: ${synced} gesynct, ${total} totaal`)
              setImapTotal(total)
              setUseIMAP(true)
              // Re-read from Supabase after sync
              const fresh = await readFromSupabase()
              if (fresh.length > 0) setEmails(fresh)
              void runBackfillAchtergrond()
            })
            .catch((err) => {
              logger.warn('[Email] Achtergrond IMAP sync mislukt:', err?.message || err)
            })
          return
        }

        // Step 1b: No Supabase data · need to wait for IMAP sync
        try {
          const { total } = await triggerImapSync('INBOX')
          setImapTotal(total)
          setUseIMAP(true)
          // Read synced emails from Supabase
          const synced = await readFromSupabase()
          setEmails(synced)
          void runBackfillAchtergrond()
        } catch (err) {
          logger.error('IMAP sync failed:', err)
          setUseIMAP(false)
        }
      } finally {
        // ALWAYS stop the spinner, no matter what happened
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // ─── Sales Inbox v1: laad data wanneer een sales-tab wordt geopend ───
  // RLS scope't automatisch op de huidige user via de anon-client.
  const loadSalesEmails = useCallback(async (folder: EmailFolder) => {
    try {
      const data = folder === 'sales-wacht'
        ? await getSalesInboxWachtend()
        : folder === 'sales-beantwoord'
          ? await getSalesInboxBeantwoord()
          : []
      setSalesEmails(data)
    } catch (err) {
      logger.error('Sales Inbox laden mislukt:', err)
      setSalesEmails([])
    }
  }, [])

  useEffect(() => {
    if (selectedFolder === 'sales-wacht' || selectedFolder === 'sales-beantwoord') {
      loadSalesEmails(selectedFolder)
    }
  }, [selectedFolder, loadSalesEmails])

  // ─── Server-side full-text search (gepagineerd, 50 per keer) ───
  const SEARCH_PAGE_SIZE = 50
  const searchHasMoreRef = useRef(false)
  const searchLoadingMoreRef = useRef(false)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      searchHasMoreRef.current = false
      return
    }
    let cancelled = false
    setIsSearching(true)
    searchEmailsFTS(searchQuery, SEARCH_PAGE_SIZE, 0).then(results => {
      if (!cancelled) {
        setSearchResults(results as Email[])
        searchHasMoreRef.current = results.length === SEARCH_PAGE_SIZE
        setIsSearching(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setSearchResults(null)
        searchHasMoreRef.current = false
        setIsSearching(false)
      }
    })
    return () => { cancelled = true }
  }, [searchQuery])

  // Volgende pagina zoekresultaten (scroll naar onderen tijdens zoeken)
  const loadMoreSearchResults = useCallback(async () => {
    if (!searchQuery.trim() || !searchHasMoreRef.current || searchLoadingMoreRef.current) return
    searchLoadingMoreRef.current = true
    try {
      const offset = searchResults?.length ?? 0
      const page = await searchEmailsFTS(searchQuery, SEARCH_PAGE_SIZE, offset)
      searchHasMoreRef.current = page.length === SEARCH_PAGE_SIZE
      if (page.length > 0) {
        setSearchResults(prev => {
          const bekend = new Set((prev ?? []).map(e => e.id))
          return [...(prev ?? []), ...(page as Email[]).filter(e => !bekend.has(e.id))]
        })
      }
    } catch (err) {
      logger.warn('Meer zoekresultaten laden mislukt:', err)
    } finally {
      searchLoadingMoreRef.current = false
    }
  }, [searchQuery, searchResults])

  // ─── Unsnooze timer ───
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toISOString()
      setEmails((prev) => {
        let changed = false
        const next = prev.map((e) => {
          if (e.snoozed_until && e.snoozed_until <= now) {
            changed = true
            return { ...e, snoozed_until: undefined, map: 'inbox' }
          }
          return e
        })
        return changed ? next : prev
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // ─── Server-side mappentellers ───
  // Bij duizenden mails in de DB telt de client alleen zijn eigen venster;
  // de echte aantallen komen van de server. Debounced her-ophalen zodra de
  // lijst muteert (lezen, verwijderen, sync).
  const [serverTellers, setServerTellers] = useState<{ inboxOngelezen: number; concepten: number; gepland: number; gesnoozed: number } | null>(null)
  useEffect(() => {
    const t = setTimeout(() => {
      getMapTellers().then((tellers) => { if (tellers) setServerTellers(tellers) }).catch(() => { /* client-fallback blijft staan */ })
    }, 800)
    return () => clearTimeout(t)
  }, [emails])

  // ─── Filtering (inline from useEmailFilters) ───
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    folderIds.forEach((id) => {
      if (id === 'inbox') counts[id] = serverTellers?.inboxOngelezen ?? emails.filter((e) => e.map === 'inbox' && !e.gelezen).length
      else if (id === 'concepten') counts[id] = serverTellers?.concepten ?? emails.filter((e) => e.map === 'concepten').length
      else if (id === 'gepland') counts[id] = serverTellers?.gepland ?? emails.filter((e) => e.map === 'gepland').length
      else if (id === 'gesnoozed') counts[id] = serverTellers?.gesnoozed ?? emails.filter((e) => e.snoozed_until).length
      else counts[id] = 0
    })
    return counts
  }, [emails, serverTellers])

  const filteredEmails = useMemo(() => {
    // Als er server-side zoekresultaten zijn, gebruik die (alle mappen)
    if (searchQuery.trim() && searchResults) {
      let filtered = searchResults as Email[]
      // Pas alleen client-side operator-filters toe die de server niet afhandelt
      const { operators } = parseSearchQuery(searchQuery)
      if (operators.has) {
        const has = operators.has.toLowerCase()
        if (has === 'bijlage' || has === 'attachment') filtered = filtered.filter((e) => e.bijlagen > 0)
        if (has === 'pin' || has === 'pinned') filtered = filtered.filter((e) => e.pinned)
      }
      if (operators.label) {
        const label = operators.label.toLowerCase()
        filtered = filtered.filter((e) => e.labels.some((l) => l.toLowerCase() === label))
      }
      if (operators.before) {
        const before = new Date(operators.before)
        if (!isNaN(before.getTime())) filtered = filtered.filter((e) => new Date(e.datum) < before)
      }
      if (operators.after) {
        const after = new Date(operators.after)
        if (!isNaN(after.getTime())) filtered = filtered.filter((e) => new Date(e.datum) > after)
      }
      return filtered
    }

    let filtered: Email[]
    if (selectedFolder === 'sales-wacht' || selectedFolder === 'sales-beantwoord') {
      filtered = salesEmails
    } else if (selectedFolder === 'gesnoozed') {
      filtered = emails.filter((e) => e.snoozed_until)
    } else {
      filtered = emails.filter((e) => e.map === selectedFolder && !e.snoozed_until)
    }

    // Client-side fallback voor als FTS niet beschikbaar is
    if (searchQuery.trim() && !searchResults) {
      const { text, operators } = parseSearchQuery(searchQuery)
      if (text) {
        const q = text.toLowerCase()
        filtered = filtered.filter(
          (e) =>
            e.onderwerp.toLowerCase().includes(q) ||
            e.van.toLowerCase().includes(q) ||
            e.aan.toLowerCase().includes(q) ||
            e.inhoud.toLowerCase().includes(q)
        )
      }
      if (operators.from) {
        const from = operators.from.toLowerCase()
        filtered = filtered.filter((e) => e.van.toLowerCase().includes(from))
      }
      if (operators.to) {
        const to = operators.to.toLowerCase()
        filtered = filtered.filter((e) => e.aan.toLowerCase().includes(to))
      }
      if (operators.subject) {
        const subj = operators.subject.toLowerCase()
        filtered = filtered.filter((e) => e.onderwerp.toLowerCase().includes(subj))
      }
      if (operators.has) {
        const has = operators.has.toLowerCase()
        if (has === 'bijlage' || has === 'attachment') filtered = filtered.filter((e) => e.bijlagen > 0)
        if (has === 'pin' || has === 'pinned') filtered = filtered.filter((e) => e.pinned)
      }
      if (operators.label) {
        const label = operators.label.toLowerCase()
        filtered = filtered.filter((e) => e.labels.some((l) => l.toLowerCase() === label))
      }
      if (operators.before) {
        const before = new Date(operators.before)
        if (!isNaN(before.getTime())) filtered = filtered.filter((e) => new Date(e.datum) < before)
      }
      if (operators.after) {
        const after = new Date(operators.after)
        if (!isNaN(after.getTime())) filtered = filtered.filter((e) => new Date(e.datum) > after)
      }
    }

    switch (filter) {
      case 'ongelezen': filtered = filtered.filter((e) => !e.gelezen); break
      case 'vastgepind': filtered = filtered.filter((e) => e.pinned); break
      case 'bijlagen': filtered = filtered.filter((e) => e.bijlagen > 0); break
    }

    // Sort: pinned first, then by date
    const withTs = filtered.map(e => ({ e, ts: new Date(e.datum).getTime() }))
    withTs.sort((a, b) => {
      if (a.e.pinned && !b.e.pinned) return -1
      if (!a.e.pinned && b.e.pinned) return 1
      return b.ts - a.ts
    })
    return withTs.map(x => x.e)
  }, [emails, salesEmails, selectedFolder, searchQuery, filter])

  // Thread grouping
  const threadedEmails = useMemo(() => {
    const threads = new Map<string, Email[]>()
    const standalone: Email[] = []

    filteredEmails.forEach((email) => {
      if (email.thread_id) {
        const existing = threads.get(email.thread_id) || []
        existing.push(email)
        threads.set(email.thread_id, existing)
      } else {
        standalone.push(email)
      }
    })

    const result: (Email & { threadCount?: number })[] = []
    threads.forEach((threadEmails) => {
      threadEmails.sort((a, b) => Date.parse(b.datum) - Date.parse(a.datum))
      result.push({ ...threadEmails[0], threadCount: threadEmails.length })
    })
    standalone.forEach((email) => result.push({ ...email, threadCount: 1 }))

    const tsMap = new Map<string, number>()
    result.forEach(e => tsMap.set(e.id, new Date(e.datum).getTime()))
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return (tsMap.get(b.id) || 0) - (tsMap.get(a.id) || 0)
    })
    return result
  }, [filteredEmails])

  const filterCounts = useMemo(() => {
    const folderEmails = selectedFolder === 'gesnoozed'
      ? emails.filter((e) => e.snoozed_until)
      : emails.filter((e) => e.map === selectedFolder)
    return {
      ongelezen: folderEmails.filter((e) => !e.gelezen).length,
    }
  }, [emails, selectedFolder])

  // ─── Dag-groepering: map elke email naar zijn datum-groep ───
  const getDateGroup = useCallback((dateStr: string): string => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Eerder'
    const now = new Date()
    const startOfDay = (date: Date) => {
      const x = new Date(date)
      x.setHours(0, 0, 0, 0)
      return x
    }
    const today = startOfDay(now)
    const target = startOfDay(d)
    const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays <= 0) return 'Vandaag'
    if (diffDays === 1) return 'Gisteren'
    if (diffDays <= 6) return 'Deze week'
    if (diffDays <= 13) return 'Vorige week'
    if (target.getMonth() === today.getMonth() && target.getFullYear() === today.getFullYear()) return 'Eerder deze maand'
    if (target.getFullYear() === today.getFullYear()) return 'Eerder dit jaar'
    return 'Vorig jaar of ouder'
  }, [])

  const emailsByGroup = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const email of threadedEmails) {
      if (email.pinned) continue
      const group = getDateGroup(email.datum)
      const ids = map.get(group) || []
      ids.push(email.id)
      map.set(group, ids)
    }
    return map
  }, [threadedEmails, getDateGroup])

  // Platte items-array voor virtualization: één entry per zichtbare rij
  // (header of email). Headers blijven scrollen mee · geen sticky meer,
  // want absolute positioning binnen de virtualizer maakt CSS-sticky stuk.
  type FlatRow =
    | { type: 'header-pinned' }
    | { type: 'header-group'; group: string }
    | { type: 'email'; email: Email; index: number }
  const flatItems = useMemo<FlatRow[]>(() => {
    if (threadedEmails.length === 0) return []
    const items: FlatRow[] = []
    let lastGroup: string | null = null
    let inPinnedSection = !!threadedEmails[0].pinned
    if (inPinnedSection) items.push({ type: 'header-pinned' })
    threadedEmails.forEach((email, idx) => {
      if (inPinnedSection && !email.pinned) {
        inPinnedSection = false
        lastGroup = null
      }
      if (!inPinnedSection) {
        const group = getDateGroup(email.datum)
        if (group !== lastGroup) {
          items.push({ type: 'header-group', group })
          lastGroup = group
        }
      }
      items.push({ type: 'email', email, index: idx })
    })
    return items
  }, [threadedEmails, getDateGroup])

  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => emailListRef.current,
    estimateSize: (i) => {
      const it = flatItems[i]
      if (!it) return 46
      if (it.type === 'header-pinned' || it.type === 'header-group') return 36
      // Stacked desktop = 46, inline / mobile = ~70
      return isDesktop && listStyle === 'stacked' ? 46 : 70
    },
    overscan: 10,
    getItemKey: (i) => {
      const it = flatItems[i]
      if (!it) return i
      if (it.type === 'header-pinned') return 'header-pinned'
      if (it.type === 'header-group') return `group-${it.group}`
      return `email-${it.email.id}`
    },
  })

  // Sticky date-group overlay: alleen tonen wanneer de ECHTE header van de
  // huidige groep boven scroll-viewport is uitgescrold. Op scroll=0 staat de
  // echte header gewoon in beeld en moet de overlay onzichtbaar blijven —
  // anders dekt hij de checkbox van het echte rijtje af.
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  useEffect(() => {
    const el = emailListRef.current
    if (!el) return
    const updateActiveGroup = () => {
      const scrollTop = el.scrollTop
      const measurements = rowVirtualizer.measurementsCache
      let currentGroup: string | null = null
      let currentHeaderEnd = 0
      for (let i = 0; i < flatItems.length; i++) {
        const m = measurements[i]
        if (!m) continue
        if (m.start > scrollTop + 1) break
        const it = flatItems[i]
        if (it.type === 'header-group') {
          currentGroup = it.group
          currentHeaderEnd = m.end
        } else if (it.type === 'header-pinned') {
          currentGroup = null
          currentHeaderEnd = 0
        }
      }
      // Alleen overlay tonen als de echte header onder scrollTop is verdwenen
      setActiveGroup(currentGroup && scrollTop >= currentHeaderEnd ? currentGroup : null)
    }
    updateActiveGroup()
    el.addEventListener('scroll', updateActiveGroup, { passive: true })
    return () => el.removeEventListener('scroll', updateActiveGroup)
  }, [flatItems, rowVirtualizer, threadedEmails])

  const toggleCheckGroup = useCallback((group: string) => {
    const groupIds = emailsByGroup.get(group) || []
    if (!groupIds.length) return
    setCheckedEmails(prev => {
      const next = new Set(prev)
      const allSelected = groupIds.every(id => next.has(id))
      if (allSelected) {
        groupIds.forEach(id => next.delete(id))
      } else {
        groupIds.forEach(id => next.add(id))
      }
      return next
    })
  }, [emailsByGroup])

  // ─── Selection helpers (inline from useEmailSelection) ───
  const hasChecked = checkedEmails.size > 0
  const allChecked = filteredEmails.length > 0 && checkedEmails.size === filteredEmails.length
  const someChecked = hasChecked && !allChecked

  const toggleCheckEmail = useCallback((id: string, e?: React.MouseEvent) => {
    // Shift+klik op een checkbox: range select van laatst gecheckte t/m deze
    if (e?.shiftKey && lastCheckedIdRef.current && lastCheckedIdRef.current !== id) {
      const ids = filteredEmails.map((em) => em.id)
      const startIdx = ids.indexOf(lastCheckedIdRef.current)
      const endIdx = ids.indexOf(id)
      if (startIdx >= 0 && endIdx >= 0) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const range = ids.slice(from, to + 1)
        setCheckedEmails((prev) => {
          const next = new Set(prev)
          range.forEach((rid) => next.add(rid))
          return next
        })
        lastCheckedIdRef.current = id
        return
      }
    }
    setCheckedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    lastCheckedIdRef.current = id
  }, [filteredEmails])

  const toggleCheckAll = useCallback(() => {
    if (allChecked) setCheckedEmails(new Set())
    else setCheckedEmails(new Set(filteredEmails.map((e) => e.id)))
  }, [allChecked, filteredEmails])

  const clearChecked = useCallback(() => setCheckedEmails(new Set()), [])

  // ─── Bulk actions ───
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e))
    ids.forEach((id) => updateEmail(id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} verwijderd`)
  }, [checkedEmails])

  const handleBulkArchive = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) => prev.filter((e) => !ids.includes(e.id)))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} gearchiveerd`)
  }, [checkedEmails])

  const handleBulkMarkRead = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, gelezen: true } : e))
    ids.forEach((id) => updateEmail(id, { gelezen: true }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} als gelezen gemarkeerd`)
  }, [checkedEmails])

  const handleBulkMarkUnread = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, gelezen: false } : e))
    ids.forEach((id) => updateEmail(id, { gelezen: false }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} als ongelezen gemarkeerd`)
  }, [checkedEmails])

  // ─── Email actions (inline from useEmailActions) ───
  const handleTogglePin = useCallback((email: Email) => {
    const newPinned = !email.pinned
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, pinned: newPinned } : e)))
    setSelectedEmail((prev) => prev?.id === email.id ? { ...prev, pinned: newPinned } : prev)
    updateEmail(email.id, { pinned: newPinned }).catch(() => {})
  }, [])

  const handleSnooze = useCallback((email: Email, hours: number) => {
    const wakeAt = calculateSnoozeDate(hours).toISOString()
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, snoozed_until: wakeAt } : e)))
    setSelectedEmail((prev) => prev?.id === email.id ? { ...prev, snoozed_until: wakeAt } : prev)
    updateEmail(email.id, { snoozed_until: wakeAt }).catch(() => {})
    const opt = SNOOZE_OPTIONS.find((o) => o.hours === hours)
    toast.success(opt ? `Gesnoozed: ${opt.label.toLowerCase()}` : 'Gesnoozed')
  }, [])

  const handleUnsnooze = useCallback((email: Email) => {
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, snoozed_until: undefined } : e)))
    setSelectedEmail((prev) => prev?.id === email.id ? { ...prev, snoozed_until: undefined } : prev)
    updateEmail(email.id, { snoozed_until: null }).catch(() => {})
    toast.success('Niet meer gesnoozed')
  }, [])

  const handleToggleLabel = useCallback((email: Email, label: string) => {
    const current = email.labels || []
    const next = current.includes(label)
      ? current.filter((l) => l !== label)
      : [...current, label]
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, labels: next } : e)))
    setSelectedEmail((prev) => prev?.id === email.id ? { ...prev, labels: next } : prev)
    updateEmail(email.id, { labels: next }).catch(() => {})
  }, [])

  const handleToggleRead = useCallback((email: Email) => {
    const newGelezen = !email.gelezen
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, gelezen: newGelezen } : e)))
    setSelectedEmail((prev) => prev?.id === email.id ? { ...prev, gelezen: newGelezen } : prev)
    updateEmail(email.id, { gelezen: newGelezen }).catch(() => {})
  }, [])

  const handleArchive = useCallback((email: Email) => {
    viewTransition(() => {
      setEmails((prev) => prev.filter((e) => e.id !== email.id))
      setSelectedEmail(null)
      setViewMode('idle')
    }, 'back')
    toast.success('Email gearchiveerd', {
      duration: 5000,
      action: {
        label: 'Ongedaan maken',
        onClick: () => {
          setEmails((prev) => (prev.some((e) => e.id === email.id) ? prev : [email, ...prev]))
        },
      },
    })
  }, [])

  const handleDelete = useCallback((email: Email) => {
    const wasInTrash = email.map === 'prullenbak'
    const snapshot = { map: email.map, labels: email.labels }
    viewTransition(() => {
      if (wasInTrash) {
        setEmails((prev) => prev.filter((e) => e.id !== email.id))
      } else {
        setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e))
      }
      setSelectedEmail(null)
      setViewMode('idle')
    }, 'back')
    // Vertraag de DB-mutatie met 5s zodat undo nog kan ingrijpen
    const flush = () => {
      if (wasInTrash) {
        deleteEmailDb(email.id).catch(() => {})
      } else {
        updateEmail(email.id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {})
      }
      pendingDeleteTimersRef.current.delete(email.id)
    }
    const timer = setTimeout(flush, 5000)
    pendingDeleteTimersRef.current.set(email.id, { timer, flush })
    toast.success(wasInTrash ? 'Definitief verwijderd' : 'Email verwijderd', {
      duration: 5000,
      action: {
        label: 'Ongedaan maken',
        onClick: () => {
          const existing = pendingDeleteTimersRef.current.get(email.id)
          if (existing) {
            clearTimeout(existing.timer)
            pendingDeleteTimersRef.current.delete(email.id)
          }
          setEmails((prev) => {
            if (wasInTrash) {
              return prev.some((e) => e.id === email.id) ? prev : [email, ...prev]
            }
            return prev.map((e) => e.id === email.id ? { ...e, ...snapshot } : e)
          })
        },
      },
    })
  }, [])

  // ─── Sales Inbox v1: per-rij correctie-acties ───
  const handleSalesMarkeerBeantwoord = useCallback(async (id: string) => {
    setSalesEmails((prev) => prev.filter((e) => e.id !== id))
    try {
      await markeerHandmatigBeantwoord(id)
      toast.success('Gemarkeerd als beantwoord')
    } catch (err) {
      logger.error('Sales markeer mislukt:', err)
      toast.error('Markeren mislukt')
      if (selectedFolder === 'sales-wacht') loadSalesEmails(selectedFolder)
    }
  }, [selectedFolder, loadSalesEmails])

  const handleSalesWisWacht = useCallback(async (id: string) => {
    setSalesEmails((prev) => prev.filter((e) => e.id !== id))
    try {
      await wisWachtFlag(id)
      toast.success('Niet meer opvolgen')
    } catch (err) {
      logger.error('Sales wis wacht-flag mislukt:', err)
      toast.error('Verwijderen uit Wacht-tab mislukt')
      if (selectedFolder === 'sales-wacht') loadSalesEmails(selectedFolder)
    }
  }, [selectedFolder, loadSalesEmails])

  const handleSalesTerugNaarWacht = useCallback(async (outboundId: string, inkomendeMailId: string) => {
    setSalesEmails((prev) => prev.filter((e) => e.id !== outboundId))
    try {
      await terugZettenNaarWacht(outboundId, inkomendeMailId)
      toast.success('Teruggezet naar Opvolgen')
    } catch (err) {
      logger.error('Sales terug-naar-wacht mislukt:', err)
      toast.error('Terugzetten mislukt')
      if (selectedFolder === 'sales-beantwoord') loadSalesEmails(selectedFolder)
    }
  }, [selectedFolder, loadSalesEmails])

  const dismissSalesBanner = useCallback(() => {
    setSalesBannerDismissed(true)
    try { localStorage.setItem('doen_email_sales_inbox_banner_v1', 'dismissed') } catch { /* ignore */ }
  }, [])

  // ─── Refresh: IMAP sync in background, re-read from Supabase ───
  const handleRefresh = useCallback(async (folder: EmailFolder, silent = false) => {
    if (!silent) setIsRefreshing(true)
    const imapFolder = IMAP_FOLDER_MAP[folder] || 'INBOX'
    triggerImapSync(imapFolder)
      .then(async ({ total }) => {
        setImapTotal(total)
        hasMoreDbRef.current = {}
        const fresh = await readFromSupabase()
        if (fresh.length > 0) setEmails(fresh)
        setLastSyncAt(Date.now())
        if (!silent) toast.success('Inbox vernieuwd')
      })
      .catch(() => {
        if (!silent) toast.error('Kon emails niet vernieuwen')
      })
      .finally(() => {
        if (!silent) setIsRefreshing(false)
      })
  }, [])

  const handleFolderLoad = useCallback(async (folder: EmailFolder) => {
    // Leads leven in een eigen tabel; geen e-mails ophalen voor die tab.
    if (folder === 'leads') { setIsLoading(false); return }
    // Read from Supabase only · no IMAP sync on folder switch
    try {
      const cached = await readFromSupabase()
      setEmails(cached)
    } catch (err) { logger.error('Folder load failed:', err) }
    finally { setIsLoading(false) }
  }, [])

  // ─── Load more (infinite scroll) ───
  // Bladeren gaat uit de eigen DB met keyset-paginatie (datum, id) · geen
  // IMAP-offset meer. De historie-backfill vult de DB op de achtergrond,
  // dus een lege pagina nu kan na verloop van tijd alsnog data hebben;
  // daarom resetten we hasMore bij refresh/folderwissel.
  const hasMoreDbRef = useRef<Record<string, boolean>>({})
  const loadMoreEmails = useCallback(async (folder: EmailFolder) => {
    if (isLoadingMore) return
    const map = DB_MAP_FOLDERS[folder]
    if (!map) return
    if (hasMoreDbRef.current[map] === false) return
    setIsLoadingMore(true)
    try {
      // Cursor = oudste mail van deze map die we al hebben
      let oudste: Email | null = null
      for (const e of emails) {
        if (e.map !== map) continue
        if (!oudste || (e.datum && e.datum < oudste.datum)) oudste = e
      }
      const page = await getEmailsPage(
        map,
        oudste ? { datum: oudste.datum, id: oudste.id } : null,
        fetchLimitRef.current
      )
      if (page.length > 0) {
        const meer = normalizeEmails(page)
        setEmails((prev) => {
          const bekend = new Set(prev.map((p) => p.id))
          return [...prev, ...meer.filter((p) => !bekend.has(p.id))]
        })
      }
      if (page.length < fetchLimitRef.current) {
        hasMoreDbRef.current[map] = false
      }
    } catch (err) {
      logger.error('Load more emails failed:', err)
      toast.error('Kon meer emails niet laden')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, emails])

  // ─── Load email body ───
  // Track in-flight prefetches om dubbele requests te voorkomen wanneer iemand
  // hovert, scrollt en opnieuw hovert binnen korte tijd.
  const inFlightFetches = useRef<Map<string, Promise<string>>>(new Map())

  // Lage-level fetch die ALLEEN de cache vult, geen UI state aanraakt.
  // Gebruikt voor zowel prefetch (hover) als de echte click flow.
  const fetchBodyToCache = useCallback(async (email: Email, folder: EmailFolder): Promise<string> => {
    const cached = bodyCacheRef.current.get(email.id)
    if (cached !== undefined) return cached
    if (email.inhoud) {
      bodyCacheRef.current.set(email.id, email.inhoud)
      return email.inhoud
    }

    // Dedupe: als er al een fetch loopt voor deze email, hergebruik die promise
    const existing = inFlightFetches.current.get(email.id)
    if (existing) return existing

    const promise = (async () => {
      try {
        // Step 1: Supabase eerst (snel)
        const dbBody = await getEmailBody(email.id).catch(() => null)
        const body = dbBody?.body_html || dbBody?.body_text || dbBody?.inhoud || ''
        if (body) {
          bodyCacheRef.current.set(email.id, body)
          if (dbBody?.attachment_meta && Array.isArray(dbBody.attachment_meta) && dbBody.attachment_meta.length > 0) {
            attachmentCacheRef.current.set(email.id, dbBody.attachment_meta as EmailAttachment[])
          }
          return body
        }

        // Step 2: IMAP fallback
        const uid = Number(email.gmail_id || email.id)
        if (isNaN(uid)) return ''
        const detail = await readEmailFromIMAP(uid, IMAP_FOLDER_MAP[folder] || 'INBOX')
        const imapBody = detail.bodyHtml || detail.bodyText || ''
        bodyCacheRef.current.set(email.id, imapBody)
        if (detail.attachments?.length) {
          const inlineBytes: Record<string, string> = {}
          const signedUrls: Record<string, string> = {}
          const metaOnly: EmailAttachment[] = detail.attachments.map((a) => {
            if (a.content) inlineBytes[a.filename] = a.content
            if (a.storage_url) signedUrls[a.filename] = a.storage_url
            return { filename: a.filename, contentType: a.contentType, size: a.size }
          })
          attachmentCacheRef.current.set(email.id, metaOnly)
          if (Object.keys(inlineBytes).length > 0) {
            attachmentBytesCacheRef.current.set(email.id, inlineBytes)
          }
          if (Object.keys(signedUrls).length > 0) {
            attachmentUrlsCacheRef.current.set(email.id, signedUrls)
          }
        }
        return imapBody
      } catch (err: unknown) {
        logger.error('Email body ophalen mislukt:', err)
        return ''
      } finally {
        inFlightFetches.current.delete(email.id)
      }
    })()
    inFlightFetches.current.set(email.id, promise)
    return promise
  }, [])

  // Prefetch on hover · vult cache op de achtergrond, geen UI feedback.
  const prefetchEmailBody = useCallback((email: Email) => {
    if (bodyCacheRef.current.has(email.id)) return
    if (email.inhoud) return
    void fetchBodyToCache(email, selectedFolder)
  }, [fetchBodyToCache, selectedFolder])

  // Targeted IMAP fetch voor enkel attachment-metadata. Triggert wanneer de
  // body al ergens vandaan komt (DB of cache) maar de bijlagen-meta ontbreekt
  // · bv. bij oude mails die gesynced zijn voordat attachment_meta werd
  // bijgehouden, of bij DB-rijen zonder meta. Voorkomt het "open opnieuw om
  // de details te laden" dead-end.
  const fetchAttachmentMeta = useCallback(async (email: Email, folder: EmailFolder): Promise<EmailAttachment[] | undefined> => {
    const cached = attachmentCacheRef.current.get(email.id)
    if (cached?.length) return cached
    try {
      const uid = Number(email.gmail_id || email.id)
      if (isNaN(uid)) return undefined
      const detail = await readEmailFromIMAP(uid, IMAP_FOLDER_MAP[folder] || 'INBOX')
      if (detail.attachments?.length) {
        const inlineBytes: Record<string, string> = {}
        const signedUrls: Record<string, string> = {}
        const metaOnly: EmailAttachment[] = detail.attachments.map((a) => {
          if (a.content) inlineBytes[a.filename] = a.content
          if (a.storage_url) signedUrls[a.filename] = a.storage_url
          return { filename: a.filename, contentType: a.contentType, size: a.size }
        })
        attachmentCacheRef.current.set(email.id, metaOnly)
        if (Object.keys(inlineBytes).length > 0) {
          attachmentBytesCacheRef.current.set(email.id, inlineBytes)
        }
        if (Object.keys(signedUrls).length > 0) {
          attachmentUrlsCacheRef.current.set(email.id, signedUrls)
        }
        return metaOnly
      }
    } catch (err) {
      logger.error('Attachment meta-fetch mislukt:', err)
    }
    return undefined
  }, [])

  const loadEmailBody = useCallback(async (email: Email, folder: EmailFolder): Promise<Email> => {
    const cachedAtt = attachmentCacheRef.current.get(email.id)
    const cached = bodyCacheRef.current.get(email.id)
    const hasAtt = (cachedAtt?.length ?? 0) > 0 || (email.attachment_meta?.length ?? 0) > 0
    const needsAttFetch = (email.bijlagen ?? 0) > 0 && !hasAtt

    if (cached !== undefined && !needsAttFetch) {
      return { ...email, gelezen: true, inhoud: cached, attachment_meta: email.attachment_meta || cachedAtt || undefined }
    }
    if (email.inhoud && !needsAttFetch) return { ...email, gelezen: true }

    setIsLoadingBody(true)
    try {
      // Body is al gecached, alleen bijlagen ontbreken · alleen attachment-fetch.
      if (cached !== undefined) {
        const att = await fetchAttachmentMeta(email, folder)
        return { ...email, gelezen: true, inhoud: cached, attachment_meta: email.attachment_meta || att || cachedAtt || undefined }
      }
      // Body op email-object aanwezig (uit lijst), bijlagen niet · alleen attachment-fetch.
      if (email.inhoud) {
        const att = await fetchAttachmentMeta(email, folder)
        return { ...email, gelezen: true, attachment_meta: email.attachment_meta || att || undefined }
      }

      // Niets gecached · volle body-fetch (vult ook attachments als IMAP-pad).
      const body = await fetchBodyToCache(email, folder)
      let att = attachmentCacheRef.current.get(email.id)
      // Body kwam uit DB, maar attachments ontbraken in DB; haal ze nu via IMAP.
      if (!att?.length && (email.bijlagen ?? 0) > 0) {
        att = await fetchAttachmentMeta(email, folder)
      }
      return { ...email, gelezen: true, inhoud: body, attachment_meta: email.attachment_meta || att || undefined }
    } finally {
      setIsLoadingBody(false)
    }
  }, [fetchBodyToCache, fetchAttachmentMeta])

  // ─── Prefetch top-N email bodies na lijst laden ───
  // Zodra de lijst beschikbaar is, prefetch de eerste ~8 emails zodat
  // klikken op een mail instant aanvoelt.
  const prefetchedRef = useRef(false)
  useEffect(() => {
    if (!threadedEmails.length || prefetchedRef.current) return
    prefetchedRef.current = true
    const toPrefetch = threadedEmails
      .filter(e => !e.inhoud && !bodyCacheRef.current.has(e.id))
      .slice(0, 8)
    if (!toPrefetch.length) return
    let i = 0
    const next = () => {
      if (i >= toPrefetch.length) return
      void fetchBodyToCache(toPrefetch[i], selectedFolder).finally(() => {
        i++
        setTimeout(next, 150)
      })
    }
    next()
  }, [threadedEmails, fetchBodyToCache, selectedFolder])

  // ─── Polling: silent background sync every 3min ───
  // No window focus sync · too aggressive (full IMAP connection each time)
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      handleRefresh(selectedFolder, true)
    }, 180000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [selectedFolder, handleRefresh])

  // ─── Keyboard shortcuts (inline from useEmailKeyboard) ───
  // callbacksRef wordt aan onder via useEffect na declaratie van alle
  // handlers gevuld (handleReply / handleForward worden later gedeclareerd
  // dus we kunnen ze niet op top-level lezen · TDZ).
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const callbacksRef = useRef<{
    handleTogglePin: (e: Email) => void
    handleArchive: (e: Email) => void
    handleDelete: (e: Email) => void
    handleReply: (e: Email) => void
    handleForward: (e: Email) => void
  } | null>(null)
  const emailsRef = useRef(threadedEmails)
  emailsRef.current = threadedEmails
  const focusedRef = useRef(focusedIndex)
  focusedRef.current = focusedIndex

  useEffect(() => {
    if (viewMode !== 'idle') return
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Escape op zoekveld: wis focus zodat globale shortcuts weer werken
        if (e.key === 'Escape' && target === searchInputRef.current) {
          target.blur()
        }
        return
      }
      const idx = focusedRef.current
      const cb = callbacksRef.current
      if (!cb) return
      const list = emailsRef.current
      switch (e.key) {
        case 'j': e.preventDefault(); setFocusedIndex((prev) => Math.min(prev + 1, list.length - 1)); break
        case 'k': e.preventDefault(); setFocusedIndex((prev) => Math.max(prev - 1, 0)); break
        case 'o': case 'Enter':
          e.preventDefault()
          if (idx >= 0 && idx < list.length) handleSelectEmail(list[idx])
          break
        case 'p': e.preventDefault(); if (idx >= 0 && idx < list.length) cb.handleTogglePin(list[idx]); break
        case 'e': e.preventDefault(); if (idx >= 0 && idx < list.length) cb.handleArchive(list[idx]); break
        case '#': e.preventDefault(); if (idx >= 0 && idx < list.length) cb.handleDelete(list[idx]); break
        case 'r': case 'a':
          e.preventDefault()
          if (idx >= 0 && idx < list.length) cb.handleReply(list[idx])
          break
        case 'f': e.preventDefault(); if (idx >= 0 && idx < list.length) cb.handleForward(list[idx]); break
        case '/':
          e.preventDefault()
          searchInputRef.current?.focus()
          break
        case 'c': e.preventDefault(); handleCompose(); break
        case '?': e.preventDefault(); setShowShortcuts((prev) => !prev); break
        case 'Escape':
          e.preventDefault()
          setShowShortcuts(false)
          // Wis ook actieve checkbox-selectie als die er is
          if (checkedEmails.size > 0) setCheckedEmails(new Set())
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  // Houd de focused-row in view bij j/k-navigatie. Virtualizer scrolt
  // gericht naar het flat-item (header of email) dat overeenkomt met het
  // gefocuste email-id · gewoon scrollIntoView werkt niet bij absolute
  // positioning.
  useEffect(() => {
    if (focusedIndex < 0 || viewMode !== 'idle') return
    const email = threadedEmails[focusedIndex]
    if (!email) return
    const flatIdx = flatItems.findIndex((it) => it.type === 'email' && it.email.id === email.id)
    if (flatIdx >= 0) rowVirtualizer.scrollToIndex(flatIdx, { align: 'auto' })
  }, [focusedIndex, threadedEmails, viewMode, flatItems, rowVirtualizer])

  // Tick elke 30s zodat "Bijgewerkt X min geleden"-indicator vanzelf doorloopt
  useEffect(() => {
    if (!lastSyncAt) return
    const interval = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [lastSyncAt])

  // Bij unmount: alle pending delete-timers direct flushen, zodat de UI-mutatie
  // ook in de DB blijft staan na pagina-wissel.
  useEffect(() => {
    const pending = pendingDeleteTimersRef.current
    return () => {
      pending.forEach(({ timer, flush }) => {
        clearTimeout(timer)
        flush()
      })
      pending.clear()
    }
  }, [])

  // ─── Handlers ───
  const handleSelectEmail = useCallback(async (email: Email, e?: React.MouseEvent) => {
    // Shift / Cmd / Ctrl klik → toggle checkbox ipv mail openen.
    // Zo kan je makkelijk meerdere mails selecteren voor bulk acties.
    if (e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      toggleCheckEmail(email.id, e)
      return
    }
    // Normale klik: open de mail
    viewTransition(() => {
      setEmails(prev => prev.map(em => em.id === email.id ? { ...em, gelezen: true } : em))
      setSelectedEmail({ ...email, gelezen: true })
      setViewMode('reading')
    }, 'forward')

    // Load body in background (async)
    loadEmailBody(email, selectedFolder).then((withBody) => {
      setSelectedEmail(withBody)
    })
  }, [loadEmailBody, selectedFolder, toggleCheckEmail])

  const handleCompose = useCallback((defaults?: { to?: string; subject?: string; body?: string; bodyIsBericht?: boolean; replyToText?: string }) => {
    viewTransition(() => {
      setComposeDefaults(defaults || {})
      // Verse compose-sessie: vorige project-koppelingskeuze niet hergebruiken
      setComposeProjectId(null)
      setComposeLeadId(null)
      setViewMode('composing')
      setSelectedEmail(null)
    }, 'forward')
  }, [])

  const handleReply = useCallback((email: Email) => {
    handleCompose({
      to: extractSenderEmail(email.van),
      subject: email.onderwerp.startsWith('Re: ') ? email.onderwerp : `Re: ${email.onderwerp}`,
      body: `\n\n---------- Oorspronkelijk bericht ----------\nVan: ${email.van}\nDatum: ${email.datum}\n\n${email.inhoud?.replace(/<[^>]*>/g, '') || ''}`,
      replyToText: `Van: ${email.van}\nOnderwerp: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '').trim() || ''}`,
    })
  }, [handleCompose])

  const handleForward = useCallback((email: Email) => {
    handleCompose({
      subject: email.onderwerp.startsWith('Fwd: ') ? email.onderwerp : `Fwd: ${email.onderwerp}`,
      body: `\n\n---------- Doorgestuurd bericht ----------\nVan: ${email.van}\nDatum: ${email.datum}\nOnderwerp: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '') || ''}`,
    })
  }, [handleCompose])

  // Vul de callbacks-ref nu alle handlers gedeclareerd zijn (zie keyboard-handler hierboven).
  callbacksRef.current = { handleTogglePin, handleArchive, handleDelete, handleReply, handleForward }

  // ─── Auto-open nieuwste mail op desktop bij eerste idle ───
  // Vult de lege reader-kolom direct na openen van het Email-tab. Eén keer
  // per sessie zodat handleBack niet meteen opnieuw triggert; alleen voor
  // de inbox en alleen op desktop (mobiel is de lijst zelf de hoofdview).
  const autoOpenedRef = useRef(false)
  useEffect(() => {
    if (autoOpenedRef.current) return
    if (!isDesktop) return
    if (isLoading) return
    if (viewMode !== 'idle') return
    if (selectedFolder !== 'inbox') return
    if (threadedEmails.length === 0) return
    autoOpenedRef.current = true
    handleSelectEmail(threadedEmails[0])
  }, [isDesktop, isLoading, viewMode, selectedFolder, threadedEmails, handleSelectEmail])

  const handleSendEmail = useCallback(async (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string; wacht_op_reactie?: boolean; attachments?: Array<{ filename: string; storagePath?: string; size?: number; content?: string; encoding?: 'base64' }> }) => {
    try {
      // Genereer thread_id client-side zodat we een eventueel gekoppeld
      // project direct na verzenden kunnen aanhaken · de backend accepteert
      // deze waarde en gebruikt 'm als de thread_id van de nieuwe mail.
      const pendingProjectId = composeProjectIdRef.current
      const clientThreadId = pendingProjectId ? crypto.randomUUID() : undefined
      await sendEmailViaApi(data.to, data.subject, data.body, {
        html: data.html,
        scheduledAt: data.scheduledAt,
        wacht_op_reactie: data.wacht_op_reactie,
        attachments: data.attachments,
        thread_id: clientThreadId,
      })
      if (pendingProjectId && clientThreadId) {
        try {
          await koppelEmailAanProject(clientThreadId, pendingProjectId)
        } catch (e) {
          logger.warn('Project-koppeling na compose mislukt:', e)
        }
        setComposeProjectId(null)
      }
      const pendingLeadId = composeLeadIdRef.current
      if (pendingLeadId) {
        try {
          await updateLeadStatus(pendingLeadId, 'benaderd')
          setBenaderdeLeadId(pendingLeadId)
        } catch (e) {
          logger.warn('Leadstatus na verzenden bijwerken mislukt:', e)
        }
        setComposeLeadId(null)
      }
    } catch (err) {
      logger.error('Email verzenden mislukt:', err)
      throw err
    }
  }, [])

  const handleSendReply = useCallback(async (data: { to: string; cc?: string; bcc?: string; subject: string; body: string; html?: string; scheduledAt?: string; attachments?: Array<{ filename: string; storagePath?: string; size?: number; content?: string; encoding?: 'base64' }> }) => {
    try {
      // Threading: geef message_id en thread_id mee zodat de verzonden
      // mail aan dezelfde thread wordt gekoppeld als de originele mail.
      const replyToMessageId = selectedEmail?.gmail_id
        ? undefined // gmail_id is een UID, niet een Message-ID
        : (selectedEmail as Record<string, unknown>)?.message_id as string | undefined
      const replyThreadId = selectedEmail?.thread_id || undefined

      await sendEmailViaApi(data.to, data.subject, data.body, {
        cc: data.cc,
        bcc: data.bcc,
        html: data.html,
        scheduledAt: data.scheduledAt,
        attachments: data.attachments,
        in_reply_to: replyToMessageId,
        thread_id: replyThreadId,
      })

      // Na verzenden: re-fetch de email lijst zodat de verzonden mail
      // meteen zichtbaar is in de conversatie/thread.
      handleRefresh(selectedFolder, true)
    } catch (err) {
      logger.error('Reply verzenden mislukt:', err)
      throw err
    }
  }, [selectedEmail, selectedFolder, handleRefresh])

  const handleFolderChange = useCallback((folder: EmailFolder) => {
    // Backfill kan intussen oudere mail hebben toegevoegd · geef bladeren
    // weer een kans in deze map.
    hasMoreDbRef.current = {}
    setSelectedFolder(folder)
    setSelectedEmail(null)
    setViewMode('idle')
    setFilter('alle')
    setSearchQuery('')
    setSearchInput('')
    clearChecked()
    setFolderDrawerOpen(false)
    if (folder === 'sales-wacht' || folder === 'sales-beantwoord') {
      setSalesTabSeen(true)
      try { localStorage.setItem('doen_email_sales_tab_seen_v1', 'true') } catch { /* no-op */ }
    }
    handleFolderLoad(folder)
  }, [clearChecked, handleFolderLoad])

  useEffect(() => {
    if (!folderDrawerOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFolderDrawerOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [folderDrawerOpen])

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchQuery(value), 200)
  }, [])

  const handleBack = useCallback(() => {
    viewTransition(() => {
      setSelectedEmail(null)
      // Reset compose-keuzes zodat een afgebroken sessie niet bij een
      // volgende compose (bv. via /email/compose deeplink) door-lekt.
      setComposeProjectId(null)
      setComposeLeadId(null)
      setViewMode('idle')
    }, 'back')
  }, [])

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = selectedEmail ? threadedEmails.findIndex(e => e.id === selectedEmail.id) : -1
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex >= 0 && nextIndex < threadedEmails.length) {
      handleSelectEmail(threadedEmails[nextIndex])
    }
  }, [selectedEmail, threadedEmails, handleSelectEmail])

  const handleScroll = useCallback(() => {
    if (!emailListRef.current || isLoadingMore) return
    const { scrollTop, scrollHeight, clientHeight } = emailListRef.current
    if (scrollHeight - scrollTop - clientHeight < 200) {
      if (searchResults !== null) {
        void loadMoreSearchResults()
      } else {
        loadMoreEmails(selectedFolder)
      }
    }
  }, [isLoadingMore, loadMoreEmails, selectedFolder, searchResults, loadMoreSearchResults])

  const emailIndex = useMemo(
    () => selectedEmail ? threadedEmails.findIndex(e => e.id === selectedEmail.id) : -1,
    [selectedEmail, threadedEmails],
  )

  const navigateAfterAction = useCallback((action: (email: Email) => void) => (email: Email) => {
    action(email)
    const idx = threadedEmails.findIndex(e => e.id === email.id)
    const nextIdx = idx + 1 < threadedEmails.length ? idx + 1 : idx - 1
    if (nextIdx >= 0 && nextIdx < threadedEmails.length) {
      handleSelectEmail(threadedEmails[nextIdx])
    } else {
      handleBack()
    }
  }, [threadedEmails, handleSelectEmail, handleBack])

  const handleDeleteAndNavigate = useMemo(() => navigateAfterAction(handleDelete), [navigateAfterAction, handleDelete])
  const handleArchiveAndNavigate = useMemo(() => navigateAfterAction(handleArchive), [navigateAfterAction, handleArchive])

  // ─── Computed reading-mode props ───
  const readerSenderName = selectedEmail ? extractSenderName(selectedEmail.van) : ''
  const readerSenderEmail = selectedEmail ? extractSenderEmail(selectedEmail.van) : ''
  // Avatar helpers kept in emailHelpers for EmailReader usage

  // Mobile drawer account header · same fallback pattern as TopNav/Sidebar.
  const userInitial = (user?.user_metadata?.voornaam?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const userName = user?.user_metadata?.voornaam
    ? `${user.user_metadata.voornaam}${user.user_metadata.achternaam ? ' ' + user.user_metadata.achternaam : ''}`
    : user?.email?.split('@')[0] || 'Gebruiker'
  const userAvatarStyle = getAvatarStyle(userName)

  const renderMobileFolderBtn = (folder: { id: EmailFolder; label: string; icon: React.ElementType }) => {
    const isActive = selectedFolder === folder.id
    const count = folderCounts[folder.id]
    const Icon = folder.icon
    const showNewBadge = folder.id === 'sales-wacht' && !salesTabSeen
    return (
      <button
        key={folder.id}
        onClick={() => handleFolderChange(folder.id)}
        title={showNewBadge ? 'Markeer mails die je opvolgt · krijg een ping als er antwoord komt' : undefined}
        className={cn(
          'w-full py-3 px-4 flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-petrol/[0.08] dark:bg-[#2A7A86]/[0.18] text-petrol dark:text-[#7FB5BF] font-medium'
            : 'text-foreground/70 hover:bg-background hover:text-foreground',
        )}
      >
        <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-petrol')} />
        <span className="flex-1 text-left">{folder.label}</span>
        {showNewBadge && (
          <span className="text-[10px] font-semibold text-flame tracking-wide">
            Nieuw<span aria-hidden>.</span>
          </span>
        )}
        {count > 0 && folder.id !== 'inbox' && (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-muted-foreground">
            {count}
          </span>
        )}
      </button>
    )
  }

  // Shared between the inline desktop sidebar and the portaled mobile drawer.
  const sidebarInner = (
    <>
      {/* Mobile-only account header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-4 border-b border-border">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: userAvatarStyle.bg, color: userAvatarStyle.text }}
        >
          <span className="text-[14px] font-bold">{userInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground truncate">{userName}</p>
          <p className="text-[12px] text-foreground/70 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="p-3">
        <button
          className="tap-press w-full h-10 rounded-[10px] flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-flame hover:bg-[#D8421F] shadow-[0_1px_3px_rgba(241,80,37,0.18)] hover:shadow-[0_3px_10px_rgba(241,80,37,0.24)] active:scale-[0.98] transition-[background-color,box-shadow,transform] duration-200"
          onClick={() => { setFolderDrawerOpen(false); handleCompose() }}
        >
          <Pencil className="h-4 w-4" />
          Nieuw bericht
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {/* Mobile: primary group → divider → secondary group (incl gepland) */}
        <div className="md:hidden space-y-0">
          {folderTabs.filter(f => PRIMARY_FOLDER_IDS.has(f.id)).map(renderMobileFolderBtn)}
          <div className="my-2 border-t border-border/60" />
          {folderTabs.filter(f => !PRIMARY_FOLDER_IDS.has(f.id)).map(renderMobileFolderBtn)}
          <button
            onClick={() => handleFolderChange('gepland')}
            className={cn(
              'w-full py-3 px-4 flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors',
              selectedFolder === 'gepland'
                ? 'bg-petrol/[0.08] dark:bg-[#2A7A86]/[0.18] text-petrol dark:text-[#7FB5BF] font-medium'
                : 'text-foreground/70 hover:bg-background hover:text-foreground',
            )}
          >
            <Clock className={cn('h-4 w-4 flex-shrink-0', selectedFolder === 'gepland' && 'text-petrol')} />
            <span className="flex-1 text-left">Ingeplande berichten</span>
          </button>
        </div>

        {/* Desktop: existing layout, untouched */}
        <div className="hidden md:block space-y-px">
          {folderTabs.map(folder => {
            const isActive = selectedFolder === folder.id
            const count = folderCounts[folder.id]
            const Icon = folder.icon
            const showNewBadge = folder.id === 'sales-wacht' && !salesTabSeen
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                title={showNewBadge ? 'Markeer mails die je opvolgt · krijg een ping als er antwoord komt' : undefined}
                className={cn(
                  'w-full h-[36px] flex items-center gap-3 px-2.5 rounded-[10px] text-[14px] tracking-[-0.01em] transition-all duration-200 active:scale-[0.98]',
                  isActive
                    ? 'bg-petrol/[0.10] text-petrol font-semibold'
                    : 'text-[#3A3A36] font-medium hover:bg-black/[0.04]',
                )}
              >
                <Icon className={cn('h-[17px] w-[17px] flex-shrink-0', isActive ? 'text-petrol' : 'text-muted-foreground')} />
                <span className="flex-1 text-left truncate">{folder.label}</span>
                {showNewBadge && (
                  <span className="text-[10px] font-semibold text-flame tracking-wide">
                    Nieuw<span aria-hidden>.</span>
                  </span>
                )}
                {count > 0 && folder.id !== 'inbox' && (
                  <span className={cn(
                    'text-[11px] font-medium tabular-nums px-1.5 min-w-[20px] h-[18px] rounded-full inline-flex items-center justify-center',
                    isActive ? 'bg-petrol/[0.14] text-petrol dark:bg-[#2A7A86]/[0.25] dark:text-[#7FB5BF]' : 'bg-black/[0.06] dark:bg-white/[0.08] text-foreground/70',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          <div className="my-2 border-t border-black/[0.05] dark:border-white/[0.06]" />

          <button
            onClick={() => { setFolderDrawerOpen(false); handleFolderChange('gepland') }}
            className={cn(
              'w-full h-[36px] flex items-center gap-3 px-2.5 rounded-[10px] text-[14px] tracking-[-0.01em] transition-all duration-200 active:scale-[0.98]',
              selectedFolder === 'gepland'
                ? 'bg-petrol/[0.10] dark:bg-[#2A7A86]/[0.18] text-petrol dark:text-[#7FB5BF] font-semibold'
                : 'text-[#3A3A36] dark:text-foreground/80 font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
            )}
          >
            <Clock className={cn('h-[17px] w-[17px] flex-shrink-0', selectedFolder === 'gepland' ? 'text-petrol' : 'text-muted-foreground')} />
            <span className="flex-1 text-left truncate">Ingeplande berichten</span>
          </button>
        </div>
      </nav>

      <div className="p-4 md:px-4 md:py-3 border-t border-border space-y-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={focusModus}
          aria-label="Focus modus aan/uit"
          onClick={() => setFocusModus(!focusModus)}
          className="w-full flex items-center gap-2 text-[12px] md:text-[11px] text-muted-foreground md:text-muted-foreground/80 hover:text-foreground transition-colors"
        >
          <Moon className="h-3 w-3" />
          <span className="flex-1 text-left">Focus modus</span>
          <span
            className={cn(
              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0',
              focusModus ? 'bg-petrol' : 'bg-[#D4D3CE] dark:bg-white/20'
            )}
          >
            <span
              className={cn(
                'inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform',
                focusModus ? 'translate-x-[14px]' : 'translate-x-0.5'
              )}
            />
          </span>
        </button>
        <div className="flex items-center gap-2 text-[12px] md:text-[11px] text-muted-foreground md:text-muted-foreground/80">
          <Mail className="h-3 w-3" />
          <span>doen<span className="text-flame">.</span> mail</span>
        </div>
      </div>
    </>
  )

  // Mobile-only inbox-context counter: today's unread mails in current folder.
  const todayUnreadCount = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return emails.filter((e) =>
      e.map === selectedFolder
      && !e.gelezen
      && new Date(e.datum).getTime() >= start.getTime()
    ).length
  }, [emails, selectedFolder])

  const selectedFolderLabel = (folderTabs.find((f) => f.id === selectedFolder)?.label
    ?? (selectedFolder === 'gepland' ? 'Ingeplande berichten' : selectedFolder)).toUpperCase()

  // ─── UNIFIED 3-COLUMN LAYOUT ───
  return (
    <div className={cn('h-full flex flex-col overflow-hidden antialiased', viewMode === 'idle' || focusModus ? 'bg-background' : 'bg-white dark:bg-card')}>
      {focusModus ? (
        <EmailFocusKaart onUitzetten={() => setFocusModus(false)} />
      ) : (
      <>
      {viewMode === 'idle' && (
        <EmailMobileTopBar
          onOpenDrawer={() => setFolderDrawerOpen(true)}
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          selectedFolder={selectedFolder}
          selectedFolderLabel={selectedFolderLabel}
          todayUnreadCount={todayUnreadCount}
          userInitial={userInitial}
          onOpenAI={() => navigate('/forgie')}
        />
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Desktop folder-icon-sidebar · iOS-inspired met subtiele petrol-infusie:
          zachte verticale gradient, petrol-tinted hairlines, cooler grey iconen,
          en hover-state in petrol ipv neutraal zwart. */}
      <div className="hidden md:flex w-[64px] bg-gradient-to-b from-[#E9EEEF] via-[#E4EBEC] to-[#DDE7E8] dark:from-[hsl(190_40%_6%)] dark:via-[hsl(190_38%_5%)] dark:to-[hsl(190_42%_4%)] border-r border-petrol/[0.10] dark:border-petrol/[0.22] flex-col flex-shrink-0 relative">
        {/* Subtiele binnen-highlight aan de linkerkant · geeft diepte */}
        <div className="absolute inset-y-0 left-0 w-px bg-white/40 dark:bg-white/[0.04] pointer-events-none" aria-hidden />

        <nav className="flex-1 overflow-y-auto pt-3 pb-2 px-2 space-y-1 relative">
          {folderTabs.map(folder => {
            const isActive = selectedFolder === folder.id
            const count = folderCounts[folder.id]
            const Icon = folder.icon
            const showNewBadge = folder.id === 'sales-wacht' && !salesTabSeen
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                title={`${folder.label}${count > 0 && folder.id !== 'inbox' ? ` (${count})` : ''}${showNewBadge ? ' · Nieuw' : ''}`}
                className={cn(
                  'tap-press relative w-full h-11 flex items-center justify-center rounded-[12px] transition-all duration-200 active:scale-[0.94]',
                  isActive
                    ? 'bg-gradient-to-b from-[#1F606A] to-[#164850] text-white shadow-[0_3px_10px_-2px_rgba(26,83,92,0.45),0_0_0_0.5px_rgba(255,255,255,0.06)_inset,0_-1px_0_rgba(0,0,0,0.05)_inset]'
                    : 'text-[#8FA0A4] hover:text-petrol hover:bg-petrol/[0.06] dark:text-[#6A8085] dark:hover:text-[#5FB5C0] dark:hover:bg-petrol/[0.22]',
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {showNewBadge && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-flame ring-2 ring-[#F1F5F5] dark:ring-[hsl(190_40%_5%)]" />
                )}
                {count > 0 && folder.id !== 'inbox' && !showNewBadge && (
                  <span className={cn(
                    'absolute top-0.5 right-0.5 text-[10px] font-semibold tabular-nums min-w-[16px] h-[16px] px-1 rounded-full inline-flex items-center justify-center leading-none ring-2 ring-[#F1F5F5] dark:ring-[hsl(190_40%_5%)]',
                    isActive ? 'bg-white text-petrol' : 'bg-flame text-white',
                  )}>{count}</span>
                )}
              </button>
            )
          })}

          <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-petrol/[0.12] to-transparent" aria-hidden />

          <button
            onClick={() => handleFolderChange('gepland')}
            title="Ingeplande berichten"
            className={cn(
              'tap-press w-full h-11 flex items-center justify-center rounded-[12px] transition-all duration-200 active:scale-[0.94]',
              selectedFolder === 'gepland'
                ? 'bg-gradient-to-b from-[#1F606A] to-[#164850] text-white shadow-[0_3px_10px_-2px_rgba(26,83,92,0.45),0_0_0_0.5px_rgba(255,255,255,0.06)_inset,0_-1px_0_rgba(0,0,0,0.05)_inset]'
                : 'text-[#8FA0A4] hover:text-petrol hover:bg-petrol/[0.06] dark:text-[#6A8085] dark:hover:text-[#5FB5C0] dark:hover:bg-petrol/[0.22]',
            )}
          >
            <Clock className="h-[19px] w-[19px]" strokeWidth={selectedFolder === 'gepland' ? 2.2 : 1.8} />
          </button>
        </nav>

        {/* Footer: Focus modus toggle · subtieler petrol-tinted divider */}
        <div className="border-t border-petrol/[0.08] py-2 px-2 bg-gradient-to-b from-transparent to-petrol/[0.04]">
          <button
            type="button"
            role="switch"
            aria-checked={focusModus}
            aria-label="Focus modus aan/uit"
            onClick={() => setFocusModus(!focusModus)}
            title={focusModus ? 'Focus modus · aan' : 'Focus modus · uit'}
            className={cn(
              'tap-press w-full h-11 flex items-center justify-center rounded-[12px] transition-all duration-200 active:scale-[0.94]',
              focusModus
                ? 'bg-gradient-to-b from-[#2A2A2A] to-[#141414] text-white shadow-[0_3px_10px_-2px_rgba(0,0,0,0.30),0_0_0_0.5px_rgba(255,255,255,0.06)_inset]'
                : 'text-[#8FA0A4] dark:text-[#6A8085] hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]',
            )}
          >
            <Moon className="h-[19px] w-[19px]" strokeWidth={focusModus ? 2.2 : 1.8} />
          </button>
        </div>
      </div>

      {/* Mobile drawer + backdrop · portaled to body so the slide-over escapes
          the parent's stacking context (main carries zIndex:0 in topnav layout,
          which would otherwise hide the drawer's top behind the global header). */}
      {createPortal(
        <>
          {folderDrawerOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setFolderDrawerOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            className={cn(
              'md:hidden fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[300px] bg-white dark:bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out',
              folderDrawerOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {sidebarInner}
          </div>
        </>,
        document.body,
      )}

      {/* Mobile floating "Opstellen" pill · bottom-right above MobileBottomNav.
          Portaled to body to escape main's stacking context. Verberg tijdens
          bulk-selectie zodat de bulk action-bar (zelfde y-positie) niet
          overlapt met de pill. */}
      {viewMode === 'idle' && checkedEmails.size === 0 && createPortal(
        <button
          type="button"
          onClick={() => { hapticLight(); handleCompose() }}
          aria-label="Nieuw bericht opstellen"
          className="md:hidden fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 px-5 py-3 rounded-full text-white text-[14px] font-medium bg-flame/[0.94] backdrop-blur-xl shadow-[0_8px_24px_rgba(241,80,37,0.32)] active:scale-[0.94] transition-transform duration-100"
        >
          <Edit3 className="h-[17px] w-[17px]" />
          Opstellen
        </button>,
        document.body,
      )}

      {/* ─── LEADS · eigen tabel, dus eigen paneel in plaats van de e-mailkolommen ─── */}
      {selectedFolder === 'leads' && (
        <LeadsPaneel
          onMailLead={(email, body, leadId) => {
            handleCompose({ to: email, body, bodyIsBericht: true })
            setComposeLeadId(leadId || null)
          }}
          naastCompose={viewMode !== 'idle'}
          mailDirect={isDesktop}
          benaderdeLeadId={benaderdeLeadId}
          onBeantwoordMail={(mail) => {
            loadEmailBody(mail, 'inbox')
              .then((metBody) => handleReply(metBody))
              .catch(() => handleReply(mail))
          }}
        />
      )}

      {/* ─── LIST COLUMN · altijd zichtbaar op desktop (resizable), op mobile alleen wanneer idle ─── */}
      <div
        className={cn(
          'bg-white dark:bg-card flex-col min-w-0 relative',
          'md:flex-shrink-0 md:border-r md:border-border md:flex',
          viewMode === 'idle' ? 'flex flex-1' : 'hidden',
          selectedFolder === 'leads' && 'hidden md:hidden',
        )}
        style={isDesktop ? { width: listWidth } : undefined}
      >

      {/* Ingeplande berichten lijst (gepland folder) */}
      {selectedFolder === 'gepland' && (
        <IngeplandeBerichtenLijst />
      )}

      {/* Email list (idle view) */}
      {selectedFolder !== 'gepland' && (<>
        {/* Sticky header + toolbar · desktop only */}
        <div className="sticky top-0 z-20 bg-white dark:bg-card border-b border-[rgba(26,83,92,0.08)] dark:border-white/10 flex-shrink-0 hidden md:block">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[rgba(26,83,92,0.06)] dark:border-white/[0.06]">
            <h1 className="font-heading text-[20px] font-bold tracking-[-0.01em] text-foreground leading-none">
              {folderTabs.find((f) => f.id === selectedFolder)?.label || 'Inbox'}<span className="text-flame">.</span>
            </h1>
            <button
              type="button"
              onClick={() => handleCompose()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-flame hover:bg-[#D8421F] shadow-[0_1px_3px_rgba(241,80,37,0.18)] hover:shadow-[0_3px_10px_rgba(241,80,37,0.24)] transition-[background-color,box-shadow] duration-200"
              title="Nieuw bericht opstellen (c)"
            >
              <Pencil className="h-3.5 w-3.5" />
              Nieuw bericht
            </button>
          </div>
        <div className="flex items-center justify-between gap-2 px-4 h-12 min-w-0 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked }}
              onChange={toggleCheckAll}
              className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-petrol flex-shrink-0"
            />

            {hasChecked ? (
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg" onClick={handleBulkArchive}>
                  <Archive className="h-3.5 w-3.5" /> Archief
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg" onClick={handleBulkDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Verwijder
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg" onClick={handleBulkMarkRead}>
                  <CheckCheck className="h-3.5 w-3.5" /> Gelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-[12px] text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg" onClick={handleBulkMarkUnread}>
                  Ongelezen
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 bg-background rounded-lg p-0.5 min-w-0 overflow-x-auto scrollbar-none">
                {filtersList.map(f => {
                  const isActiveFilter = filter === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'px-2 py-1 rounded-md text-[11px] transition-all duration-150 whitespace-nowrap',
                        isActiveFilter
                          ? 'bg-white dark:bg-white/10 text-foreground font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                          : 'text-muted-foreground hover:text-foreground/70',
                      )}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center flex-shrink-0">
            {/* List-style + font-size toggles · verborgen in 3-kolom layout (te smal).
                Logica blijft intact, kan via settings/popover terug. */}

            {lastSyncAt && (
              <span
                className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap hidden lg:inline"
                title={new Date(lastSyncAt).toLocaleString('nl-NL')}
              >
                {formatRelativeSync(lastSyncAt, nowTick)}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground/70 hover:bg-muted/60 rounded-[10px] transition-colors duration-150"
              onClick={() => setListStyle(s => s === 'inline' ? 'stacked' : 'inline')}
              title={listStyle === 'inline' ? 'Compacte weergave' : 'Ruime weergave'}
              aria-label={listStyle === 'inline' ? 'Compacte weergave' : 'Ruime weergave'}
            >
              {listStyle === 'inline' ? <StretchHorizontal className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground/70 hover:bg-muted/60 rounded-[10px] transition-colors duration-150"
              onClick={() => handleRefresh(selectedFolder)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
        </div>

        {/* Search bar · desktop only; mobile uses de topbar pill. */}
        <div className="hidden md:block px-4 py-2 border-b border-[rgba(26,83,92,0.08)] dark:border-white/10 bg-white dark:bg-card">
          <div className="flex items-center gap-2 h-9 px-3 bg-background rounded-lg focus-within:ring-2 focus-within:ring-petrol/20 transition-shadow">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Zoek in emails... (van:naam, na:2024, voor:2025-06, bijlage:ja)"
              className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearchQuery('') }} className="p-1 hover:bg-border rounded">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          {searchFocused && !searchInput && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SEARCH_OPERATORS.map((op) => (
                <button
                  key={op.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSearchInput(op.key)
                    searchInputRef.current?.focus()
                  }}
                  title={op.example}
                  className="px-2 py-0.5 rounded-md bg-muted hover:bg-petrol/[0.08] text-[11px] text-foreground/70 hover:text-petrol transition-colors duration-150 inline-flex items-center gap-1"
                >
                  <span className="font-mono">{op.key}</span>
                  <span className="text-muted-foreground">{op.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sales-banner zit BUITEN de scroll-container zodat de virtualizer
            niet hoeft te compenseren voor een non-virtual element binnen
            zijn scroll-element (was bron van overlap-bug bij sales-folders). */}
        {(selectedFolder === 'sales-wacht' || selectedFolder === 'sales-beantwoord') && !salesBannerDismissed && !isLoading && threadedEmails.length > 0 && (
          <div className="mx-4 mt-3 px-4 py-3 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg text-[12px] text-amber-900 dark:text-amber-200 leading-relaxed flex-shrink-0">
            <p className="font-medium mb-1">Hoe werkt Opvolgen?</p>
            <p>
              "Beantwoord" wordt bepaald op basis van het afzender-emailadres, niet op echte
              email-threads. Bij koude acquisitie kan een antwoord van een ander adres komen
              (zoals info@) · die blijft dan in "Opvolgen". Andersom kan een mail over een
              ander onderwerp ten onrechte als reactie tellen. Gebruik de per-rij knoppen om
              dit te corrigeren.
            </p>
            <button
              type="button"
              onClick={dismissSalesBanner}
              className="mt-2 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline text-[11px]"
            >
              Begrepen, niet meer tonen
            </button>
          </div>
        )}

        {/* Email list */}
        <div
          ref={emailListRef}
          className="flex-1 overflow-y-auto scroll-smooth relative"
          onScroll={handleScroll}
        >
          {/* Sticky date-group overlay · toont actieve groep bovenaan tijdens
              scroll. Virtualizer rendert echte headers absolute, dus deze
              overlay vult de gap. */}
          {activeGroup && (
            <div className="sticky top-0 z-10 px-4 pt-3 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/55 dark:text-foreground/60 bg-card/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.06] -mb-[36px]">
              {activeGroup === 'Vandaag' ? (
                <>
                  <span className="md:hidden">Eerder vandaag</span>
                  <span className="hidden md:inline">{activeGroup}</span>
                </>
              ) : activeGroup}<span className="text-flame tracking-normal">.</span>
            </div>
          )}

          {isLoading ? (
            <div>
              {/* Date-group header placeholder */}
              <div className="px-4 pt-5 pb-2">
                <Skeleton className="h-3 w-16" />
              </div>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 pl-3 pr-3 h-[46px]"
                >
                  <div className="flex-shrink-0 h-5 w-4" />
                  <Skeleton className="w-[26px] h-[26px] rounded-md flex-shrink-0" />
                  <Skeleton className="h-3.5 flex-shrink-0" style={{ width: i % 3 === 0 ? 130 : i % 2 === 0 ? 100 : 150 }} />
                  <Skeleton className="h-3.5 flex-1 max-w-[60%]" />
                  <Skeleton className="h-3 w-10 flex-shrink-0 ml-auto" />
                </div>
              ))}
            </div>
          ) : threadedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-5">
                <Inbox className="h-6 w-6 text-muted-foreground/80" />
              </div>
              <h3 className="font-heading text-[16px] font-bold text-foreground tracking-[-0.01em] mb-1.5">
                {searchQuery ? 'Geen resultaten' : filter !== 'alle' ? 'Geen emails met dit filter' : 'Inbox is leeg'}
              </h3>
              <p className="text-[13px] text-foreground/70 max-w-[260px] leading-relaxed">
                {searchQuery
                  ? `Geen emails gevonden voor "${searchQuery}"`
                  : filter !== 'alle'
                    ? 'Probeer een ander filter of bekijk alle emails'
                    : 'Nieuwe emails verschijnen hier automatisch'
                }
              </p>
            </div>
          ) : (
            <div>
              {searchQuery.trim() && searchResults !== null && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
                  {isSearching && <Loader2 className="h-3 w-3 animate-spin text-petrol/50" />}
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span className="font-mono tabular-nums">{threadedEmails.length}</span>
                    {' '}resultaten{searchHasMoreRef.current ? ' · scroll voor meer' : ''}
                  </span>
                </div>
              )}
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: 'relative',
                  width: '100%',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const it = flatItems[virtualRow.index]
                  if (!it) return null
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {it.type === 'header-pinned' ? (
                        <div className="px-4 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/50 dark:text-foreground/55">
                          Vastgepind<span className="text-flame tracking-normal">.</span>
                        </div>
                      ) : it.type === 'header-group' ? (() => {
                        const groupIds = emailsByGroup.get(it.group) || []
                        const allGroupChecked = groupIds.length > 0 && groupIds.every(id => checkedEmails.has(id))
                        const someGroupChecked = !allGroupChecked && groupIds.some(id => checkedEmails.has(id))
                        return (
                          <div className="px-4 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-petrol/50 dark:text-foreground/55 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={allGroupChecked}
                              ref={(el) => { if (el) el.indeterminate = someGroupChecked }}
                              onChange={() => toggleCheckGroup(it.group)}
                              className="h-3.5 w-3.5 rounded border-foreground/20 cursor-pointer accent-petrol"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span>
                              {it.group === 'Vandaag' ? (
                                <>
                                  <span className="md:hidden">Eerder vandaag</span>
                                  <span className="hidden md:inline">{it.group}</span>
                                </>
                              ) : it.group}<span className="text-flame tracking-normal">.</span>
                            </span>
                          </div>
                        )
                      })() : (
                        <EmailListItem
                          email={it.email}
                          isActive={selectedEmail?.id === it.email.id}
                          isChecked={checkedEmails.has(it.email.id)}
                          isFocused={focusedIndex === it.index}
                          fontSize={fontSize}
                          stacked={isDesktop && listStyle === 'stacked'}
                          onSelect={handleSelectEmail}
                          onTogglePin={handleTogglePin}
                          onToggleCheck={toggleCheckEmail}
                          onPrefetch={prefetchEmailBody}
                          onArchive={handleArchive}
                          onDelete={handleDelete}
                          onToggleRead={handleToggleRead}
                          salesMode={selectedFolder === 'sales-wacht' ? 'wacht' : selectedFolder === 'sales-beantwoord' ? 'beantwoord' : undefined}
                          onMarkeerBeantwoord={selectedFolder === 'sales-wacht' ? handleSalesMarkeerBeantwoord : undefined}
                          onWisWacht={selectedFolder === 'sales-wacht' ? handleSalesWisWacht : undefined}
                          onTerugNaarWacht={selectedFolder === 'sales-beantwoord' ? handleSalesTerugNaarWacht : undefined}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              {isLoadingMore && (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-petrol/40 mr-2" />
                  <span className="text-[12px] text-muted-foreground/80">Meer laden...</span>
                </div>
              )}
              {threadedEmails.length < imapTotal && !isLoadingMore && (
                <button
                  onClick={() => loadMoreEmails(selectedFolder)}
                  className="w-full py-4 text-[12px] text-muted-foreground hover:text-petrol hover:bg-petrol/[0.03] transition-colors duration-150"
                >
                  Meer laden ({threadedEmails.length} van {imapTotal})
                </button>
              )}
            </div>
          )}
        </div>
      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-card dark:border dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8 w-[360px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-[18px] font-bold text-foreground tracking-[-0.01em]">Sneltoetsen</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors duration-150">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              {KEYBOARD_SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-[14px] text-foreground/70">{s.action}</span>
                  <kbd className="px-2.5 py-1 bg-muted rounded-lg text-[12px] font-mono text-foreground/70">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      </>)}

      {/* Resize handle · sleep om lijst-kolom breedte aan te passen (desktop only) */}
      <div
        onMouseDown={handleListResizeStart}
        className="hidden md:block absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-petrol/20 active:bg-petrol/30 z-30 transition-colors"
        title="Sleep om breedte aan te passen"
      />
      </div>

      {/* ─── READER COLUMN · flex-1 op desktop, op mobile zichtbaar bij reading/composing ─── */}
      <div className={cn(
        'bg-white dark:bg-card flex-col min-w-0',
        'md:flex md:flex-1',
        viewMode === 'idle' ? 'hidden md:flex' : 'flex flex-1',
        selectedFolder === 'leads' && viewMode === 'idle' && 'hidden md:hidden',
      )}>

        {/* Compose view */}
        {viewMode === 'composing' && (
          <EmailCompose
            open={true}
            onOpenChange={(open) => { if (!open) handleBack() }}
            defaultTo={composeDefaults.to}
            defaultSubject={composeDefaults.subject}
            defaultBody={composeDefaults.body}
            defaultBodyIsBericht={composeDefaults.bodyIsBericht}
            replyToText={composeDefaults.replyToText}
            onSend={handleSendEmail}
            allEmails={emails}
            onToChange={setComposeToAddress}
            onRegisterActions={(a) => { composeActionsRef.current = a }}
            onForgieLoadingChange={setComposeForgieLoading}
            titel={selectedFolder === 'leads' ? 'Mail deze lead' : 'Nieuw bericht'}
            sluitLabel={selectedFolder === 'leads' ? 'Terug naar leads' : 'Terug naar inbox'}
          />
        )}

        {/* Reader view */}
        {viewMode === 'reading' && selectedEmail && (() => {
          const threadEmails = selectedEmail.thread_id
            ? emails
                .filter((e) => e.thread_id === selectedEmail.thread_id)
                .sort((a, b) => Date.parse(a.datum) - Date.parse(b.datum))
            : []
          return (
            <EmailReader
              email={selectedEmail}
              threadEmails={threadEmails}
              isLoadingBody={isLoadingBody}
              emailIndex={emailIndex}
              emailTotal={threadedEmails.length}
              allEmails={emails}
              imapFolder={IMAP_FOLDER_MAP[selectedFolder] || 'INBOX'}
              prefetchedAttachmentBytes={attachmentBytesCacheRef.current.get(selectedEmail.id)}
              prefetchedAttachmentUrls={attachmentUrlsCacheRef.current.get(selectedEmail.id)}
              onTogglePin={handleTogglePin}
              onSnooze={handleSnooze}
              onUnsnooze={handleUnsnooze}
              onToggleLabel={handleToggleLabel}
              onToggleRead={handleToggleRead}
              onDelete={handleDeleteAndNavigate}
              onArchive={handleArchiveAndNavigate}
              onBack={handleBack}
              onNavigate={handleNavigate}
              onSendReply={handleSendReply}
              onSelectEmail={handleSelectEmail}
              onOpenContextPanel={handleOpenContextPanel}
            />
          )
        })()}

        {/* Empty state · desktop only, getoond wanneer geen mail is geselecteerd */}
        {viewMode === 'idle' && (
          <div
            className="hidden md:flex flex-1 flex-col items-center justify-center text-center px-8 relative overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 70% 55% at 50% 32%, rgba(26,83,92,0.05), transparent 70%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(241,80,37,0.045), transparent 65%)',
            }}
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/[0.06] flex items-center justify-center shadow-[0_4px_20px_rgba(26,83,92,0.10),inset_0_0_0_0.5px_rgba(255,255,255,0.8)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_0_0_0.5px_rgba(255,255,255,0.10)]">
                <Mail className="h-7 w-7 text-petrol dark:text-[#7FB5BF]" strokeWidth={1.6} />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-flame ring-[3px] ring-background" />
            </div>
            <h3 className="font-heading text-[18px] font-bold text-foreground tracking-[-0.01em] mb-2">
              Niets geopend<span className="text-flame">.</span>
            </h3>
            <p
              className="text-[14px] text-muted-foreground max-w-[280px] leading-relaxed"
              style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
            >
              kies een bericht uit de lijst, dan lees je het hier rustig na.
            </p>
          </div>
        )}

      </div>

      {/* Bulk action bar · verschijnt onderaan zodra er emails zijn aangevinkt.
          Floating, met undo/cancel + de meest gebruikte bulk acties. */}
      {hasChecked && viewMode === 'idle' && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl shadow-xl px-3 py-2">
            <span className="text-[12px] font-medium px-2">
              {checkedEmails.size} geselecteerd
            </span>
            <div className="w-px h-5 bg-white/20" />
            <button
              type="button"
              onClick={handleBulkArchive}
              className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors"
              title="Archiveren"
            >
              <Archive className="h-3.5 w-3.5" />
              Archiveer
            </button>
            <button
              type="button"
              onClick={handleBulkMarkRead}
              className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors"
              title="Markeer als gelezen"
            >
              <MailOpen className="h-3.5 w-3.5" />
              Gelezen
            </button>
            <button
              type="button"
              onClick={handleBulkMarkUnread}
              className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors"
              title="Markeer als ongelezen"
            >
              <Mail className="h-3.5 w-3.5" />
              Ongelezen
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md hover:bg-[#C0451A]/20 hover:text-[#FDA38C] transition-colors"
              title="Verwijderen"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Verwijder
            </button>
            <div className="w-px h-5 bg-white/20" />
            <button
              type="button"
              onClick={clearChecked}
              className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-white/10 transition-colors"
              title="Selectie wissen (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Right context sidebar · opent via toggle-knop in email-header.
          Bevat klant-koppeling, project-aanmaken, taak-aanmaken, etc.
          Default open, klap dicht via knop in reader. */}
      {/* EmailContextSidebar wordt onzichtbaar gemount (display:none) wanneer
          een dropdown-actie wordt geklikt. De Dialogs binnenin (Klant/Project/
          Taak) gebruiken Radix Portal en renderen dus visible bovenop alles —
          de sidebar zelf hoeft niet zichtbaar te zijn. */}
      {contextOpen && (viewMode === 'reading' || viewMode === 'composing') && (
        <div className="hidden" aria-hidden>
          <EmailContextSidebar
            key={panelKey}
            initialActivePanel={requestedPanel}
            mode={viewMode === 'composing' ? 'compose' : 'reading'}
            composeToAddress={composeToAddress}
            composeReminder={composeReminder}
            onComposeReminderChange={setComposeReminder}
            composeProjectId={composeProjectId}
            onComposeProjectChange={setComposeProjectId}
            allEmails={emails}
            email={selectedEmail}
            senderName={readerSenderName}
            senderEmail={readerSenderEmail}
            onSelectEmail={handleSelectEmail}
            onCompose={() => handleCompose()}
            unreadCount={serverTellers?.inboxOngelezen ?? emails.filter(e => !e.gelezen).length}
            onClose={() => setContextOpen(false)}
          />
        </div>
      )}
      </div>
      </>
      )}
    </div>
  )
}
