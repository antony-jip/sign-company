import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Search, Pencil, Inbox, Send, FileEdit, Trash2,
  Loader2, Archive, RefreshCw, CheckCheck, X, Mail,
} from 'lucide-react'
import { sendEmail as sendEmailViaApi, fetchEmailsFromIMAP, readEmailFromIMAP } from '@/services/gmailService'
import type { IMAPEmailSummary } from '@/services/gmailService'
import { getEmails, getKlanten, updateEmail, deleteEmail as deleteEmailDb, cacheEmailsToSupabase, getCachedEmails as getSupabaseCachedEmails } from '@/services/supabaseService'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailCompose } from './EmailCompose'
import { EmailListItem } from './EmailListItem'
import type { Email } from '@/types'
import { logger } from '../../utils/logger'
import type { EmailFolder, FilterType, FontSize, ViewMode } from './emailTypes'
import { extractSenderEmail, parseSearchQuery, IMAP_FOLDER_MAP, KEYBOARD_SHORTCUTS, calculateSnoozeDate } from './emailHelpers'
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
  { id: 'met-ster', label: 'Met ster' },
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
    starred: false,
    labels: [],
    bijlagen: msg.hasAttachments ? 1 : 0,
    map: folder === 'INBOX' ? 'inbox' : folder.toLowerCase(),
    created_at: msg.date,
    updated_at: msg.date,
  }
}

export function EmailLayout() {
  const { user } = useAuth()
  const { emailFetchLimit } = useAppSettings()

  // ─── Core state ───
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [viewMode, setViewMode] = useState<ViewMode>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [filter, setFilter] = useState<FilterType>('alle')
  const [showSearch, setShowSearch] = useState(false)
  const [fontSize, setFontSize] = useState<FontSize>('medium')

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

  // ─── Selection state (bulk actions) ───
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set())

  // ─── Keyboard state ───
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // ─── Refs ───
  const emailListRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bodyCacheRef = useRef<Map<string, string>>(new Map())

  const fetchLimit = emailFetchLimit || 200

  // ─── SessionStorage cache for instant display ───
  const getCachedEmails = useCallback((folder: string): Email[] | null => {
    try {
      const cached = sessionStorage.getItem(`forgedesk_emails_${folder}`)
      if (!cached) return null
      const { emails: cachedEmails, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp > 5 * 60 * 1000) return null
      return cachedEmails
    } catch { return null }
  }, [])

  const setCachedEmails = useCallback((folder: string, emailData: Email[]) => {
    try {
      sessionStorage.setItem(`forgedesk_emails_${folder}`, JSON.stringify({
        emails: emailData,
        timestamp: Date.now(),
      }))
    } catch { /* storage full */ }
  }, [])

  // ─── Load emails from IMAP (with Supabase fallback) ───
  const loadEmails = useCallback(async (folder?: string) => {
    const imapFolder = folder || 'INBOX'
    try {
      const result = await fetchEmailsFromIMAP(imapFolder, fetchLimit, 0)
      setImapTotal(result.total)
      setUseIMAP(true)
      const emailData = result.emails.map((msg) => imapToEmail(msg, imapFolder, user?.id || ''))
      setCachedEmails(imapFolder, emailData)
      if (user?.id) {
        cacheEmailsToSupabase(user.id, result.emails, imapFolder).catch(() => {})
      }
      return emailData
    } catch {
      if (user?.id) {
        const dbCached = await getSupabaseCachedEmails(user.id, imapFolder).catch(() => null)
        if (dbCached && dbCached.length > 0) {
          setUseIMAP(false)
          return dbCached
        }
      }
      setUseIMAP(false)
      return await getEmails().catch(() => [])
    }
  }, [fetchLimit, user?.id, setCachedEmails])

  // ─── Initial load ───
  useEffect(() => {
    let cancelled = false
    const cached = getCachedEmails('INBOX')
    if (cached && cached.length > 0) {
      setEmails(cached)
      setIsLoading(false)
      loadEmails().then((emailData) => {
        if (!cancelled) setEmails(emailData)
      })
    } else {
      setIsLoading(true)
      loadEmails()
        .then((emailData) => { if (!cancelled) setEmails(emailData) })
        .finally(() => { if (!cancelled) setIsLoading(false) })
    }
    return () => { cancelled = true }
  }, [loadEmails, getCachedEmails])

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
        if (has === 'ster' || has === 'star') filtered = filtered.filter((e) => e.starred)
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
      case 'met-ster': filtered = filtered.filter((e) => e.starred); break
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

  const toggleCheckEmail = useCallback((id: string) => {
    setCheckedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
  const handleToggleStar = useCallback((email: Email) => {
    const newStarred = !email.starred
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, starred: newStarred } : e)))
    setSelectedEmail((prev) => prev?.id === email.id ? { ...prev, starred: newStarred } : prev)
    updateEmail(email.id, { starred: newStarred }).catch(() => {})
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

  // ─── Refresh & folder change ───
  const handleRefresh = useCallback(async (folder: EmailFolder) => {
    setIsRefreshing(true)
    try {
      const emailData = await loadEmails(IMAP_FOLDER_MAP[folder] || 'INBOX')
      setEmails(emailData)
      toast.success('Inbox vernieuwd')
    } catch {
      toast.error('Kon emails niet vernieuwen')
    } finally {
      setIsRefreshing(false)
    }
  }, [loadEmails])

  const handleFolderLoad = useCallback(async (folder: EmailFolder) => {
    if (!useIMAP) return
    setIsLoading(true)
    try {
      const emailData = await loadEmails(IMAP_FOLDER_MAP[folder] || 'INBOX')
      setEmails(emailData)
    } catch { /* keep existing */ }
    finally { setIsLoading(false) }
  }, [useIMAP, loadEmails])

  // ─── Load more (infinite scroll) ───
  const loadMoreEmails = useCallback(async (folder: EmailFolder) => {
    if (!useIMAP || isLoadingMore) return
    const imapFolder = IMAP_FOLDER_MAP[folder] || 'INBOX'
    const currentCount = emails.length
    if (currentCount >= imapTotal) return
    setIsLoadingMore(true)
    try {
      const result = await fetchEmailsFromIMAP(imapFolder, fetchLimit, currentCount)
      const moreEmails = result.emails.map((msg) => imapToEmail(msg, imapFolder, user?.id || ''))
      setEmails((prev) => [...prev, ...moreEmails])
      setImapTotal(result.total)
    } catch {
      toast.error('Kon meer emails niet laden')
    } finally {
      setIsLoadingMore(false)
    }
  }, [useIMAP, isLoadingMore, emails.length, imapTotal, fetchLimit, user?.id])

  // ─── Load email body ───
  const loadEmailBody = useCallback(async (email: Email, folder: EmailFolder): Promise<Email> => {
    const cached = bodyCacheRef.current.get(email.id)
    if (cached) return { ...email, gelezen: true, inhoud: cached }
    if (!useIMAP || email.inhoud) return email

    setIsLoadingBody(true)
    try {
      const detail = await readEmailFromIMAP(Number(email.id), IMAP_FOLDER_MAP[folder] || 'INBOX')
      const body = detail.bodyHtml || detail.bodyText || ''
      bodyCacheRef.current.set(email.id, body)
      return { ...email, gelezen: true, inhoud: body, aan: detail.to || email.aan }
    } catch (err: unknown) {
      logger.error('Email body ophalen mislukt:', err)
      toast.error('Kon email inhoud niet laden')
      return email
    } finally {
      setIsLoadingBody(false)
    }
  }, [useIMAP])

  // ─── Polling: refresh every 60s or on window focus ───
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      handleRefresh(selectedFolder)
    }, 60000)
    const handleFocus = () => handleRefresh(selectedFolder)
    window.addEventListener('focus', handleFocus)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      window.removeEventListener('focus', handleFocus)
    }
  }, [selectedFolder, handleRefresh])

  // ─── Keyboard shortcuts (inline from useEmailKeyboard) ───
  const callbacksRef = useRef({ handleToggleStar, handleArchive, handleDelete })
  callbacksRef.current = { handleToggleStar, handleArchive, handleDelete }
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
        case 's': e.preventDefault(); if (idx >= 0 && idx < list.length) cb.handleToggleStar(list[idx]); break
        case 'e': e.preventDefault(); if (idx >= 0 && idx < list.length) cb.handleArchive(list[idx]); break
        case '#': e.preventDefault(); if (idx >= 0 && idx < list.length) cb.handleDelete(list[idx]); break
        case 'c': e.preventDefault(); handleCompose(); break
        case '?': e.preventDefault(); setShowShortcuts((prev) => !prev); break
        case 'Escape': e.preventDefault(); setShowShortcuts(false); break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewMode])

  // ─── Handlers ───
  const handleSelectEmail = useCallback(async (email: Email) => {
    const withBody = await loadEmailBody(email, selectedFolder)
    if (!withBody.gelezen) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, gelezen: true } : e))
    }
    setSelectedEmail(withBody)
    setViewMode('reading')
  }, [loadEmailBody, selectedFolder])

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

  const handleSendEmail = useCallback(async (data: { to: string; subject: string; body: string; html?: string; scheduledAt?: string }) => {
    try {
      await sendEmailViaApi(data.to, data.subject, data.body, {
        html: data.html,
        scheduledAt: data.scheduledAt,
      })
    } catch (err) {
      logger.error('Email verzenden mislukt:', err)
      throw err
    }
  }, [])

  const handleSendReply = useCallback(async (data: { to: string; subject: string; body: string; html?: string }) => {
    try {
      await sendEmailViaApi(data.to, data.subject, data.body, { html: data.html })
    } catch (err) {
      logger.error('Reply verzenden mislukt:', err)
      throw err
    }
  }, [])

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

  // ─── FULL-SCREEN EMAIL READER ───
  if (viewMode === 'reading') {
    return (
      <div className="h-[calc(100vh-56px)] bg-white overflow-hidden">
        <EmailReader
          email={selectedEmail}
          isLoadingBody={isLoadingBody}
          emailIndex={emailIndex}
          emailTotal={threadedEmails.length}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleRead}
          onDelete={handleDeleteAndNavigate}
          onArchive={handleArchiveAndNavigate}
          onBack={handleBack}
          onNavigate={handleNavigate}
          onSendReply={handleSendReply}
        />
      </div>
    )
  }

  // ─── FULL-SCREEN COMPOSE ───
  if (viewMode === 'composing') {
    return (
      <div className="h-[calc(100vh-56px)] bg-white overflow-hidden">
        <EmailCompose
          open={true}
          onOpenChange={(open) => { if (!open) handleBack() }}
          defaultTo={composeDefaults.to}
          defaultSubject={composeDefaults.subject}
          defaultBody={composeDefaults.body}
          onSend={handleSendEmail}
        />
      </div>
    )
  }

  // ─── INBOX VIEW: sidebar + email list ───
  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#F8F7F5] overflow-hidden">
      {/* ─── SIDEBAR ─── */}
      <div className="w-[240px] bg-white border-r border-foreground/[0.06] flex flex-col flex-shrink-0">
        <div className="p-3">
          <Button
            className="w-full h-10 rounded-lg gap-2 text-sm font-medium shadow-sm"
            onClick={() => handleCompose()}
          >
            <Pencil className="h-4 w-4" />
            Nieuwe email
          </Button>
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
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150',
                  isActive
                    ? 'bg-primary/[0.08] text-primary font-semibold'
                    : 'text-foreground/55 hover:bg-foreground/[0.04] hover:text-foreground/75',
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
                <span className="flex-1 text-left">{folder.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-medium',
                    folder.id === 'inbox' && isActive
                      ? 'bg-primary text-white'
                      : folder.id === 'inbox'
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/35',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          <div className="my-2 border-t border-foreground/[0.05]" />

          <button
            onClick={() => handleFolderChange('gepland' as EmailFolder)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-foreground/55 hover:bg-foreground/[0.04] hover:text-foreground/75 transition-all duration-150"
          >
            <Archive className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Archief</span>
          </button>
        </nav>

        <div className="px-4 py-3 border-t border-foreground/[0.05]">
          <div className="flex items-center gap-2 text-[11px] text-foreground/25">
            <Mail className="h-3 w-3" />
            <span>FORGEdesk Mail</span>
          </div>
        </div>
      </div>

      {/* ─── EMAIL LIST (full remaining width) ─── */}
      <div className="flex-1 bg-white flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-foreground/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked }}
              onChange={toggleCheckAll}
              className="h-4 w-4 rounded border-foreground/20 cursor-pointer accent-primary"
            />

            {hasChecked ? (
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkArchive}>
                  <Archive className="h-3.5 w-3.5" /> Archief
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkDelete}>
                  <Trash2 className="h-3.5 w-3.5" /> Verwijder
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkMarkRead}>
                  <CheckCheck className="h-3.5 w-3.5" /> Gelezen
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]" onClick={handleBulkMarkUnread}>
                  Ongelezen
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 bg-foreground/[0.03] rounded-lg p-0.5">
                {filtersList.map(f => {
                  const isActiveFilter = filter === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs transition-all duration-150',
                        isActiveFilter
                          ? 'bg-white text-foreground font-medium shadow-sm'
                          : 'text-foreground/45 hover:text-foreground/65',
                      )}
                    >
                      {f.label}
                      {f.id === 'ongelezen' && filterCounts.ongelezen > 0 && (
                        <span className={cn(
                          'ml-1 font-semibold',
                          isActiveFilter ? 'text-primary' : 'text-primary/60',
                        )}>{filterCounts.ongelezen}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <div className="flex items-center bg-foreground/[0.03] rounded-md p-0.5 mr-1">
              {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={cn(
                    'px-1.5 py-1 rounded transition-all duration-150',
                    fontSize === size
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-foreground/35 hover:text-foreground/55',
                  )}
                  title={size === 'small' ? 'Klein' : size === 'medium' ? 'Normaal' : 'Groot'}
                >
                  <span className={cn(
                    'font-semibold leading-none',
                    size === 'small' && 'text-[10px]',
                    size === 'medium' && 'text-xs',
                    size === 'large' && 'text-sm',
                  )}>A</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/35 hover:text-foreground/60 hover:bg-foreground/[0.04]"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/35 hover:text-foreground/60 hover:bg-foreground/[0.04]"
              onClick={() => handleRefresh(selectedFolder)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="flex items-center px-4 h-11 border-b border-foreground/[0.05] bg-foreground/[0.015]">
            <Search className="h-4 w-4 text-foreground/25 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Zoeken in emails... (from: to: has: label:)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/25"
              autoFocus
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearchQuery('') }} className="p-1 hover:bg-foreground/5 rounded">
                <X className="h-4 w-4 text-foreground/30" />
              </button>
            )}
          </div>
        )}

        {/* Email list */}
        <div
          ref={emailListRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
              <p className="text-sm text-foreground/30">Emails laden...</p>
            </div>
          ) : threadedEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-foreground/[0.03] flex items-center justify-center mb-4">
                <Inbox className="h-7 w-7 text-foreground/20" />
              </div>
              <h3 className="text-sm font-medium text-foreground/50 mb-1">
                {searchQuery ? 'Geen resultaten' : filter !== 'alle' ? 'Geen emails met dit filter' : 'Inbox is leeg'}
              </h3>
              <p className="text-xs text-foreground/30 max-w-[240px]">
                {searchQuery
                  ? `Geen emails gevonden voor "${searchQuery}"`
                  : filter !== 'alle'
                    ? 'Probeer een ander filter of bekijk alle emails'
                    : 'Nieuwe emails verschijnen hier automatisch'
                }
              </p>
            </div>
          ) : (
            <>
              {threadedEmails.map((email, index) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isActive={selectedEmail?.id === email.id}
                  isChecked={checkedEmails.has(email.id)}
                  isFocused={focusedIndex === index}
                  fontSize={fontSize}
                  onSelect={handleSelectEmail}
                  onToggleStar={handleToggleStar}
                  onToggleCheck={toggleCheckEmail}
                />
              ))}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary/40 mr-2" />
                  <span className="text-xs text-foreground/30">Meer laden...</span>
                </div>
              )}
              {threadedEmails.length < imapTotal && !isLoadingMore && (
                <button
                  onClick={() => loadMoreEmails(selectedFolder)}
                  className="w-full py-4 text-xs text-foreground/35 hover:text-primary hover:bg-primary/[0.02] transition-colors"
                >
                  Meer laden ({threadedEmails.length} van {imapTotal})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl border border-foreground/10 p-6 w-[340px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-foreground">Sneltoetsen</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-foreground/5 rounded">
                <X className="h-4 w-4 text-foreground/40" />
              </button>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground/55">{s.action}</span>
                  <kbd className="px-2 py-1 bg-foreground/[0.04] border border-foreground/[0.08] rounded text-xs font-mono text-foreground/60">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
