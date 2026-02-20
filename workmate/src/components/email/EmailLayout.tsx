import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Pencil,
  Inbox,
  Send,
  FileEdit,
  Trash2,
  Star,
  Paperclip,
  Loader2,
  Clock,
  SlidersHorizontal,
  Archive,
  Mail,
  MailOpen,
  CheckCheck,
  X,
  Minus,
  Type,
  Pin,
  PinOff,
  AlarmClock,
  Reply,
  MessageSquare,
  Keyboard,
  Eye,
  Zap,
  BarChart3,
} from 'lucide-react'
import { getEmails, getKlanten, updateEmail, deleteEmail, createEmail, createKlant } from '@/services/supabaseService'
import { sendEmail as sendEmailViaApi } from '@/services/gmailService'
import { formatDateTime, cn, truncate, getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailCompose } from './EmailCompose'
import { ContactSidebar } from './ContactSidebar'
import { EmailTracking } from './EmailTracking'
import { EmailSequences } from './EmailSequences'
import { EmailAnalytics } from './EmailAnalytics'
import type { AddCustomerData } from './ContactSidebar'
import { extractEmailAddress } from '@/utils/emailUtils'
import type { EmailContact } from '@/utils/emailUtils'
import type { Email, Klant } from '@/types'
import { logger } from '../../utils/logger'

// ─── Types ───────────────────────────────────────────────────────────

type EmailFolder = 'inbox' | 'verzonden' | 'concepten' | 'gepland' | 'gesnoozed' | 'prullenbak'
type FilterType = 'alle' | 'ongelezen' | 'met-ster' | 'vastgepind' | 'bijlagen'
type FontSize = 'small' | 'medium' | 'large'
type EmailTab = 'email' | 'tracking' | 'sequences' | 'analytics'

interface FolderTab {
  id: EmailFolder
  label: string
  icon: React.ElementType
}

const folderTabs: FolderTab[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'verzonden', label: 'Verzonden', icon: Send },
  { id: 'concepten', label: 'Concepten', icon: FileEdit },
  { id: 'gepland', label: 'Gepland', icon: Clock },
  { id: 'gesnoozed', label: 'Gesnoozed', icon: AlarmClock },
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

const SNOOZE_OPTIONS = [
  { label: 'Over 1 uur', hours: 1 },
  { label: 'Over 3 uur', hours: 3 },
  { label: 'Morgenochtend', hours: -1 }, // special: next day 9:00
  { label: 'Volgende week', hours: -2 }, // special: next monday 9:00
] as const

const KEYBOARD_SHORTCUTS = [
  { key: 'j', action: 'Volgende email' },
  { key: 'k', action: 'Vorige email' },
  { key: 'o / Enter', action: 'Email openen' },
  { key: 'r', action: 'Beantwoorden' },
  { key: 'f', action: 'Doorsturen' },
  { key: 'e', action: 'Archiveren' },
  { key: '#', action: 'Verwijderen' },
  { key: 's', action: 'Ster aan/uit' },
  { key: 'p', action: 'Vastpinnen' },
  { key: 'z', action: 'Snooze menu' },
  { key: 'c', action: 'Nieuwe email' },
  { key: 'Esc', action: 'Terug naar lijst' },
  { key: '?', action: 'Sneltoetsen tonen' },
] as const

const labelColors: Record<string, string> = {
  offerte: 'bg-blue-400',
  klant: 'bg-emerald-400',
  project: 'bg-primary',
  leverancier: 'bg-amber-400',
}

const fontSizeClasses: Record<FontSize, { name: string; subject: string; preview: string; date: string }> = {
  small: { name: 'text-xs', subject: 'text-xs', preview: 'text-[11px]', date: 'text-[10px]' },
  medium: { name: 'text-sm', subject: 'text-[13px]', preview: 'text-xs', date: 'text-[11px]' },
  large: { name: 'text-base', subject: 'text-sm', preview: 'text-[13px]', date: 'text-xs' },
}

// ─── Helpers ─────────────────────────────────────────────────────────

function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary', 'bg-emerald-500', 'bg-[#4A442D]', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-accent', 'bg-pink-500',
    'bg-teal-500', 'bg-orange-500',
  ]
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) {
    const futureDays = Math.ceil(-diffMs / (1000 * 60 * 60 * 24))
    if (futureDays === 0) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    if (futureDays === 1) return `Morgen ${date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
  }

  if (diffDays === 0) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Gisteren'
  if (diffDays < 7) return date.toLocaleDateString('nl-NL', { weekday: 'short' })
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

// ═════════════════════════════════════════════════════════════════════
// ─── Main Layout ─────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

type ViewMode = 'idle' | 'reading' | 'composing'

export function EmailLayout() {
  // ── State ──
  const [viewMode, setViewMode] = useState<ViewMode>('idle')
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('alle')
  const [activeTab, setActiveTab] = useState<EmailTab>('email')
  const [emails, setEmails] = useState<Email[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Multi-select
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set())

  // Font size
  const [fontSize, setFontSize] = useState<FontSize>('medium')

  // Snooze
  const [showSnoozeMenu, setShowSnoozeMenu] = useState<string | null>(null)

  // Quick reply
  const [quickReplyId, setQuickReplyId] = useState<string | null>(null)
  const [quickReplyText, setQuickReplyText] = useState('')

  // Keyboard shortcuts overlay
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Focused email index (for keyboard navigation)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  // Compose defaults (for reply/forward)
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string; subject?: string; body?: string
  }>({})

  // ── Load data ──
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEmails().catch(() => []),
      getKlanten().catch(() => []),
    ])
      .then(([emailData, klantData]) => {
        if (!cancelled) {
          setEmails(emailData)
          setKlanten(klantData)
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Clear checked when changing folder/filter
  useEffect(() => {
    setCheckedEmails(new Set())
  }, [selectedFolder, filter])

  // ── Unsnooze emails that have passed their snooze time ──
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
    }, 30000) // check every 30s
    return () => clearInterval(interval)
  }, [])

  // ── Folder counts ──
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    folderTabs.forEach((f) => {
      if (f.id === 'inbox') {
        counts[f.id] = emails.filter((e) => e.map === 'inbox' && !e.gelezen).length
      } else if (f.id === 'concepten') {
        counts[f.id] = emails.filter((e) => e.map === 'concepten').length
      } else if (f.id === 'gepland') {
        counts[f.id] = emails.filter((e) => e.map === 'gepland').length
      } else if (f.id === 'gesnoozed') {
        counts[f.id] = emails.filter((e) => e.snoozed_until).length
      } else {
        counts[f.id] = 0
      }
    })
    return counts
  }, [emails])

  // ── Filter counts (for badge) ──
  const filterCounts = useMemo(() => {
    const folderEmails = selectedFolder === 'gesnoozed'
      ? emails.filter((e) => e.snoozed_until)
      : emails.filter((e) => e.map === selectedFolder)
    return {
      alle: folderEmails.length,
      ongelezen: folderEmails.filter((e) => !e.gelezen).length,
      'met-ster': folderEmails.filter((e) => e.starred).length,
      vastgepind: folderEmails.filter((e) => e.pinned).length,
      bijlagen: folderEmails.filter((e) => e.bijlagen > 0).length,
    }
  }, [emails, selectedFolder])

  // ── Filtered + sorted emails ──
  const filteredEmails = useMemo(() => {
    let filtered = selectedFolder === 'gesnoozed'
      ? emails.filter((e) => e.snoozed_until)
      : emails.filter((e) => e.map === selectedFolder && !e.snoozed_until)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.onderwerp.toLowerCase().includes(q) ||
          e.van.toLowerCase().includes(q) ||
          e.aan.toLowerCase().includes(q) ||
          e.inhoud.toLowerCase().includes(q)
      )
    }

    switch (filter) {
      case 'ongelezen': filtered = filtered.filter((e) => !e.gelezen); break
      case 'met-ster': filtered = filtered.filter((e) => e.starred); break
      case 'vastgepind': filtered = filtered.filter((e) => e.pinned); break
      case 'bijlagen': filtered = filtered.filter((e) => e.bijlagen > 0); break
    }

    // Sort: pinned first, then by date
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.datum).getTime() - new Date(a.datum).getTime()
    })
  }, [emails, selectedFolder, searchQuery, filter])

  // ── Multi-select helpers ──
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
    if (allChecked) {
      setCheckedEmails(new Set())
    } else {
      setCheckedEmails(new Set(filteredEmails.map((e) => e.id)))
    }
  }, [allChecked, filteredEmails])

  const clearChecked = useCallback(() => {
    setCheckedEmails(new Set())
  }, [])

  // ── Current contact (for CRM sidebar) ──
  const findContactByEmail = useCallback((emailAddr: string): EmailContact | null => {
    const clean = extractEmailAddress(emailAddr).toLowerCase()
    if (!clean) return null

    const klant = klanten.find((k) => {
      if (k.email?.toLowerCase() === clean) return true
      if (k.contactpersonen?.some((cp) => cp.email?.toLowerCase() === clean)) return true
      return false
    })
    if (!klant) return null

    const matchedCP = klant.contactpersonen?.find((cp) => cp.email?.toLowerCase() === clean)

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
    if (viewMode === 'reading' && selectedEmail) {
      return findContactByEmail(selectedEmail.van)
    }
    if (viewMode === 'composing' && composeDefaults.to) {
      return findContactByEmail(composeDefaults.to)
    }
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

  // ── Handlers ──
  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedEmail(email)
    setViewMode('reading')
    setCheckedEmails(new Set())
    if (!email.gelezen) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, gelezen: true } : e))
      )
      updateEmail(email.id, { gelezen: true }).catch(() => {})
    }
  }, [])

  const handleToggleStar = useCallback((email: Email) => {
    const newStarred = !email.starred
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, starred: newStarred } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, starred: newStarred } : prev
    )
    updateEmail(email.id, { starred: newStarred }).catch(() => {})
  }, [])

  const handleToggleRead = useCallback((email: Email) => {
    const newGelezen = !email.gelezen
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, gelezen: newGelezen } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, gelezen: newGelezen } : prev
    )
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
      deleteEmail(email.id).catch(() => {})
    } else {
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e
        )
      )
      updateEmail(email.id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {})
    }
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email verwijderd')
  }, [])

  // ── Bulk actions ──
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) =>
      prev.map((e) =>
        ids.includes(e.id) ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e
      )
    )
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
    setEmails((prev) =>
      prev.map((e) => ids.includes(e.id) ? { ...e, gelezen: true } : e)
    )
    ids.forEach((id) => updateEmail(id, { gelezen: true }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} als gelezen gemarkeerd`)
  }, [checkedEmails])

  const handleBulkMarkUnread = useCallback(() => {
    const ids = Array.from(checkedEmails)
    setEmails((prev) =>
      prev.map((e) => ids.includes(e.id) ? { ...e, gelezen: false } : e)
    )
    ids.forEach((id) => updateEmail(id, { gelezen: false }).catch(() => {}))
    setCheckedEmails(new Set())
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} als ongelezen gemarkeerd`)
  }, [checkedEmails])

  // ── Pin / Unpin ──
  const handleTogglePin = useCallback((email: Email) => {
    const newPinned = !email.pinned
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, pinned: newPinned } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, pinned: newPinned } : prev
    )
    updateEmail(email.id, { pinned: newPinned } as Partial<Email>).catch(() => {})
    toast.success(newPinned ? 'Email vastgepind' : 'Pin verwijderd')
  }, [])

  // ── Snooze ──
  const handleSnooze = useCallback((email: Email, hours: number) => {
    let snoozeDate: Date
    const now = new Date()

    if (hours === -1) {
      // Tomorrow morning 9:00
      snoozeDate = new Date(now)
      snoozeDate.setDate(snoozeDate.getDate() + 1)
      snoozeDate.setHours(9, 0, 0, 0)
    } else if (hours === -2) {
      // Next Monday 9:00
      snoozeDate = new Date(now)
      const dayOfWeek = snoozeDate.getDay()
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
      snoozeDate.setDate(snoozeDate.getDate() + daysUntilMonday)
      snoozeDate.setHours(9, 0, 0, 0)
    } else {
      snoozeDate = new Date(now.getTime() + hours * 60 * 60 * 1000)
    }

    const snoozedUntil = snoozeDate.toISOString()
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, snoozed_until: snoozedUntil } : e))
    )
    updateEmail(email.id, { snoozed_until: snoozedUntil } as Partial<Email>).catch(() => {})
    setShowSnoozeMenu(null)
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email gesnoozed')
  }, [])

  const handleUnsnooze = useCallback((email: Email) => {
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, snoozed_until: undefined, map: 'inbox' } : e))
    )
    updateEmail(email.id, { snoozed_until: null } as any).catch(() => {})
    toast.success('Snooze verwijderd')
  }, [])

  // ── Quick reply (uses sendEmailRef to avoid dep ordering) ──
  const sendEmailRef = React.useRef<(data: { to: string; subject: string; body: string }) => void>()
  const handleQuickReply = useCallback((email: Email) => {
    if (!quickReplyText.trim()) return
    const senderEmail = email.van.match(/<([^>]+)>/)?.[1] || email.van
    sendEmailRef.current?.({
      to: senderEmail,
      subject: `Re: ${email.onderwerp}`,
      body: quickReplyText,
    })
    setQuickReplyId(null)
    setQuickReplyText('')
  }, [quickReplyText])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (viewMode !== 'idle') return

    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      switch (e.key) {
        case 'j': // next email
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, filteredEmails.length - 1))
          break
        case 'k': // previous email
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'o': // open email
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            handleSelectEmail(filteredEmails[focusedIndex])
          }
          break
        case 's': // toggle star
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            handleToggleStar(filteredEmails[focusedIndex])
          }
          break
        case 'p': // toggle pin
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            handleTogglePin(filteredEmails[focusedIndex])
          }
          break
        case 'e': // archive
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            handleArchive(filteredEmails[focusedIndex])
          }
          break
        case '#': // delete
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            handleDelete(filteredEmails[focusedIndex])
          }
          break
        case 'c': // compose
          e.preventDefault()
          handleCompose()
          break
        case 'r': // reply
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            handleReply(filteredEmails[focusedIndex])
          }
          break
        case 'f': // forward
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            handleForward(filteredEmails[focusedIndex])
          }
          break
        case 'z': // snooze menu
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredEmails.length) {
            setShowSnoozeMenu(filteredEmails[focusedIndex].id)
          }
          break
        case '?': // show shortcuts
          e.preventDefault()
          setShowShortcuts((prev) => !prev)
          break
        case 'Escape':
          e.preventDefault()
          setShowShortcuts(false)
          setShowSnoozeMenu(null)
          setQuickReplyId(null)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, focusedIndex, filteredEmails, handleSelectEmail, handleToggleStar, handleTogglePin, handleArchive, handleDelete, handleCompose])

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

  const handleSendEmail = useCallback(async (data: { to: string; subject: string; body: string; scheduledAt?: string }) => {
    const isScheduled = !!data.scheduledAt

    try {
      await sendEmailViaApi(data.to, data.subject, data.body, {
        scheduledAt: data.scheduledAt,
      })

      const newEmail: Omit<Email, 'id' | 'created_at'> = {
        user_id: '',
        gmail_id: '',
        van: 'ik@signcompany.nl',
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
    } catch (err: any) {
      logger.error('Email verzenden mislukt:', err)
      toast.error(err.message || 'Email kon niet worden verzonden')
    }

    setViewMode('idle')
  }, [])

  // Link ref for quick reply
  sendEmailRef.current = handleSendEmail

  const handleCancelCompose = useCallback(() => {
    setViewMode(selectedEmail ? 'reading' : 'idle')
  }, [selectedEmail])

  const handleFolderChange = useCallback((folder: EmailFolder) => {
    setSelectedFolder(folder)
    setSelectedEmail(null)
    setViewMode('idle')
    setFilter('alle')
  }, [])

  const handleBack = useCallback(() => {
    setSelectedEmail(null)
    setViewMode('idle')
  }, [])

  const handleAddCustomer = useCallback(async (email: string, data?: AddCustomerData) => {
    try {
      const newKlant = await createKlant({
        user_id: '',
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
      toast.success(`${data?.contactpersoon || email} toegevoegd aan klanten`)
    } catch (err: any) {
      logger.error('Klant aanmaken mislukt:', err)
      toast.error('Kon contact niet opslaan')
    }
  }, [])

  const handleSubscribeNewsletter = useCallback((_email: string) => {
    toast.success('Geabonneerd op nieuwsbrief')
  }, [])

  // ── Show CRM sidebar? ──
  const showSidebar = viewMode === 'reading' || viewMode === 'composing'

  const fs = fontSizeClasses[fontSize]

  // ═════════════════════════════════════════════════════════════════
  // ─── Render ────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col">
      {/* ── Top Tab Bar ── */}
      <div className="flex items-center gap-1 mb-4">
        {([
          { id: 'email' as EmailTab, label: 'Email', icon: Mail },
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
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
      {activeTab === 'tracking' ? (
        <EmailTracking emails={emails} />
      ) : activeTab === 'sequences' ? (
        <EmailSequences />
      ) : activeTab === 'analytics' ? (
        <EmailAnalytics emails={emails} />
      ) : isLoading ? (
        <Card className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Emails laden...</p>
          </div>
        </Card>
      ) : (
        <Card className="flex-1 flex overflow-hidden">

          {/* ═══ Column 1: Email List (hidden when reading/composing) ═══ */}
          {viewMode === 'idle' && (
          <div className="flex-1 flex flex-col">
            {/* Search + Compose */}
            <div className="p-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek emails..."
                  className="pl-9 h-9"
                />
              </div>
              <Button onClick={handleCompose} size="sm" className="gap-1.5 h-9 flex-shrink-0">
                <Pencil className="w-3.5 h-3.5" />
                Nieuw
              </Button>
            </div>

            {/* Folder tabs */}
            <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto">
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
                        isActive
                          ? 'bg-primary text-white'
                          : 'bg-muted-foreground/20 text-muted-foreground'
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
              <div className="flex items-center gap-1">
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
                          isActive
                            ? 'bg-background/20 text-background'
                            : 'bg-muted-foreground/15 text-muted-foreground'
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
                <button
                  onClick={() => setFontSize('small')}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-colors',
                    fontSize === 'small'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  title="Klein"
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('medium')}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors',
                    fontSize === 'medium'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  title="Normaal"
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors',
                    fontSize === 'large'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  title="Groot"
                >
                  A
                </button>
              </div>
            </div>

            {/* ── Bulk action toolbar ── */}
            {hasChecked ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                    onCheckedChange={toggleCheckAll}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-xs font-medium text-foreground">
                    {checkedEmails.size} geselecteerd
                  </span>
                </div>
                <div className="h-4 w-px bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleBulkMarkRead}
                >
                  <MailOpen className="w-3.5 h-3.5" />
                  Gelezen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleBulkMarkUnread}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Ongelezen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleBulkArchive}
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archiveren
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Verwijderen
                </Button>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={clearChecked}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              /* Select all bar (subtle) */
              <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-muted/10">
                <Checkbox
                  checked={false}
                  onCheckedChange={toggleCheckAll}
                  className="opacity-40 hover:opacity-100 transition-opacity"
                />
                <span className="text-[11px] text-muted-foreground">
                  {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* ── Email list ── */}
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
                  {filteredEmails.map((email) => {
                    const isActive = selectedEmail?.id === email.id && viewMode === 'reading'
                    const isChecked = checkedEmails.has(email.id)
                    const isUnread = !email.gelezen
                    const displayName = email.map === 'verzonden' || email.map === 'concepten'
                      ? extractSenderName(email.aan)
                      : extractSenderName(email.van)
                    const initials = getInitials(displayName)
                    const avatarColor = getAvatarColor(displayName)
                    const visibleLabels = email.labels.filter(
                      (l) => l !== 'verzonden' && l !== 'prullenbak' && l !== 'gepland'
                    )

                    const isFocused = focusedIndex === filteredEmails.indexOf(email)

                    return (
                      <div
                        key={email.id}
                        className={cn(
                          'relative flex flex-col border-b border-border/40',
                          isActive && 'bg-primary/5 dark:bg-primary/10',
                          isChecked && 'bg-primary/5 dark:bg-primary/10',
                          isFocused && !isActive && !isChecked && 'ring-1 ring-inset ring-primary/30 bg-primary/[0.02]',
                          !isActive && !isChecked && !isFocused && 'hover:bg-muted/40',
                          isUnread && !isChecked && !isActive && 'bg-background'
                        )}
                      >
                      <div className={cn('relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-all group')}>

                        {/* Unread indicator bar */}
                        {isUnread && (
                          <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
                        )}

                        {/* Checkbox / Avatar */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          {/* Avatar always visible, checkbox overlays on hover/check */}
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold transition-opacity',
                            avatarColor,
                            (hasChecked || isChecked) && 'opacity-0'
                          )}>
                            {initials}
                          </div>
                          <div className={cn(
                            'absolute inset-0 w-9 h-9 rounded-full flex items-center justify-center transition-opacity',
                            (hasChecked || isChecked) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          )}>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleCheckEmail(email.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0" onClick={() => handleSelectEmail(email)}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              'truncate',
                              fs.name,
                              isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                            )}>
                              {displayName}
                            </span>
                            <span className={cn(
                              'text-muted-foreground flex-shrink-0 flex items-center gap-1',
                              fs.date
                            )}>
                              {email.scheduled_at && email.map === 'gepland' && (
                                <Clock className="w-3 h-3 text-primary" />
                              )}
                              {formatShortDate(email.scheduled_at || email.datum)}
                            </span>
                          </div>
                          <p className={cn(
                            'truncate mt-0.5',
                            fs.subject,
                            isUnread ? 'font-semibold text-foreground' : 'text-foreground/70'
                          )}>
                            {email.onderwerp}
                          </p>
                          <p className={cn(
                            'text-muted-foreground truncate mt-0.5',
                            fs.preview
                          )}>
                            {truncate(email.inhoud.replace(/\n/g, ' '), 80)}
                          </p>
                          {visibleLabels.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {visibleLabels.slice(0, 3).map((label) => (
                                <span
                                  key={label}
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider',
                                    label === 'offerte' && 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
                                    label === 'klant' && 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
                                    label === 'project' && 'bg-primary/10 text-primary',
                                    label === 'leverancier' && 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
                                    !['offerte', 'klant', 'project', 'leverancier'].includes(label) && 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                  )}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions: star, pin, snooze, quick reply */}
                        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                          <div className="flex items-center gap-0.5">
                            {email.pinned && (
                              <Pin className="w-3.5 h-3.5 text-primary fill-primary" />
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleStar(email) }}
                              className="p-0.5"
                            >
                              {email.starred ? (
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              ) : (
                                <Star className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity dark:text-gray-600" />
                              )}
                            </button>
                          </div>
                          {/* Hover actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTogglePin(email) }}
                              className="p-0.5 rounded hover:bg-muted"
                              title={email.pinned ? 'Losmaken' : 'Vastpinnen'}
                            >
                              {email.pinned ? (
                                <PinOff className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowSnoozeMenu(showSnoozeMenu === email.id ? null : email.id) }}
                              className="p-0.5 rounded hover:bg-muted"
                              title="Snooze"
                            >
                              <AlarmClock className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setQuickReplyId(quickReplyId === email.id ? null : email.id); setQuickReplyText('') }}
                              className="p-0.5 rounded hover:bg-muted"
                              title="Snel beantwoorden"
                            >
                              <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                          {email.bijlagen > 0 && (
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground/60" />
                          )}
                        </div>
                      </div>

                      {/* Snooze indicator */}
                      {email.snoozed_until && (
                        <div className="flex items-center gap-1.5 px-4 pb-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                          <AlarmClock className="w-3 h-3" />
                          Gesnoozed tot {formatDateTime(email.snoozed_until)}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnsnooze(email) }}
                            className="ml-1 underline hover:no-underline"
                          >
                            Annuleren
                          </button>
                        </div>
                      )}

                      {/* Snooze dropdown menu */}
                      {showSnoozeMenu === email.id && (
                        <div className="mx-4 mb-2 rounded-md border bg-popover p-1 shadow-lg">
                          {SNOOZE_OPTIONS.map((opt) => (
                            <button
                              key={opt.label}
                              onClick={(e) => { e.stopPropagation(); handleSnooze(email, opt.hours) }}
                              className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors flex items-center gap-2"
                            >
                              <AlarmClock className="w-3.5 h-3.5 text-muted-foreground" />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick reply inline */}
                      {quickReplyId === email.id && (
                        <div className="flex items-center gap-2 px-4 pb-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={quickReplyText}
                            onChange={(e) => setQuickReplyText(e.target.value)}
                            placeholder="Typ een snel antwoord..."
                            className="h-8 text-sm flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleQuickReply(email)
                              }
                              if (e.key === 'Escape') {
                                setQuickReplyId(null)
                                setQuickReplyText('')
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            className="h-8 gap-1.5"
                            disabled={!quickReplyText.trim()}
                            onClick={() => handleQuickReply(email)}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          )}

          {/* ═══ Content Area (full width when reading/composing) ═══ */}
          {viewMode !== 'idle' && (
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
                onToggleStar={handleToggleStar}
                onToggleRead={handleToggleRead}
                onDelete={handleDelete}
                onReply={handleReply}
                onForward={handleForward}
                onArchive={handleArchive}
                onBack={handleBack}
              />
            ) : null}
          </div>
          )}

          {/* ═══ CRM Sidebar (only when reading/composing) ═══ */}
          {showSidebar && (
            <div className="border-l">
              <ContactSidebar
                contact={currentContact}
                senderName={currentSenderName}
                senderEmail={currentSenderEmail}
                senderCompany={currentContact?.company}
                onAddCustomer={handleAddCustomer}
                onSubscribeNewsletter={handleSubscribeNewsletter}
                width={280}
              />
            </div>
          )}
        </Card>
      )}

      {/* Keyboard shortcut hint button */}
      <button
        onClick={() => setShowShortcuts(true)}
        className="fixed bottom-4 right-4 w-8 h-8 rounded-full bg-muted border shadow-sm flex items-center justify-center hover:bg-muted/80 transition-colors z-40"
        title="Sneltoetsen (?)"
      >
        <Keyboard className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-popover rounded-lg border shadow-xl p-6 w-80 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Sneltoetsen</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1 rounded hover:bg-muted">
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
