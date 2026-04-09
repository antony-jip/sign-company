import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Search, Pencil, Inbox, Send, FileEdit, Trash2,
  Loader2, Archive, RefreshCw, CheckCheck, X, Mail, MailOpen,
  Rows3, StretchHorizontal, Clock, Pin,
} from 'lucide-react'
import { IngeplandeBerichtenLijst } from './IngeplandeBerichtenLijst'
import { sendEmail as sendEmailViaApi, fetchEmailsFromIMAP, readEmailFromIMAP } from '@/services/gmailService'
import type { IMAPEmailSummary } from '@/services/gmailService'
import { getEmails, getEmailBody, updateEmail, deleteEmail as deleteEmailDb } from '@/services/supabaseService'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailContextSidebar } from './EmailContextSidebar'
import { EmailCompose } from './EmailCompose'
import type { ComposeActions } from './EmailCompose'
import { EmailListItem } from './EmailListItem'
import type { Email } from '@/types'
import { logger } from '../../utils/logger'
import type { AutoFollowUp, EmailFolder, FilterType, FontSize, ViewMode } from './emailTypes'
import { extractSenderEmail, extractSenderName, parseSearchQuery, IMAP_FOLDER_MAP, KEYBOARD_SHORTCUTS, calculateSnoozeDate } from './emailHelpers'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'

// Folder config
const folderTabs: { id: EmailFolder; label: string; icon: React.ElementType }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'verzonden', label: 'Verzonden', icon: Send },
  { id: 'concepten', label: 'Concepten', icon: FileEdit },
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

// Filter config
const filtersList: { id: FilterType; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'ongelezen', label: 'Ongelezen' },
  { id: 'vastgepind', label: 'Vastgepind' },
  { id: 'bijlagen', label: 'Bijlagen' },
]

const folderIds: EmailFolder[] = ['inbox', 'verzonden', 'concepten', 'gepland', 'gesnoozed', 'prullenbak']

// ─── Helper: convert IMAP message to Email ───
function imapToEmail(msg: IMAPEmailSummary, folder: string, userId: string): Email {
  return {
    id: String(msg.uid),
    user_id: userId,
    gmail_id: String(msg.uid),
    van: msg.fromName ? `${msg.fromName} <${msg.from}>` : msg.from,
    aan: msg.to,
    onderwerp: msg.subject,
    inhoud: '',
    datum: msg.date,
    gelezen: msg.isRead,
    labels: [],
    bijlagen: msg.hasAttachments ? 1 : 0,
    map: folder === 'INBOX' ? 'inbox' : folder.toLowerCase(),
    created_at: msg.date,
    updated_at: msg.date,
  }
}

export function EmailLayout() {
  const { user } = useAuth()
  const { emailFetchLimit, emailHandtekening } = useAppSettings()

  // ─── Core state ───
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [viewMode, setViewMode] = useState<ViewMode>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [filter, setFilter] = useState<FilterType>('alle')
  const [fontSize, setFontSize] = useState<FontSize>('medium')
  const [listStyle, setListStyle] = useState<'inline' | 'stacked'>(() => {
    try { return (localStorage.getItem('email_list_style') as 'inline' | 'stacked') || 'stacked' } catch (err) { return 'stacked' }
  })

  // ─── Loading state ───
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingBody, setIsLoadingBody] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [useIMAP, setUseIMAP] = useState(false)
  const [imapTotal, setImapTotal] = useState(0)

  // ─── Compose state ───
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string; subject?: string; body?: string
  }>({})

  // ─── Compose-sidebar communication ───
  const [composeToAddress, setComposeToAddress] = useState('')
  const [composeReminder, setComposeReminder] = useState<string | null>(null)
  const [composeForgieLoading, setComposeForgieLoading] = useState(false)
  const composeActionsRef = useRef<ComposeActions | null>(null)
  const [composeAutoFollowUp, setComposeAutoFollowUp] = useState<AutoFollowUp>({ enabled: false, dagen: 3, mode: 'auto' })

  // ─── Location-based compose detection ───
  const location = useLocation()
  useEffect(() => {
    if (location.pathname.endsWith('/email/compose')) {
      const params = new URLSearchParams(location.search)
      setComposeDefaults({
        to: params.get('to') || undefined,
        subject: params.get('subject') || undefined,
        body: params.get('body') || undefined,
      })
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

  const fetchLimit = emailFetchLimit || 200

  // Refs for values used in loadEmails — prevents effect re-runs on auth/settings changes
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
    return normalizeEmails(raw)
  }

  // ─── Trigger IMAP sync (background, writes to Supabase) ───
  async function triggerImapSync(folder: string): Promise<{ total: number; synced: number }> {
    const result = await fetchEmailsFromIMAP(folder, fetchLimitRef.current, 0)
    if (result.errors) {
      console.warn('[Email] Sync errors:', result.errors)
    }
    return { total: result.total || 0, synced: result.synced || 0 }
  }

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
              console.log(`[Email] Sync klaar: ${synced} gesynct, ${total} totaal`)
              setImapTotal(total)
              setUseIMAP(true)
              // Re-read from Supabase after sync
              const fresh = await readFromSupabase()
              if (fresh.length > 0) setEmails(fresh)
            })
            .catch((err) => {
              console.warn('[Email] Achtergrond IMAP sync mislukt:', err?.message || err)
            })
          return
        }

        // Step 1b: No Supabase data — need to wait for IMAP sync
        try {
          const { total } = await triggerImapSync('INBOX')
          setImapTotal(total)
          setUseIMAP(true)
          // Read synced emails from Supabase
          const synced = await readFromSupabase()
          setEmails(synced)
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

  // ─── Filtering (inline from useEmailFilters) ───
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    folderIds.forEach((id) => {
      if (id === 'inbox') counts[id] = emails.filter((e) => e.map === 'inbox' && !e.gelezen).length
      else if (id === 'concepten') counts[id] = emails.filter((e) => e.map === 'concepten').length
      else if (id === 'gepland') counts[id] = emails.filter((e) => e.map === 'gepland').length
      else if (id === 'gesnoozed') counts[id] = emails.filter((e) => e.snoozed_until).length
      else counts[id] = 0
    })
    return counts
  }, [emails])

  const filteredEmails = useMemo(() => {
    let filtered = selectedFolder === 'gesnoozed'
      ? emails.filter((e) => e.snoozed_until)
      : emails.filter((e) => e.map === selectedFolder && !e.snoozed_until)

    if (searchQuery.trim()) {
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
  }, [emails, selectedFolder, searchQuery, filter])

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

  const handleToggleRead = useCallback((email: Email) => {
    const newGelezen = !email.gelezen
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, gelezen: newGelezen } : e)))
    setSelectedEmail((prev) => prev?.id === email.id ? { ...prev, gelezen: newGelezen } : prev)
    updateEmail(email.id, { gelezen: newGelezen }).catch(() => {})
  }, [])

  const handleArchive = useCallback((email: Email) => {
    setEmails((prev) => prev.filter((e) => e.id !== email.id))
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email gearchiveerd')
  }, [])

  const handleDelete = useCallback((email: Email) => {
    if (email.map === 'prullenbak') {
      setEmails((prev) => prev.filter((e) => e.id !== email.id))
      deleteEmailDb(email.id).catch(() => {})
    } else {
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e))
      updateEmail(email.id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {})
    }
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email verwijderd')
  }, [])

  // ─── Refresh: IMAP sync in background, re-read from Supabase ───
  const handleRefresh = useCallback(async (folder: EmailFolder, silent = false) => {
    if (!silent) setIsRefreshing(true)
    const imapFolder = IMAP_FOLDER_MAP[folder] || 'INBOX'
    triggerImapSync(imapFolder)
      .then(async ({ total }) => {
        setImapTotal(total)
        const fresh = await readFromSupabase()
        if (fresh.length > 0) setEmails(fresh)
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
    // Read from Supabase only — no IMAP sync on folder switch
    try {
      const cached = await readFromSupabase()
      setEmails(cached)
    } catch (err) { logger.error('Folder load failed:', err) }
    finally { setIsLoading(false) }
  }, [])

  // ─── Load more (infinite scroll) ───
  const loadMoreEmails = useCallback(async (folder: EmailFolder) => {
    if (isLoadingMore) return
    const currentCount = emails.length
    if (imapTotal > 0 && currentCount >= imapTotal) return
    setIsLoadingMore(true)
    try {
      const imapFolder = IMAP_FOLDER_MAP[folder] || 'INBOX'
      const result = await fetchEmailsFromIMAP(imapFolder, fetchLimitRef.current, currentCount)
      if (result.emails && Array.isArray(result.emails) && result.emails.length > 0) {
        const moreEmails = result.emails.map((msg) => imapToEmail(msg, imapFolder, userIdRef.current || ''))
        setEmails((prev) => [...prev, ...moreEmails])
      } else {
        // Sync-first: re-read from Supabase
        const fresh = await readFromSupabase()
        setEmails(fresh)
      }
      setImapTotal(result.total || 0)
    } catch (err) {
      logger.error('Load more emails failed:', err)
      toast.error('Kon meer emails niet laden')
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, emails.length, imapTotal])

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
          return body
        }

        // Step 2: IMAP fallback
        const uid = Number(email.gmail_id || email.id)
        if (isNaN(uid)) return ''
        const detail = await readEmailFromIMAP(uid, IMAP_FOLDER_MAP[folder] || 'INBOX')
        const imapBody = detail.bodyHtml || detail.bodyText || ''
        bodyCacheRef.current.set(email.id, imapBody)
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

  // Prefetch on hover — vult cache op de achtergrond, geen UI feedback.
  const prefetchEmailBody = useCallback((email: Email) => {
    if (bodyCacheRef.current.has(email.id)) return
    if (email.inhoud) return
    void fetchBodyToCache(email, selectedFolder)
  }, [fetchBodyToCache, selectedFolder])

  const loadEmailBody = useCallback(async (email: Email, folder: EmailFolder): Promise<Email> => {
    const cached = bodyCacheRef.current.get(email.id)
    if (cached !== undefined) return { ...email, gelezen: true, inhoud: cached }
    if (email.inhoud) return { ...email, gelezen: true }

    setIsLoadingBody(true)
    try {
      const body = await fetchBodyToCache(email, folder)
      return { ...email, gelezen: true, inhoud: body }
    } finally {
      setIsLoadingBody(false)
    }
  }, [fetchBodyToCache])

  // ─── Polling: silent background sync every 3min ───
  // No window focus sync — too aggressive (full IMAP connection each time)
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      handleRefresh(selectedFolder, true)
    }, 180000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [selectedFolder, handleRefresh])

  // ─── Keyboard shortcuts (inline from useEmailKeyboard) ───
  const callbacksRef = useRef({ handleTogglePin, handleArchive, handleDelete })
  callbacksRef.current = { handleTogglePin, handleArchive, handleDelete }
  const emailsRef = useRef(threadedEmails)
  emailsRef.current = threadedEmails
  const focusedRef = useRef(focusedIndex)
  focusedRef.current = focusedIndex

  useEffect(() => {
    if (viewMode !== 'idle') return
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const idx = focusedRef.current
      const cb = callbacksRef.current
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

  // ─── Handlers ───
  const handleSelectEmail = useCallback(async (email: Email, e?: React.MouseEvent) => {
    // Shift / Cmd / Ctrl klik → toggle checkbox ipv mail openen.
    // Zo kan je makkelijk meerdere mails selecteren voor bulk acties.
    if (e && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      toggleCheckEmail(email.id, e)
      return
    }
    // Normale klik: open de mail
    setEmails(prev => prev.map(em => em.id === email.id ? { ...em, gelezen: true } : em))
    setSelectedEmail({ ...email, gelezen: true })
    setViewMode('reading')

    // Load body in background (async)
    loadEmailBody(email, selectedFolder).then((withBody) => {
      setSelectedEmail(withBody)
    })
  }, [loadEmailBody, selectedFolder, toggleCheckEmail])

  const handleCompose = useCallback((defaults?: { to?: string; subject?: string; body?: string }) => {
    setComposeDefaults(defaults || {})
    setViewMode('composing')
    setSelectedEmail(null)
  }, [])

  const handleReply = useCallback((email: Email) => {
    handleCompose({
      to: extractSenderEmail(email.van),
      subject: email.onderwerp.startsWith('Re: ') ? email.onderwerp : `Re: ${email.onderwerp}`,
      body: `\n\n---------- Oorspronkelijk bericht ----------\nVan: ${email.van}\nDatum: ${email.datum}\n\n${email.inhoud?.replace(/<[^>]*>/g, '') || ''}`,
    })
  }, [handleCompose])

  const handleForward = useCallback((email: Email) => {
    handleCompose({
      subject: email.onderwerp.startsWith('Fwd: ') ? email.onderwerp : `Fwd: ${email.onderwerp}`,
      body: `\n\n---------- Doorgestuurd bericht ----------\nVan: ${email.van}\nDatum: ${email.datum}\nOnderwerp: ${email.onderwerp}\n\n${email.inhoud?.replace(/<[^>]*>/g, '') || ''}`,
    })
  }, [handleCompose])

  const handleSendEmail = useCallback(async (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string; autoFollowUp?: AutoFollowUp; attachments?: Array<{ filename: string; content: string; encoding: 'base64' }> }) => {
    try {
      let opvolgingId: string | undefined

      // Als auto-opvolging aan staat, maak het record aan in Supabase
      if (data.autoFollowUp?.enabled && user) {
        try {
          const { createEmailOpvolging } = await import('@/services/supabaseService')
          const geplandOp = new Date()
          geplandOp.setDate(geplandOp.getDate() + data.autoFollowUp.dagen)

          const opvolging = await createEmailOpvolging({
            email_id: '',
            ontvanger: data.to,
            onderwerp: data.subject,
            oorspronkelijke_body: data.body,
            dagen: data.autoFollowUp.dagen,
            status: 'wachtend',
            gepland_op: geplandOp.toISOString(),
            user_id: user.id,
            organisatie_id: (user.user_metadata as Record<string, unknown>)?.organisatie_id as string || '',
            handtekening: emailHandtekening || '',
            message_id: '',
            opvolg_body: data.autoFollowUp.mode === 'handmatig' ? data.autoFollowUp.customTekst : undefined,
          })
          opvolgingId = opvolging.id
        } catch (err) {
          logger.error('Auto-opvolging record aanmaken mislukt:', err)
          // Niet fataal, email wordt alsnog verstuurd
        }
      }

      await sendEmailViaApi(data.to, data.subject, data.body, {
        html: data.html,
        scheduledAt: data.scheduledAt,
        opvolging_id: opvolgingId,
        attachments: data.attachments,
      })

      // Reset auto-opvolging state na succesvol verzenden
      if (data.autoFollowUp?.enabled) {
        setComposeAutoFollowUp({ enabled: false, dagen: 3, mode: 'auto' })
      }
    } catch (err) {
      logger.error('Email verzenden mislukt:', err)
      throw err
    }
  }, [user, emailHandtekening])

  const handleSendReply = useCallback(async (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string; attachments?: Array<{ filename: string; content: string; encoding: 'base64' }> }) => {
    try {
      // Threading: geef message_id en thread_id mee zodat de verzonden
      // mail aan dezelfde thread wordt gekoppeld als de originele mail.
      const replyToMessageId = selectedEmail?.gmail_id
        ? undefined // gmail_id is een UID, niet een Message-ID
        : (selectedEmail as Record<string, unknown>)?.message_id as string | undefined
      const replyThreadId = selectedEmail?.thread_id || undefined

      await sendEmailViaApi(data.to, data.subject, data.body, {
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
    setSelectedFolder(folder)
    setSelectedEmail(null)
    setViewMode('idle')
    setFilter('alle')
    setSearchQuery('')
    setSearchInput('')
    clearChecked()
    handleFolderLoad(folder)
  }, [clearChecked, handleFolderLoad])

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchQuery(value), 200)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedEmail(null)
    setViewMode('idle')
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
      loadMoreEmails(selectedFolder)
    }
  }, [isLoadingMore, loadMoreEmails, selectedFolder])

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

  // ─── UNIFIED 3-COLUMN LAYOUT ───
  return (
    <div className={cn('h-full flex flex-col -m-3 sm:-m-4 md:-m-6 overflow-hidden', viewMode === 'idle' ? 'bg-[#F8F7F5]' : 'bg-white')}>
      {viewMode === 'idle' && (
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-4">
              <h1 className="text-[28px] font-extrabold tracking-[-0.3px] text-[#1A1A1A]">
                Email<span className="text-[#F15025]">.</span>
              </h1>
              <span className="text-[12px] font-mono tabular-nums text-[#B0ADA8] bg-[#F0EFEC] rounded-md px-2 py-0.5">
                {folderCounts['inbox'] > 0 ? `${folderCounts['inbox']} ongelezen` : 'inbox'}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ─── LEFT SIDEBAR — always visible ─── */}
      <div className="w-[220px] bg-white border-r border-[#EBEBEB] flex flex-col flex-shrink-0">
        <div className="p-3">
          <button
            className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold text-white bg-[#F15025] shadow-[0_2px_8px_rgba(241,80,37,0.25)] hover:shadow-[0_4px_12px_rgba(241,80,37,0.35)] hover:-translate-y-px active:translate-y-0 transition-all"
            onClick={() => handleCompose()}
          >
            <Pencil className="h-4 w-4" />
            Nieuw bericht
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {folderTabs.map(folder => {
            const isActive = selectedFolder === folder.id
            const count = folderCounts[folder.id]
            const Icon = folder.icon
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                className={cn(
                  'w-full h-[40px] flex items-center gap-2.5 px-3 rounded-lg text-[13px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#1A535C]/[0.07] text-[#1A535C] font-semibold'
                    : 'text-[#6B6B66] hover:bg-[#F0EFEC]/60 hover:text-[#4A4A46]',
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-[#1A535C]')} />
                <span className="flex-1 text-left">{folder.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[11px] font-mono px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                    folder.id === 'inbox' && isActive
                      ? 'bg-[#1A535C] text-white'
                      : folder.id === 'inbox'
                        ? 'bg-[#1A535C]/10 text-[#1A535C]'
                        : 'text-[#9B9B95]',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          <div className="my-2 border-t border-[#EBEBEB]/60" />

          <button
            onClick={() => handleFolderChange('gepland')}
            className={cn(
              'w-full h-[40px] flex items-center gap-2.5 px-3 rounded-lg text-[13px] font-medium transition-all duration-150',
              selectedFolder === 'gepland'
                ? 'bg-[#1A535C]/[0.07] text-[#1A535C] font-semibold'
                : 'text-[#6B6B66] hover:bg-[#F0EFEC]/60 hover:text-[#4A4A46]',
            )}
          >
            <Clock className={cn('h-4 w-4 flex-shrink-0', selectedFolder === 'gepland' && 'text-[#1A535C]')} />
            <span className="flex-1 text-left">Ingeplande berichten</span>
          </button>
        </nav>

        <div className="px-4 py-3 border-t border-[#EBEBEB]">
          <div className="flex items-center gap-2 text-[11px] text-[#B0ADA8]">
            <Mail className="h-3 w-3" />
            <span>Doen. Mail</span>
          </div>
        </div>
      </div>

      {/* ─── MIDDLE: content area ─── */}
      <div className="flex-1 bg-white flex flex-col min-w-0">

      {/* Compose view — full width like reader */}
      {viewMode === 'composing' && (
        <EmailCompose
          open={true}
          onOpenChange={(open) => { if (!open) handleBack() }}
          defaultTo={composeDefaults.to}
          defaultSubject={composeDefaults.subject}
          defaultBody={composeDefaults.body}
          onSend={handleSendEmail}
          allEmails={emails}
          onToChange={setComposeToAddress}
          onRegisterActions={(a) => { composeActionsRef.current = a }}
          onForgieLoadingChange={setComposeForgieLoading}
          autoFollowUp={composeAutoFollowUp}
          onAutoFollowUpChange={setComposeAutoFollowUp}
        />
      )}

      {/* Reader view */}
      {viewMode === 'reading' && selectedEmail && (() => {
        // Bouw thread voor de geselecteerde mail: alle mails met hetzelfde
        // thread_id, oudste eerst zodat het een natuurlijke conversatie is.
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
            onTogglePin={handleTogglePin}
            onToggleRead={handleToggleRead}
            onDelete={handleDeleteAndNavigate}
            onArchive={handleArchiveAndNavigate}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onSendReply={handleSendReply}
            onSelectEmail={handleSelectEmail}
          />
        )
      })()}

      {/* Ingeplande berichten lijst (idle + gepland folder) */}
      {viewMode === 'idle' && selectedFolder === 'gepland' && (
        <IngeplandeBerichtenLijst />
      )}

      {/* Email list (idle view) */}
      {viewMode === 'idle' && selectedFolder !== 'gepland' && (<>
        {/* Toolbar */}
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-[#EBEBEB] flex-shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked }}
              onChange={toggleCheckAll}
              className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-[#1A535C]"
            />

            {hasChecked ? (
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] rounded-lg" onClick={handleBulkArchive}>
                  <Archive className="h-3.5 w-3.5" /> Archief
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] rounded-lg" onClick={handleBulkDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Verwijder
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-[12px] gap-1.5 text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] rounded-lg" onClick={handleBulkMarkRead}>
                  <CheckCheck className="h-3.5 w-3.5" /> Gelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-[12px] text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] rounded-lg" onClick={handleBulkMarkUnread}>
                  Ongelezen
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 bg-[#F0EFEC] rounded-xl p-0.5">
                {filtersList.map(f => {
                  const isActiveFilter = filter === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-[13px] transition-all duration-150',
                        isActiveFilter
                          ? 'bg-white text-[#1A1A1A] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                          : 'text-[#9B9B95] hover:text-[#6B6B66]',
                      )}
                    >
                      {f.label}
                      {f.id === 'ongelezen' && filterCounts.ongelezen > 0 && (
                        <span className={cn(
                          'ml-1 font-semibold',
                          isActiveFilter ? 'text-[#1A535C]' : 'text-[#1A535C]/60',
                        )}>{filterCounts.ongelezen}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <div className="flex items-center bg-[#F0EFEC] rounded-xl p-0.5 mr-1">
              {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={cn(
                    'px-1.5 py-1 rounded transition-all duration-150',
                    fontSize === size
                      ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-[#9B9B95] hover:text-[#6B6B66]',
                  )}
                  title={size === 'small' ? 'Klein' : size === 'medium' ? 'Normaal' : 'Groot'}
                >
                  <span className={cn(
                    'font-semibold leading-none',
                    size === 'small' && 'text-[10px]',
                    size === 'medium' && 'text-[12px]',
                    size === 'large' && 'text-[14px]',
                  )}>A</span>
                </button>
              ))}
            </div>
            <div className="flex items-center bg-[#F0EFEC] rounded-xl p-0.5 mr-1">
              <button
                onClick={() => { setListStyle('stacked'); localStorage.setItem('email_list_style', 'stacked') }}
                className={cn(
                  'p-1.5 rounded transition-all duration-150',
                  listStyle === 'stacked'
                    ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#9B9B95] hover:text-[#6B6B66]',
                )}
                title="Compact — alles op één regel"
              >
                <StretchHorizontal className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setListStyle('inline'); localStorage.setItem('email_list_style', 'inline') }}
                className={cn(
                  'p-1.5 rounded transition-all duration-150',
                  listStyle === 'inline'
                    ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-[#9B9B95] hover:text-[#6B6B66]',
                )}
                title="Standaard — twee regels"
              >
                <Rows3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#9B9B95] hover:text-[#6B6B66] hover:bg-[#F0EFEC] rounded-lg transition-colors duration-150"
              onClick={() => handleRefresh(selectedFolder)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Search bar — always visible */}
        <div className="px-4 py-2 border-b border-[#EBEBEB]">
          <div className="flex items-center gap-2 h-9 px-3 bg-[#F8F7F5] rounded-lg focus-within:ring-2 focus-within:ring-[#1A535C]/20 transition-shadow">
            <Search className="h-4 w-4 text-[#9B9B95] flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Zoek in emails..."
              className="flex-1 bg-transparent text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#9B9B95]"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearchQuery('') }} className="p-1 hover:bg-[#EBEBEB] rounded">
                <X className="h-3.5 w-3.5 text-[#9B9B95]" />
              </button>
            )}
          </div>
        </div>

        {/* Email list */}
        <div
          ref={emailListRef}
          className="flex-1 overflow-y-auto scroll-smooth"
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#1A535C]/40" />
              <p className="text-[14px] text-[#B0ADA8]">Emails laden...</p>
            </div>
          ) : threadedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-[#F0EFEC] flex items-center justify-center mb-5">
                <Inbox className="h-6 w-6 text-[#B0ADA8]" />
              </div>
              <h3 className="text-[14px] font-medium text-[#6B6B66] mb-1.5">
                {searchQuery ? 'Geen resultaten' : filter !== 'alle' ? 'Geen emails met dit filter' : 'Inbox is leeg'}
              </h3>
              <p className="text-[13px] text-[#9B9B95] max-w-[260px] leading-relaxed">
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
              {(() => {
                // Datum-groepering: voeg sticky labels in tussen rijen wanneer
                // de datum-groep verandert (Vandaag, Gisteren, Deze week, etc).
                const getDateGroup = (dateStr: string): string => {
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
                  if (target.getMonth() === today.getMonth() && target.getFullYear() === today.getFullYear()) {
                    return 'Eerder deze maand'
                  }
                  if (target.getFullYear() === today.getFullYear()) return 'Eerder dit jaar'
                  return 'Vorig jaar of ouder'
                }

                const nodes: React.ReactNode[] = []
                let lastGroup: string | null = null
                let inPinnedSection = threadedEmails.length > 0 && !!threadedEmails[0].pinned
                if (inPinnedSection) {
                  nodes.push(
                    <div
                      key="pinned-header"
                      className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-[#1A535C] bg-[#1A535C]/[0.04] border-y border-[#1A535C]/10 sticky top-0 z-[1] flex items-center gap-1.5"
                    >
                      <Pin className="h-3 w-3 fill-[#1A535C] -rotate-45" />
                      Vastgepind
                    </div>
                  )
                }
                threadedEmails.forEach((email, index) => {
                  // Overgang van pinned-sectie naar normale lijst → reset group label
                  if (inPinnedSection && !email.pinned) {
                    inPinnedSection = false
                    lastGroup = null
                  }

                  if (!inPinnedSection) {
                    const group = getDateGroup(email.datum)
                    if (group !== lastGroup) {
                      nodes.push(
                        <div
                          key={`group-${group}-${index}`}
                          className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-[#9B9B95] bg-[#FAFAF8] border-y border-[#F0EFEC]/60 sticky top-0 z-[1]"
                        >
                          {group}
                        </div>
                      )
                      lastGroup = group
                    }
                  }
                  nodes.push(
                    <EmailListItem
                      key={email.id}
                      email={email}
                      isActive={selectedEmail?.id === email.id}
                      isChecked={checkedEmails.has(email.id)}
                      isFocused={focusedIndex === index}
                      fontSize={fontSize}
                      stacked={listStyle === 'stacked'}
                      onSelect={handleSelectEmail}
                      onTogglePin={handleTogglePin}
                      onToggleCheck={toggleCheckEmail}
                      onPrefetch={prefetchEmailBody}
                      onArchive={handleArchive}
                      onDelete={handleDelete}
                      onToggleRead={handleToggleRead}
                    />
                  )
                })
                return nodes
              })()}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-[#1A535C]/40 mr-2" />
                  <span className="text-[12px] text-[#B0ADA8]">Meer laden...</span>
                </div>
              )}
              {threadedEmails.length < imapTotal && !isLoadingMore && (
                <button
                  onClick={() => loadMoreEmails(selectedFolder)}
                  className="w-full py-4 text-[12px] text-[#9B9B95] hover:text-[#1A535C] hover:bg-[#1A535C]/[0.03] transition-colors duration-150"
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8 w-[360px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]">Sneltoetsen</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1.5 hover:bg-[#F0EFEC] rounded-lg transition-colors duration-150">
                <X className="h-4 w-4 text-[#9B9B95]" />
              </button>
            </div>
            <div className="space-y-3">
              {KEYBOARD_SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-[14px] text-[#6B6B66]">{s.action}</span>
                  <kbd className="px-2.5 py-1 bg-[#F0EFEC] rounded-lg text-[12px] font-mono text-[#6B6B66]">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      </>)}
      </div>

      {/* Bulk action bar — verschijnt onderaan zodra er emails zijn aangevinkt.
          Floating, met undo/cancel + de meest gebruikte bulk acties. */}
      {hasChecked && viewMode === 'idle' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
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

      {/* Right context sidebar — alleen tijdens lezen of compose, niet in
          de inbox-idle view zodat de email lijst de volledige breedte krijgt. */}
      {(viewMode === 'reading' || viewMode === 'composing') && (
        <EmailContextSidebar
          mode={viewMode === 'composing' ? 'compose' : 'reading'}
          composeToAddress={composeToAddress}
          composeReminder={composeReminder}
          onComposeReminderChange={setComposeReminder}
          allEmails={emails}
          email={selectedEmail}
          senderName={readerSenderName}
          senderEmail={readerSenderEmail}
          onSelectEmail={handleSelectEmail}
          onCompose={() => handleCompose()}
          autoFollowUp={composeAutoFollowUp}
          onAutoFollowUpChange={setComposeAutoFollowUp}
          unreadCount={emails.filter(e => !e.gelezen).length}
        />
      )}
      </div>
    </div>
  )
}
