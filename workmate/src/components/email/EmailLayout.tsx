import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'
import { getEmails, getKlanten, updateEmail, deleteEmail, createEmail } from '@/services/supabaseService'
import { sendEmail as sendEmailViaApi } from '@/services/gmailService'
import { formatDateTime, cn, truncate, getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import { EmailReader } from './EmailReader'
import { EmailCompose } from './EmailCompose'
import { ContactSidebar } from './ContactSidebar'
import { demoEmails, demoContacts, getContactByEmail, extractEmailAddress } from '@/data/email-demo-data'
import type { EmailContact } from '@/data/email-demo-data'
import type { Email, Klant } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────

type EmailFolder = 'inbox' | 'verzonden' | 'concepten' | 'gepland' | 'prullenbak'
type FilterType = 'alle' | 'ongelezen' | 'met-ster' | 'bijlagen'

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
  { id: 'prullenbak', label: 'Prullenbak', icon: Trash2 },
]

const labelColors: Record<string, string> = {
  offerte: 'bg-blue-400',
  klant: 'bg-emerald-400',
  project: 'bg-violet-400',
  leverancier: 'bg-amber-400',
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
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
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
  const [emails, setEmails] = useState<Email[]>([])
  const [contacts, setContacts] = useState<EmailContact[]>(demoContacts)
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Compose defaults (for reply/forward)
  const [composeDefaults, setComposeDefaults] = useState<{
    to?: string; subject?: string; body?: string
  }>({})

  // ── Load data ──
  useEffect(() => {
    Promise.all([
      getEmails().catch(() => []),
      getKlanten().catch(() => []),
    ])
      .then(([emailData, klantData]) => {
        setEmails(emailData.length === 0 ? demoEmails : emailData)
        setKlanten(klantData)
        if (klantData.length > 0) {
          setContacts((prev) =>
            prev.map((c) => {
              const isKlant = klantData.some((k: Klant) => k.email === c.email)
              return isKlant ? { ...c, isCustomer: true } : c
            })
          )
        }
      })
      .finally(() => setIsLoading(false))
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
      } else {
        counts[f.id] = 0
      }
    })
    return counts
  }, [emails])

  // ── Filtered + sorted emails ──
  const filteredEmails = useMemo(() => {
    let filtered = emails.filter((e) => e.map === selectedFolder)

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
      case 'bijlagen': filtered = filtered.filter((e) => e.bijlagen > 0); break
    }

    return [...filtered].sort((a, b) =>
      new Date(b.datum).getTime() - new Date(a.datum).getTime()
    )
  }, [emails, selectedFolder, searchQuery, filter])

  // ── Current contact (for CRM sidebar) ──
  const currentContact = useMemo<EmailContact | null>(() => {
    if (viewMode === 'reading' && selectedEmail) {
      const emailAddr = extractEmailAddress(selectedEmail.van)
      return getContactByEmail(emailAddr) || null
    }
    if (viewMode === 'composing' && composeDefaults.to) {
      return getContactByEmail(composeDefaults.to) || null
    }
    return null
  }, [viewMode, selectedEmail, composeDefaults.to])

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
    if (!email.gelezen) {
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, gelezen: true } : e))
      )
      if (!email.id.startsWith('demo-')) {
        updateEmail(email.id, { gelezen: true }).catch(() => {})
      }
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
    if (!email.id.startsWith('demo-')) {
      updateEmail(email.id, { starred: newStarred }).catch(() => {})
    }
  }, [])

  const handleToggleRead = useCallback((email: Email) => {
    const newGelezen = !email.gelezen
    setEmails((prev) =>
      prev.map((e) => (e.id === email.id ? { ...e, gelezen: newGelezen } : e))
    )
    setSelectedEmail((prev) =>
      prev?.id === email.id ? { ...prev, gelezen: newGelezen } : prev
    )
    if (!email.id.startsWith('demo-')) {
      updateEmail(email.id, { gelezen: newGelezen }).catch(() => {})
    }
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
      if (!email.id.startsWith('demo-')) deleteEmail(email.id).catch(() => {})
    } else {
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, map: 'prullenbak', labels: ['prullenbak'] } : e
        )
      )
      if (!email.id.startsWith('demo-')) {
        updateEmail(email.id, { map: 'prullenbak', labels: ['prullenbak'] }).catch(() => {})
      }
    }
    setSelectedEmail(null)
    setViewMode('idle')
    toast.success('Email verwijderd')
  }, [])

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
      // Actually send via /api/send-email (SMTP)
      await sendEmailViaApi(data.to, data.subject, data.body, {
        scheduledAt: data.scheduledAt,
      })

      // Also save locally so it appears in the sent folder
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
      // If API send fails (e.g. no email settings), still save as draft
      console.error('Email verzenden mislukt:', err)
      toast.error(err.message || 'Email kon niet worden verzonden')
    }

    setViewMode('idle')
  }, [])

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

  const handleAddCustomer = useCallback((email: string) => {
    setContacts((prev) =>
      prev.map((c) => c.email === email ? { ...c, isCustomer: true } : c)
    )
    toast.success('Toegevoegd aan klanten')
  }, [])

  const handleSubscribeNewsletter = useCallback((email: string) => {
    setContacts((prev) =>
      prev.map((c) => c.email === email ? { ...c, subscribedNewsletter: true } : c)
    )
    toast.success('Geabonneerd op nieuwsbrief')
  }, [])

  // ── Show CRM sidebar? ──
  const showSidebar = viewMode === 'reading' || (viewMode === 'composing' && !!composeDefaults.to)

  // ═════════════════════════════════════════════════════════════════
  // ─── Render ────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col">
      {isLoading ? (
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
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {count > 0 && (
                      <span className={cn(
                        'text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Filter chips */}
            <div className="px-3 pb-2 flex items-center gap-1 border-b">
              {(['alle', 'ongelezen', 'met-ster', 'bijlagen'] as FilterType[]).map((f) => {
                const labels: Record<FilterType, string> = {
                  alle: 'Alle',
                  ongelezen: 'Ongelezen',
                  'met-ster': 'Met ster',
                  bijlagen: 'Bijlagen',
                }
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                      filter === f
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {labels[f]}
                  </button>
                )
              })}
            </div>

            {/* Email list */}
            <ScrollArea className="flex-1">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  {selectedFolder === 'gepland' ? (
                    <>
                      <Clock className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Geen ingeplande emails</p>
                    </>
                  ) : filter !== 'alle' ? (
                    <>
                      <SlidersHorizontal className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Geen resultaten</p>
                    </>
                  ) : (
                    <>
                      <Inbox className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Geen emails</p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {filteredEmails.map((email) => {
                    const isSelected = selectedEmail?.id === email.id && viewMode === 'reading'
                    const isUnread = !email.gelezen
                    const displayName = email.map === 'verzonden' || email.map === 'concepten'
                      ? extractSenderName(email.aan)
                      : extractSenderName(email.van)
                    const initials = getInitials(displayName)
                    const avatarColor = getAvatarColor(displayName)
                    const visibleLabels = email.labels.filter(
                      (l) => l !== 'verzonden' && l !== 'prullenbak' && l !== 'gepland'
                    )

                    return (
                      <div
                        key={email.id}
                        onClick={() => handleSelectEmail(email)}
                        className={cn(
                          'relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group border-b border-border/50',
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-900/20'
                            : 'hover:bg-muted/40',
                          isUnread && 'border-l-[3px] border-l-blue-500'
                        )}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5',
                          avatarColor
                        )}>
                          {initials}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              'text-sm truncate',
                              isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                            )}>
                              {displayName}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex-shrink-0 flex items-center gap-1">
                              {email.scheduled_at && email.map === 'gepland' && (
                                <Clock className="w-3 h-3 text-purple-500" />
                              )}
                              {formatShortDate(email.scheduled_at || email.datum)}
                            </span>
                          </div>
                          <p className={cn(
                            'text-[13px] truncate mt-0.5',
                            isUnread ? 'font-semibold text-foreground' : 'text-foreground/70'
                          )}>
                            {email.onderwerp}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {truncate(email.inhoud.replace(/\n/g, ' '), 80)}
                          </p>
                          {visibleLabels.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {visibleLabels.slice(0, 3).map((label) => (
                                <span
                                  key={label}
                                  className={cn(
                                    'w-2 h-2 rounded-full flex-shrink-0',
                                    labelColors[label] || 'bg-gray-400'
                                  )}
                                  title={label}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Star + attachment */}
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
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
                          {email.bijlagen > 0 && (
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground/60" />
                          )}
                        </div>
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
                defaultTo={composeDefaults.to}
                defaultSubject={composeDefaults.subject}
                defaultBody={composeDefaults.body}
                onSend={handleSendEmail}
                onCancel={handleCancelCompose}
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
    </div>
  )
}
